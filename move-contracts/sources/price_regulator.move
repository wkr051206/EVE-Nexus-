module dynamic_economic_regulator::price_regulator {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::Clock;

    use dynamic_economic_regulator::resource_oracle::{Self as resource_oracle, RegionID, ResourceType, ResourceOracle};

    // ── 类型定义 ─────────────────────────────────────────────

    public struct PricingModel has copy, drop, store {
        model_type: u8,
    }

    /// 价格变动记录（需要 drop 以支持 vector::remove）
    public struct PriceChange has copy, drop, store {
        old_price: u64,
        new_price: u64,
        change_reason: u8,
        timestamp: u64,
    }

    public struct PriceData has store {
        region_id: RegionID,
        resource_type: ResourceType,
        base_price: u64,
        current_price: u64,
        pricing_model: PricingModel,
        last_updated: u64,
        price_change_history: vector<PriceChange>,
    }

    public struct AMMPool has key, store {
        id: UID,
        region_id: RegionID,
        resource_type: ResourceType,
        token_reserve: Balance<SUI>,
        resource_reserve: u64,
        k_constant: u64,
        fee_rate_bps: u64,
        pool_admin: address,
    }

    /// 定价参数（需要 copy + drop 以支持字段赋值和查询返回）
    public struct PricingParams has copy, drop, store {
        max_price_change_percent: u64,
        price_update_interval_ms: u64,
        demand_elasticity_factor: u64,
        regional_disparity_factor: u64,
    }

    public struct PriceRegulator has key {
        id: UID,
        price_data: Table<RegionID, PriceData>,
        amm_pools: Table<RegionID, AMMPool>,
        pricing_params: PricingParams,
        regulator_admin: address,
    }

    public struct RegulatorAdminCap has key, store {
        id: UID,
    }

    // ── 事件 ──────────────────────────────────────────────────

    public struct PriceUpdated has copy, drop {
        region_id: RegionID,
        resource_type: ResourceType,
        old_price: u64,
        new_price: u64,
        change_reason: u8,
    }

    public struct AMMTrade has copy, drop {
        region_id: RegionID,
        resource_type: ResourceType,
        token_amount: u64,
        resource_amount: u64,
        fee_amount: u64,
        trade_type: u8,
    }

    public struct PricingParamsUpdated has copy, drop {
        max_price_change_percent: u64,
        price_update_interval_ms: u64,
        demand_elasticity_factor: u64,
        regional_disparity_factor: u64,
    }

    // ── 常量 ──────────────────────────────────────────────────
    const E_UNAUTHORIZED: u64 = 1;
    const E_POOL_ALREADY_EXISTS: u64 = 2;
    const E_POOL_NOT_FOUND: u64 = 3;
    const E_PRICE_DATA_NOT_FOUND: u64 = 4;
    const E_INSUFFICIENT_OUTPUT: u64 = 5;

    // ── 初始化 ────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let pricing_params = PricingParams {
            max_price_change_percent: 500,
            price_update_interval_ms: 300000,
            demand_elasticity_factor: 150,
            regional_disparity_factor: 120,
        };

        let regulator = PriceRegulator {
            id: object::new(ctx),
            price_data: table::new(ctx),
            amm_pools: table::new(ctx),
            pricing_params,
            regulator_admin: ctx.sender(),
        };

        let admin_cap = RegulatorAdminCap { id: object::new(ctx) };

        transfer::share_object(regulator);
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ── 管理员函数 ─────────────────────────────────────────────

    public fun set_price_data(
        regulator: &mut PriceRegulator,
        _admin_cap: &RegulatorAdminCap,
        region_id_raw: u64,
        resource_type_raw: u8,
        base_price: u64,
        pricing_model_type: u8,
        ctx: &mut TxContext,
    ) {
        assert!(regulator.regulator_admin == ctx.sender(), E_UNAUTHORIZED);

        let region_id = resource_oracle::make_region_id(region_id_raw);
        let resource_type = resource_oracle::make_resource_type(resource_type_raw);
        let pricing_model = PricingModel { model_type: pricing_model_type };

        let price_data = PriceData {
            region_id,
            resource_type,
            base_price,
            current_price: base_price,
            pricing_model,
            last_updated: 0,
            price_change_history: vector::empty(),
        };

        table::add(&mut regulator.price_data, region_id, price_data);
    }

    public fun create_amm_pool(
        regulator: &mut PriceRegulator,
        _admin_cap: &RegulatorAdminCap,
        region_id: RegionID,
        resource_type: ResourceType,
        initial_token: Coin<SUI>,
        initial_resource_amount: u64,
        fee_rate_bps: u64,
        ctx: &mut TxContext,
    ) {
        assert!(regulator.regulator_admin == ctx.sender(), E_UNAUTHORIZED);
        assert!(!table::contains(&regulator.amm_pools, region_id), E_POOL_ALREADY_EXISTS);

        let token_amount = coin::value(&initial_token);
        let k_constant = token_amount * initial_resource_amount;

        let pool = AMMPool {
            id: object::new(ctx),
            region_id,
            resource_type,
            token_reserve: coin::into_balance(initial_token),
            resource_reserve: initial_resource_amount,
            k_constant,
            fee_rate_bps,
            pool_admin: ctx.sender(),
        };

        table::add(&mut regulator.amm_pools, region_id, pool);
    }

    public fun update_pricing_params(
        regulator: &mut PriceRegulator,
        _admin_cap: &RegulatorAdminCap,
        max_price_change_percent: u64,
        price_update_interval_ms: u64,
        demand_elasticity_factor: u64,
        regional_disparity_factor: u64,
        ctx: &mut TxContext,
    ) {
        assert!(regulator.regulator_admin == ctx.sender(), E_UNAUTHORIZED);

        regulator.pricing_params = PricingParams {
            max_price_change_percent,
            price_update_interval_ms,
            demand_elasticity_factor,
            regional_disparity_factor,
        };

        event::emit(PricingParamsUpdated {
            max_price_change_percent,
            price_update_interval_ms,
            demand_elasticity_factor,
            regional_disparity_factor,
        });
    }

    // ── 公开函数 ──────────────────────────────────────────────

    public fun update_price_by_supply_demand(
        regulator: &mut PriceRegulator,
        oracle: &ResourceOracle,
        region_id: RegionID,
        _resource_type: ResourceType,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&regulator.price_data, region_id), E_PRICE_DATA_NOT_FOUND);

        let price_data = table::borrow(&regulator.price_data, region_id);
        if (clock.timestamp_ms() - price_data.last_updated < regulator.pricing_params.price_update_interval_ms) {
            return
        };

        let supply_demand_ratio = resource_oracle::get_supply_demand_ratio(oracle, resource_oracle::region_id_value(&region_id));
        let params = regulator.pricing_params;
        let base_price = table::borrow(&regulator.price_data, region_id).base_price;
        let current_price = table::borrow(&regulator.price_data, region_id).current_price;

        let mut new_price = calculate_price_by_supply_demand(base_price, supply_demand_ratio, &params);
        new_price = limit_price_change(current_price, new_price, params.max_price_change_percent);

        update_price_internal(regulator, region_id, new_price, 0, clock);
    }

    public fun amm_buy_resource(
        regulator: &mut PriceRegulator,
        region_id: RegionID,
        payment: Coin<SUI>,
        min_resource_amount: u64,
        _ctx: &mut TxContext,
    ): u64 {
        assert!(table::contains(&regulator.amm_pools, region_id), E_POOL_NOT_FOUND);

        let pool = table::borrow_mut(&mut regulator.amm_pools, region_id);
        let payment_amount = coin::value(&payment);
        let resource_amount = calculate_buy_resource_amount(pool, payment_amount);
        assert!(resource_amount >= min_resource_amount, E_INSUFFICIENT_OUTPUT);

        let fee_amount = (payment_amount * pool.fee_rate_bps) / 10000;
        let payment_after_fee = payment_amount - fee_amount;

        pool.resource_reserve = pool.resource_reserve - resource_amount;
        balance::join(&mut pool.token_reserve, coin::into_balance(payment));

        event::emit(AMMTrade {
            region_id: pool.region_id,
            resource_type: pool.resource_type,
            token_amount: payment_after_fee,
            resource_amount,
            fee_amount,
            trade_type: 0,
        });

        resource_amount
    }

    public fun amm_sell_resource(
        regulator: &mut PriceRegulator,
        region_id: RegionID,
        resource_amount: u64,
        min_token_amount: u64,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        assert!(table::contains(&regulator.amm_pools, region_id), E_POOL_NOT_FOUND);

        let pool = table::borrow_mut(&mut regulator.amm_pools, region_id);
        let token_amount = calculate_sell_token_amount(pool, resource_amount);
        assert!(token_amount >= min_token_amount, E_INSUFFICIENT_OUTPUT);

        let fee_amount = (token_amount * pool.fee_rate_bps) / 10000;
        let token_after_fee = token_amount - fee_amount;

        let token_out_balance = balance::split(&mut pool.token_reserve, token_after_fee);
        pool.resource_reserve = pool.resource_reserve + resource_amount;

        event::emit(AMMTrade {
            region_id: pool.region_id,
            resource_type: pool.resource_type,
            token_amount: token_after_fee,
            resource_amount,
            fee_amount,
            trade_type: 1,
        });

        coin::from_balance(token_out_balance, ctx)
    }

    // ── 查询函数 ──────────────────────────────────────────────

    public fun get_current_price(regulator: &PriceRegulator, region_id: RegionID): u64 {
        assert!(table::contains(&regulator.price_data, region_id), E_PRICE_DATA_NOT_FOUND);
        table::borrow(&regulator.price_data, region_id).current_price
    }

    public fun get_amm_price(regulator: &PriceRegulator, region_id: RegionID, is_buy: bool): u64 {
        assert!(table::contains(&regulator.amm_pools, region_id), E_POOL_NOT_FOUND);
        let pool = table::borrow(&regulator.amm_pools, region_id);
        if (is_buy) { calculate_buy_price(pool, 1) } else { calculate_sell_price(pool, 1) }
    }

    public fun get_pricing_params(regulator: &PriceRegulator): PricingParams {
        regulator.pricing_params
    }

    // ── 内部辅助函数 ──────────────────────────────────────────

    fun calculate_price_by_supply_demand(base_price: u64, supply_demand_ratio: u64, params: &PricingParams): u64 {
        let price_multiplier = if (supply_demand_ratio < 5000) {
            let scarcity_factor = 5000 - supply_demand_ratio;
            10000 + (scarcity_factor * params.demand_elasticity_factor) / 100
        } else if (supply_demand_ratio > 15000) {
            let surplus_factor = supply_demand_ratio - 15000;
            10000 - (surplus_factor * params.demand_elasticity_factor) / 200
        } else {
            10000
        };
        (base_price * price_multiplier) / 10000
    }

    fun limit_price_change(current_price: u64, new_price: u64, max_change_percent: u64): u64 {
        if (current_price == 0) { return new_price };
        let max_change = (current_price * max_change_percent) / 10000;
        if (new_price > current_price) {
            let increase = new_price - current_price;
            if (increase > max_change) { current_price + max_change } else { new_price }
        } else if (new_price < current_price) {
            let decrease = current_price - new_price;
            if (decrease > max_change) { current_price - max_change } else { new_price }
        } else {
            new_price
        }
    }

    fun update_price_internal(
        regulator: &mut PriceRegulator,
        region_id: RegionID,
        new_price: u64,
        change_reason: u8,
        clock: &Clock,
    ) {
        let price_data = table::borrow_mut(&mut regulator.price_data, region_id);
        let old_price = price_data.current_price;
        if (old_price == new_price) { return };

        let price_change = PriceChange {
            old_price,
            new_price,
            change_reason,
            timestamp: clock.timestamp_ms(),
        };
        vector::push_back(&mut price_data.price_change_history, price_change);

        if (vector::length(&price_data.price_change_history) > 100) {
            vector::remove(&mut price_data.price_change_history, 0);
        };

        price_data.current_price = new_price;
        price_data.last_updated = clock.timestamp_ms();

        event::emit(PriceUpdated {
            region_id: price_data.region_id,
            resource_type: price_data.resource_type,
            old_price,
            new_price,
            change_reason,
        });
    }

    fun calculate_buy_price(pool: &AMMPool, resource_amount: u64): u64 {
        let new_resource_reserve = pool.resource_reserve - resource_amount;
        let new_token_reserve = pool.k_constant / new_resource_reserve;
        new_token_reserve - balance::value(&pool.token_reserve)
    }

    fun calculate_sell_price(pool: &AMMPool, resource_amount: u64): u64 {
        let new_resource_reserve = pool.resource_reserve + resource_amount;
        let new_token_reserve = pool.k_constant / new_resource_reserve;
        balance::value(&pool.token_reserve) - new_token_reserve
    }

    fun calculate_buy_resource_amount(pool: &AMMPool, token_amount: u64): u64 {
        let new_token_reserve = balance::value(&pool.token_reserve) + token_amount;
        let new_resource_reserve = pool.k_constant / new_token_reserve;
        pool.resource_reserve - new_resource_reserve
    }

    fun calculate_sell_token_amount(pool: &AMMPool, resource_amount: u64): u64 {
        let new_resource_reserve = pool.resource_reserve + resource_amount;
        let new_token_reserve = pool.k_constant / new_resource_reserve;
        balance::value(&pool.token_reserve) - new_token_reserve
    }
}
