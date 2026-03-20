module dynamic_economic_regulator::treasury_pool {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::clock::Clock;

    use dynamic_economic_regulator::resource_oracle::{Self as resource_oracle, RegionID};

    // ── 类型定义 ─────────────────────────────────────────────

    /// 区域金库（存入 Table 需要 store ability）
    public struct RegionTreasury has store {
        region_id: RegionID,
        balance: Balance<SUI>,
        total_deposited: u64,
        total_withdrawn: u64,
        auto_rebalance_enabled: bool,
        min_balance_threshold: u64,
        max_balance_threshold: u64,
        last_rebalanced: u64,
    }

    /// 收益分配比例
    public struct RevenueShare has copy, drop, store {
        recipient: address,
        share_percentage: u64,
        is_active: bool,
    }

    /// 再平衡配置（需要 copy + drop 以支持字段赋值）
    public struct RebalanceConfig has copy, drop, store {
        enabled: bool,
        interval_ms: u64,
        threshold_percentage: u64,
        max_transfer_amount: u64,
        transfer_fee_bps: u64,
    }

    /// 主金库（共享对象）
    public struct TreasuryPool has key {
        id: UID,
        region_treasuries: Table<RegionID, RegionTreasury>,
        revenue_shares: vector<RevenueShare>,
        global_balance: Balance<SUI>,
        auto_rebalance_config: RebalanceConfig,
        treasury_admin: address,
        total_revenue: u64,
        total_distributed: u64,
    }

    /// 管理员权限凭证
    public struct TreasuryAdminCap has key, store {
        id: UID,
    }

    /// 流动性提供者凭证
    public struct LiquidityProviderCap has key, store {
        id: UID,
        provider_address: address,
    }

    // ── 事件 ──────────────────────────────────────────────────

    public struct FundsDeposited has copy, drop {
        region_id: RegionID,
        amount: u64,
        sender: address,
    }

    public struct FundsWithdrawn has copy, drop {
        region_id: RegionID,
        amount: u64,
        recipient: address,
    }

    public struct CrossRegionTransfer has copy, drop {
        from_region: RegionID,
        to_region: RegionID,
        amount: u64,
        fee_amount: u64,
    }

    public struct RevenueDistributed has copy, drop {
        total_amount: u64,
        recipient_count: u64,
        timestamp: u64,
    }

    public struct TreasuryRebalanced has copy, drop {
        transfer_count: u64,
        total_amount: u64,
        timestamp: u64,
    }

    // ── 常量定义 ──────────────────────────────────────────────
    const E_UNAUTHORIZED: u64 = 1;
    const E_TREASURY_ALREADY_EXISTS: u64 = 2;
    const E_TREASURY_NOT_FOUND: u64 = 3;
    const E_INSUFFICIENT_BALANCE: u64 = 6;
    const E_BELOW_MIN_THRESHOLD: u64 = 7;
    const E_SAME_REGION: u64 = 8;

    // ── 初始化 ────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let rebalance_config = RebalanceConfig {
            enabled: true,
            interval_ms: 3600000,
            threshold_percentage: 500,
            max_transfer_amount: 1000000000000,
            transfer_fee_bps: 10,
        };

        let treasury = TreasuryPool {
            id: object::new(ctx),
            region_treasuries: table::new(ctx),
            revenue_shares: vector::empty(),
            global_balance: balance::zero(),
            auto_rebalance_config: rebalance_config,
            treasury_admin: ctx.sender(),
            total_revenue: 0,
            total_distributed: 0,
        };

        let admin_cap = TreasuryAdminCap { id: object::new(ctx) };

        transfer::share_object(treasury);
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ── 管理员函数 ─────────────────────────────────────────────

    public fun create_region_treasury(
        treasury: &mut TreasuryPool,
        _admin_cap: &TreasuryAdminCap,
        region_id_raw: u64,
        min_balance_threshold: u64,
        max_balance_threshold: u64,
        ctx: &mut TxContext,
    ) {
        assert!(treasury.treasury_admin == ctx.sender(), E_UNAUTHORIZED);
        let region_id = resource_oracle::make_region_id(region_id_raw);
        assert!(!table::contains(&treasury.region_treasuries, region_id), E_TREASURY_ALREADY_EXISTS);

        let region_treasury = RegionTreasury {
            region_id,
            balance: balance::zero(),
            total_deposited: 0,
            total_withdrawn: 0,
            auto_rebalance_enabled: true,
            min_balance_threshold,
            max_balance_threshold,
            last_rebalanced: 0,
        };

        table::add(&mut treasury.region_treasuries, region_id, region_treasury);
    }

    public fun set_revenue_share(
        treasury: &mut TreasuryPool,
        _admin_cap: &TreasuryAdminCap,
        recipient: address,
        share_percentage: u64,
        is_active: bool,
        ctx: &mut TxContext,
    ) {
        assert!(treasury.treasury_admin == ctx.sender(), E_UNAUTHORIZED);
        assert!(share_percentage <= 10000, 4);

        let mut i = 0;
        let share_count = vector::length(&treasury.revenue_shares);
        let mut found = false;

        while (i < share_count) {
            let share_ref = vector::borrow_mut(&mut treasury.revenue_shares, i);
            if (share_ref.recipient == recipient) {
                share_ref.share_percentage = share_percentage;
                share_ref.is_active = is_active;
                found = true;
                break;
            };
            i = i + 1;
        };

        if (!found) {
            vector::push_back(&mut treasury.revenue_shares, RevenueShare {
                recipient,
                share_percentage,
                is_active,
            });
        };
    }

    public fun update_rebalance_config(
        treasury: &mut TreasuryPool,
        _admin_cap: &TreasuryAdminCap,
        enabled: bool,
        interval_ms: u64,
        threshold_percentage: u64,
        max_transfer_amount: u64,
        transfer_fee_bps: u64,
        ctx: &mut TxContext,
    ) {
        assert!(treasury.treasury_admin == ctx.sender(), E_UNAUTHORIZED);
        treasury.auto_rebalance_config = RebalanceConfig {
            enabled,
            interval_ms,
            threshold_percentage,
            max_transfer_amount,
            transfer_fee_bps,
        };
    }

    public fun create_liquidity_provider_cap(
        treasury: &TreasuryPool,
        _admin_cap: &TreasuryAdminCap,
        provider_address: address,
        ctx: &mut TxContext,
    ) {
        assert!(treasury.treasury_admin == ctx.sender(), E_UNAUTHORIZED);
        transfer::transfer(LiquidityProviderCap {
            id: object::new(ctx),
            provider_address,
        }, provider_address);
    }

    // ── 公开函数 ──────────────────────────────────────────────

    public fun deposit_to_region(
        treasury: &mut TreasuryPool,
        region_id: RegionID,
        payment: Coin<SUI>,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&treasury.region_treasuries, region_id), E_TREASURY_NOT_FOUND);
        let amount = coin::value(&payment);
        let region_treasury = table::borrow_mut(&mut treasury.region_treasuries, region_id);
        region_treasury.total_deposited = region_treasury.total_deposited + amount;
        balance::join(&mut region_treasury.balance, coin::into_balance(payment));
        treasury.total_revenue = treasury.total_revenue + amount;
        event::emit(FundsDeposited { region_id, amount, sender: ctx.sender() });
    }

    public fun withdraw_from_region(
        treasury: &mut TreasuryPool,
        region_id: RegionID,
        amount: u64,
        ctx: &mut TxContext,
    ): Coin<SUI> {
        assert!(table::contains(&treasury.region_treasuries, region_id), E_TREASURY_NOT_FOUND);
        let region_treasury = table::borrow_mut(&mut treasury.region_treasuries, region_id);
        assert!(balance::value(&region_treasury.balance) >= amount, E_INSUFFICIENT_BALANCE);
        let new_balance = balance::value(&region_treasury.balance) - amount;
        assert!(new_balance >= region_treasury.min_balance_threshold, E_BELOW_MIN_THRESHOLD);
        region_treasury.total_withdrawn = region_treasury.total_withdrawn + amount;
        let withdrawn = balance::split(&mut region_treasury.balance, amount);
        event::emit(FundsWithdrawn { region_id, amount, recipient: ctx.sender() });
        coin::from_balance(withdrawn, ctx)
    }

    public fun cross_region_transfer(
        treasury: &mut TreasuryPool,
        from_region: RegionID,
        to_region: RegionID,
        amount: u64,
        ctx: &mut TxContext,
    ) {
        assert!(table::contains(&treasury.region_treasuries, from_region), E_TREASURY_NOT_FOUND);
        assert!(table::contains(&treasury.region_treasuries, to_region), E_TREASURY_NOT_FOUND);
        assert!(from_region != to_region, E_SAME_REGION);

        let fee_amount = (amount * treasury.auto_rebalance_config.transfer_fee_bps) / 10000;
        let transfer_amount = amount - fee_amount;

        let from_treasury = table::borrow_mut(&mut treasury.region_treasuries, from_region);
        assert!(balance::value(&from_treasury.balance) >= amount, E_INSUFFICIENT_BALANCE);
        from_treasury.total_withdrawn = from_treasury.total_withdrawn + amount;
        let transfer_balance = balance::split(&mut from_treasury.balance, transfer_amount);
        let fee_balance = if (fee_amount > 0) {
            balance::split(&mut from_treasury.balance, fee_amount)
        } else {
            balance::zero()
        };

        let to_treasury = table::borrow_mut(&mut treasury.region_treasuries, to_region);
        to_treasury.total_deposited = to_treasury.total_deposited + transfer_amount;
        balance::join(&mut to_treasury.balance, transfer_balance);

        balance::join(&mut treasury.global_balance, fee_balance);

        event::emit(CrossRegionTransfer { from_region, to_region, amount: transfer_amount, fee_amount });
    }

    public fun auto_rebalance_region(
        treasury: &mut TreasuryPool,
        from_region: RegionID,
        to_region: RegionID,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        if (!treasury.auto_rebalance_config.enabled) { return };
        assert!(table::contains(&treasury.region_treasuries, from_region), E_TREASURY_NOT_FOUND);
        assert!(table::contains(&treasury.region_treasuries, to_region), E_TREASURY_NOT_FOUND);

        let from_balance = balance::value(&table::borrow(&treasury.region_treasuries, from_region).balance);
        let from_max = table::borrow(&treasury.region_treasuries, from_region).max_balance_threshold;
        let to_balance = balance::value(&table::borrow(&treasury.region_treasuries, to_region).balance);
        let to_min = table::borrow(&treasury.region_treasuries, to_region).min_balance_threshold;

        if (from_balance <= from_max || to_balance >= to_min) { return };

        let excess = from_balance - from_max;
        let transfer_amount = if (excess > treasury.auto_rebalance_config.max_transfer_amount) {
            treasury.auto_rebalance_config.max_transfer_amount
        } else {
            excess
        };

        cross_region_transfer(treasury, from_region, to_region, transfer_amount, ctx);

        event::emit(TreasuryRebalanced {
            transfer_count: 1,
            total_amount: transfer_amount,
            timestamp: clock.timestamp_ms(),
        });
    }

    public fun distribute_revenue(
        treasury: &mut TreasuryPool,
        distribution_amount: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(balance::value(&treasury.global_balance) >= distribution_amount, E_INSUFFICIENT_BALANCE);

        let mut total_shares = 0u64;
        let mut active_recipients: vector<address> = vector::empty();
        let share_count = vector::length(&treasury.revenue_shares);
        let mut i = 0;

        while (i < share_count) {
            let share = *vector::borrow(&treasury.revenue_shares, i);
            if (share.is_active) {
                total_shares = total_shares + share.share_percentage;
                vector::push_back(&mut active_recipients, share.recipient);
            };
            i = i + 1;
        };

        assert!(total_shares > 0, 8);

        let mut j = 0;
        let recipient_count = vector::length(&active_recipients);
        let mut distributed_amount = 0u64;

        while (j < recipient_count) {
            let recipient = *vector::borrow(&active_recipients, j);
            let share = find_revenue_share(&treasury.revenue_shares, recipient);
            let recipient_amount = (distribution_amount * share.share_percentage) / total_shares;
            if (recipient_amount > 0) {
                let payout = coin::from_balance(
                    balance::split(&mut treasury.global_balance, recipient_amount),
                    ctx,
                );
                transfer::public_transfer(payout, recipient);
                distributed_amount = distributed_amount + recipient_amount;
            };
            j = j + 1;
        };

        treasury.total_distributed = treasury.total_distributed + distributed_amount;

        event::emit(RevenueDistributed {
            total_amount: distributed_amount,
            recipient_count,
            timestamp: clock.timestamp_ms(),
        });
    }

    // ── 查询函数 ──────────────────────────────────────────────

    public fun get_region_balance(treasury: &TreasuryPool, region_id: RegionID): u64 {
        assert!(table::contains(&treasury.region_treasuries, region_id), E_TREASURY_NOT_FOUND);
        balance::value(&table::borrow(&treasury.region_treasuries, region_id).balance)
    }

    public fun get_global_balance(treasury: &TreasuryPool): u64 {
        balance::value(&treasury.global_balance)
    }

    public fun get_total_revenue(treasury: &TreasuryPool): u64 { treasury.total_revenue }

    public fun get_total_distributed(treasury: &TreasuryPool): u64 { treasury.total_distributed }

    public fun get_rebalance_config(treasury: &TreasuryPool): RebalanceConfig {
        treasury.auto_rebalance_config
    }

    // ── 内部辅助函数 ──────────────────────────────────────────

    fun find_revenue_share(shares: &vector<RevenueShare>, recipient: address): RevenueShare {
        let mut i = 0;
        let share_count = vector::length(shares);
        while (i < share_count) {
            let share = *vector::borrow(shares, i);
            if (share.recipient == recipient) { return share };
            i = i + 1;
        };
        RevenueShare { recipient, share_percentage: 0, is_active: false }
    }
}
