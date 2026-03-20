module dynamic_economic_regulator::dynamic_gate {
    use sui::object::{Self, UID, ID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::Clock;

    use dynamic_economic_regulator::resource_oracle::{Self as resource_oracle, RegionID, ResourceOracle};
    use dynamic_economic_regulator::price_regulator::PriceRegulator;
    use dynamic_economic_regulator::treasury_pool::{Self as treasury_pool, TreasuryPool};
    use world::gate::{Self, Gate, OwnerCap};
    use world::character::Character;

    // ── 错误码 ────────────────────────────────────────────────
    const E_UNAUTHORIZED: u64 = 1;
    const E_INVALID_PRIORITY_LEVEL: u64 = 2;
    const E_INVALID_VALIDITY_PERIOD: u64 = 3;
    const E_INVALID_MAX_USAGE: u64 = 4;
    const E_INSUFFICIENT_PAYMENT: u64 = 5;
    const E_PASS_NOT_FOUND: u64 = 6;
    const E_PASS_EXPIRED: u64 = 7;
    const E_PASS_USAGE_LIMIT: u64 = 8;

    // ── 类型定义 ─────────────────────────────────────────────

    public struct DynamicFeeConfig has store {
        base_fee: u64,
        congestion_multiplier: u64,
        demand_elasticity_factor: u64,
        time_based_discount: bool,
        rush_hour_surcharge: u64,
        off_peak_discount: u64,
        membership_discount_table: Table<u8, u64>,
    }

    public struct GateTrafficStats has store {
        gate_id: ID,
        region_id: RegionID,
        total_jumps: u64,
        jumps_last_hour: u64,
        jumps_last_day: u64,
        congestion_level: u8,
        last_jump_time: u64,
        hourly_jump_records: vector<u64>,
    }

    public struct PriorityPass has key, store {
        id: UID,
        owner: address,
        gate_id: ID,
        priority_level: u8,
        validity_period_ms: u64,
        created_at: u64,
        usage_count: u64,
        max_usage: u64,
    }

    public struct DynamicGateExt has key {
        id: UID,
        gate_id: ID,
        fee_config: DynamicFeeConfig,
        traffic_stats: GateTrafficStats,
        active_priority_passes: Table<ID, PriorityPass>,
        revenue_balance: Balance<SUI>,
        treasury_region_id: RegionID,
        last_fee_update: u64,
        revenue_collected: u64,
        extension_admin: address,
    }

    /// Witness used to authorize jump permit issuance
    public struct DynamicGateAuth has drop {}

    // ── 事件 ──────────────────────────────────────────────────

    public struct DynamicFeeUpdated has copy, drop {
        gate_id: ID,
        old_base_fee: u64,
        new_base_fee: u64,
        congestion_multiplier: u64,
        update_reason: u8,
    }

    public struct PriorityJump has copy, drop {
        gate_id: ID,
        character: address,
        priority_level: u8,
        fee_paid: u64,
        discount_applied: u64,
        timestamp: u64,
    }

    public struct CongestionLevelChanged has copy, drop {
        gate_id: ID,
        old_level: u8,
        new_level: u8,
        total_jumps: u64,
    }

    public struct RevenueCollected has copy, drop {
        gate_id: ID,
        amount: u64,
        timestamp: u64,
    }

    // ── 初始化 ────────────────────────────────────────────────

    public fun create_dynamic_gate_extension(
        gate: &Gate,
        _owner_cap: &OwnerCap<Gate>,
        initial_base_fee: u64,
        treasury_region_id: RegionID,
        ctx: &mut TxContext,
    ) {
        let gate_id = object::id(gate);

        let mut fee_config = DynamicFeeConfig {
            base_fee: initial_base_fee,
            congestion_multiplier: 10000,
            demand_elasticity_factor: 150,
            time_based_discount: true,
            rush_hour_surcharge: 2000,
            off_peak_discount: 1500,
            membership_discount_table: table::new(ctx),
        };

        table::add(&mut fee_config.membership_discount_table, 1, 500);
        table::add(&mut fee_config.membership_discount_table, 2, 1000);
        table::add(&mut fee_config.membership_discount_table, 3, 1500);
        table::add(&mut fee_config.membership_discount_table, 4, 2500);
        table::add(&mut fee_config.membership_discount_table, 5, 4000);

        let traffic_stats = GateTrafficStats {
            gate_id,
            region_id: treasury_region_id,
            total_jumps: 0,
            jumps_last_hour: 0,
            jumps_last_day: 0,
            congestion_level: 0,
            last_jump_time: 0,
            hourly_jump_records: vector[
                0u64, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
            ],
        };

        let extension = DynamicGateExt {
            id: object::new(ctx),
            gate_id,
            fee_config,
            traffic_stats,
            active_priority_passes: table::new(ctx),
            revenue_balance: balance::zero(),
            treasury_region_id,
            last_fee_update: ctx.epoch_timestamp_ms(),
            revenue_collected: 0,
            extension_admin: ctx.sender(),
        };

        transfer::transfer(extension, ctx.sender());
    }

    // ── 管理员函数 ─────────────────────────────────────────────

    public fun update_fee_config(
        extension: &mut DynamicGateExt,
        new_base_fee: u64,
        new_congestion_multiplier: u64,
        new_demand_elasticity_factor: u64,
        ctx: &mut TxContext,
    ) {
        assert!(extension.extension_admin == ctx.sender(), E_UNAUTHORIZED);
        let old_base_fee = extension.fee_config.base_fee;
        extension.fee_config.base_fee = new_base_fee;
        extension.fee_config.congestion_multiplier = new_congestion_multiplier;
        extension.fee_config.demand_elasticity_factor = new_demand_elasticity_factor;
        event::emit(DynamicFeeUpdated {
            gate_id: extension.gate_id,
            old_base_fee,
            new_base_fee,
            congestion_multiplier: new_congestion_multiplier,
            update_reason: 1,
        });
    }

    public fun create_priority_pass(
        extension: &mut DynamicGateExt,
        owner: address,
        priority_level: u8,
        validity_period_ms: u64,
        max_usage: u64,
        ctx: &mut TxContext,
    ): ID {
        assert!(extension.extension_admin == ctx.sender(), E_UNAUTHORIZED);
        assert!(priority_level >= 1 && priority_level <= 5, E_INVALID_PRIORITY_LEVEL);
        assert!(validity_period_ms > 0, E_INVALID_VALIDITY_PERIOD);
        assert!(max_usage > 0, E_INVALID_MAX_USAGE);

        let pass = PriorityPass {
            id: object::new(ctx),
            owner,
            gate_id: extension.gate_id,
            priority_level,
            validity_period_ms,
            created_at: ctx.epoch_timestamp_ms(),
            usage_count: 0,
            max_usage,
        };
        let pass_id = object::id(&pass);
        table::add(&mut extension.active_priority_passes, pass_id, pass);
        pass_id
    }

    /// 收集收益到金库
    public fun collect_revenue(
        extension: &mut DynamicGateExt,
        treasury: &mut TreasuryPool,
        ctx: &mut TxContext,
    ) {
        assert!(extension.extension_admin == ctx.sender(), E_UNAUTHORIZED);
        let amount = balance::value(&extension.revenue_balance);
        if (amount == 0) { return };

        let coin = coin::from_balance(
            balance::split(&mut extension.revenue_balance, amount),
            ctx,
        );
        treasury_pool::deposit_to_region(treasury, extension.treasury_region_id, coin, ctx);
        extension.revenue_collected = extension.revenue_collected + amount;

        event::emit(RevenueCollected {
            gate_id: extension.gate_id,
            amount,
            timestamp: ctx.epoch_timestamp_ms(),
        });
    }

    // ── 公开函数 ──────────────────────────────────────────────

    public fun pay_dynamic_fee_and_jump(
        extension: &mut DynamicGateExt,
        gate: &Gate,
        destination_gate: &Gate,
        character: &Character,
        mut payment: Coin<SUI>,
        priority_pass_id: Option<ID>,
        _oracle: &ResourceOracle,
        _price_regulator: &PriceRegulator,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        update_traffic_stats(extension, clock);

        let dynamic_fee = calculate_dynamic_fee(
            extension,
            extension.fee_config.base_fee,
            &priority_pass_id,
            clock,
        );

        let payment_amount = coin::value(&payment);
        assert!(payment_amount >= dynamic_fee, E_INSUFFICIENT_PAYMENT);

        let final_fee = if (option::is_some(&priority_pass_id)) {
            let pass_id = *option::borrow(&priority_pass_id);
            process_priority_pass(extension, pass_id, dynamic_fee, ctx)
        } else {
            dynamic_fee
        };

        // 退还多余金额
        let change_amount = payment_amount - final_fee;
        if (change_amount > 0) {
            let change = coin::split(&mut payment, change_amount, ctx);
            transfer::public_transfer(change, ctx.sender());
        };

        // 将费用存入扩展器余额
        balance::join(&mut extension.revenue_balance, coin::into_balance(payment));

        let base_validity = 15 * 60 * 1000u64;
        let congestion_adj = if (extension.traffic_stats.congestion_level > 3) { 5 * 60 * 1000u64 } else { 0u64 };
        let expires_at = clock.timestamp_ms() + base_validity - congestion_adj;

        let pass_level = if (option::is_some(&priority_pass_id)) { 5u8 } else { 1u8 };
        event::emit(PriorityJump {
            gate_id: extension.gate_id,
            character: ctx.sender(),
            priority_level: pass_level,
            fee_paid: final_fee,
            discount_applied: dynamic_fee - final_fee,
            timestamp: clock.timestamp_ms(),
        });

        let permit = gate::issue_jump_permit<DynamicGateAuth>(
            gate,
            destination_gate,
            ctx.sender(),
            DynamicGateAuth {},
            expires_at,
            ctx,
        );
        transfer::public_transfer(permit, ctx.sender());
    }

    public fun batch_update_gate_fees(
        extension: &mut DynamicGateExt,
        oracle: &ResourceOracle,
        _price_regulator: &PriceRegulator,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        if (clock.timestamp_ms() - extension.last_fee_update < 3600000) { return };

        let region_id = extension.traffic_stats.region_id;
        let supply_demand_ratio = resource_oracle::get_supply_demand_ratio(oracle, resource_oracle::region_id_value(&region_id));

        let new_base_fee = calculate_base_fee_by_supply_demand(
            extension.fee_config.base_fee,
            supply_demand_ratio,
            extension.fee_config.demand_elasticity_factor,
        );
        let congestion_multiplier = calculate_congestion_multiplier(extension);
        let mut final_fee = (new_base_fee * congestion_multiplier) / 10000;

        let max_change = (extension.fee_config.base_fee * 2000) / 10000;
        if (final_fee > extension.fee_config.base_fee + max_change) {
            final_fee = extension.fee_config.base_fee + max_change;
        } else if (extension.fee_config.base_fee > max_change && final_fee < extension.fee_config.base_fee - max_change) {
            final_fee = extension.fee_config.base_fee - max_change;
        };

        let old_base_fee = extension.fee_config.base_fee;
        extension.fee_config.base_fee = final_fee;
        extension.last_fee_update = clock.timestamp_ms();

        event::emit(DynamicFeeUpdated {
            gate_id: extension.gate_id,
            old_base_fee,
            new_base_fee: final_fee,
            congestion_multiplier,
            update_reason: 0,
        });
    }

    // ── 查询函数 ──────────────────────────────────────────────

    public fun get_current_dynamic_fee(extension: &DynamicGateExt, clock: &Clock): u64 {
        calculate_dynamic_fee(extension, extension.fee_config.base_fee, &option::none<ID>(), clock)
    }

    public fun get_congestion_level(extension: &DynamicGateExt): u8 {
        extension.traffic_stats.congestion_level
    }

    public fun get_revenue_balance(extension: &DynamicGateExt): u64 {
        balance::value(&extension.revenue_balance)
    }

    // ── 内部辅助函数 ──────────────────────────────────────────

    fun update_traffic_stats(extension: &mut DynamicGateExt, clock: &Clock) {
        let stats = &mut extension.traffic_stats;
        let current_time = clock.timestamp_ms();
        stats.total_jumps = stats.total_jumps + 1;
        stats.jumps_last_hour = stats.jumps_last_hour + 1;
        stats.jumps_last_day = stats.jumps_last_day + 1;
        stats.last_jump_time = current_time;

        let current_hour = ((current_time / 3600000) % 24) as u64;
        let hour_record = vector::borrow_mut(&mut stats.hourly_jump_records, current_hour);
        *hour_record = *hour_record + 1;

        let new_level = calculate_congestion_level(stats);
        if (new_level != stats.congestion_level) {
            let old_level = stats.congestion_level;
            stats.congestion_level = new_level;
            event::emit(CongestionLevelChanged {
                gate_id: extension.gate_id,
                old_level,
                new_level,
                total_jumps: stats.total_jumps,
            });
        };
    }

    fun calculate_dynamic_fee(
        extension: &DynamicGateExt,
        base_fee: u64,
        priority_pass_id: &Option<ID>,
        clock: &Clock,
    ): u64 {
        let mut fee = (base_fee * calculate_congestion_multiplier(extension)) / 10000;
        if (extension.fee_config.time_based_discount) {
            fee = apply_time_adjustment(extension, fee, clock);
        };
        if (option::is_some(priority_pass_id)) {
            let pass_id = *option::borrow(priority_pass_id);
            if (table::contains(&extension.active_priority_passes, pass_id)) {
                let pass = table::borrow(&extension.active_priority_passes, pass_id);
                fee = apply_priority_discount(fee, pass.priority_level, &extension.fee_config);
            };
        };
        fee
    }

    fun calculate_congestion_multiplier(extension: &DynamicGateExt): u64 {
        let lvl = extension.traffic_stats.congestion_level;
        if (lvl == 0) { 8000 }
        else if (lvl == 1) { 9000 }
        else if (lvl == 2) { 10000 }
        else if (lvl == 3) { 12000 }
        else if (lvl == 4) { 15000 }
        else { 20000 }
    }

    fun apply_time_adjustment(extension: &DynamicGateExt, fee: u64, clock: &Clock): u64 {
        let current_hour = (clock.timestamp_ms() / 3600000) % 24;
        let is_rush = (current_hour >= 8 && current_hour < 10) || (current_hour >= 17 && current_hour < 19);
        if (is_rush) {
            fee + (fee * extension.fee_config.rush_hour_surcharge) / 10000
        } else {
            let discount = (fee * extension.fee_config.off_peak_discount) / 10000;
            if (fee > discount) { fee - discount } else { fee / 2 }
        }
    }

    fun apply_priority_discount(fee: u64, priority_level: u8, fee_config: &DynamicFeeConfig): u64 {
        if (table::contains(&fee_config.membership_discount_table, priority_level)) {
            let discount_bps = *table::borrow(&fee_config.membership_discount_table, priority_level);
            let discount_amount = (fee * discount_bps) / 10000;
            if (fee > discount_amount) { fee - discount_amount } else { fee / 2 }
        } else {
            fee
        }
    }

    fun process_priority_pass(
        extension: &mut DynamicGateExt,
        pass_id: ID,
        fee: u64,
        ctx: &mut TxContext,
    ): u64 {
        assert!(table::contains(&extension.active_priority_passes, pass_id), E_PASS_NOT_FOUND);
        let pass = table::borrow_mut(&mut extension.active_priority_passes, pass_id);
        let current_time = ctx.epoch_timestamp_ms();
        assert!(current_time - pass.created_at < pass.validity_period_ms, E_PASS_EXPIRED);
        assert!(pass.usage_count < pass.max_usage, E_PASS_USAGE_LIMIT);
        pass.usage_count = pass.usage_count + 1;
        let final_fee = apply_priority_discount(fee, pass.priority_level, &extension.fee_config);
        if (pass.usage_count == pass.max_usage) {
            let PriorityPass { id, owner: _, gate_id: _, priority_level: _, validity_period_ms: _, created_at: _, usage_count: _, max_usage: _ } = table::remove(&mut extension.active_priority_passes, pass_id);
            object::delete(id);
        };
        final_fee
    }

    fun calculate_congestion_level(stats: &GateTrafficStats): u8 {
        let hourly_avg = stats.jumps_last_hour;
        if (hourly_avg < 10) { 0 }
        else if (hourly_avg < 30) { 1 }
        else if (hourly_avg < 60) { 2 }
        else if (hourly_avg < 100) { 3 }
        else if (hourly_avg < 200) { 4 }
        else { 5 }
    }

    fun calculate_base_fee_by_supply_demand(
        current_fee: u64,
        supply_demand_ratio: u64,
        elasticity_factor: u64,
    ): u64 {
        let fee_multiplier = if (supply_demand_ratio < 5000) {
            let scarcity = 5000 - supply_demand_ratio;
            10000 + (scarcity * elasticity_factor) / 100
        } else if (supply_demand_ratio > 15000) {
            let surplus = supply_demand_ratio - 15000;
            let reduction = (surplus * elasticity_factor) / 200;
            if (10000 > reduction) { 10000 - reduction } else { 5000 }
        } else {
            10000
        };
        (current_fee * fee_multiplier) / 10000
    }
}
