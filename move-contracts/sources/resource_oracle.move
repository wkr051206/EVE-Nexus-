module dynamic_economic_regulator::resource_oracle {
    use sui::object::{Self, UID};
    use sui::table::{Self, Table};
    use sui::event;
    use sui::tx_context::TxContext;
    use sui::transfer;
    use sui::clock::Clock;

    // ── 类型定义 ─────────────────────────────────────────────

    public struct RegionID has copy, drop, store { id: u64 }
    public struct ResourceType has copy, drop, store { type_id: u8 }

    /// 需要 copy 以支持 *table::borrow() 解引用返回
    public struct RegionResource has copy, drop, store {
        region_id: RegionID,
        resource_type: ResourceType,
        current_stock: u64,
        max_capacity: u64,
        consumption_rate: u64,
        production_rate: u64,
        last_updated: u64,
        supply_demand_ratio: u64,
    }

    /// 需要 copy + drop 以支持 vector 操作
    public struct ResourceFlow has copy, drop, store {
        from_region: RegionID,
        to_region: RegionID,
        resource_type: ResourceType,
        amount: u64,
        timestamp: u64,
    }

    public struct ResourceOracle has key {
        id: UID,
        region_resources: Table<RegionID, RegionResource>,
        flow_records: vector<ResourceFlow>,
        price_triggers: Table<RegionID, u64>,
        oracle_admin: address,
    }

    public struct OracleAdminCap has key, store { id: UID }

    // ── 事件 ──────────────────────────────────────────────────

    public struct ResourceDataUpdated has copy, drop {
        region_id: RegionID,
        resource_type: ResourceType,
        new_stock: u64,
        supply_demand_ratio: u64,
    }

    public struct PriceAdjustmentTriggered has copy, drop {
        region_id: RegionID,
        resource_type: ResourceType,
        current_ratio: u64,
        trigger_threshold: u64,
    }

    public struct ResourceFlowRecorded has copy, drop {
        from_region: RegionID,
        to_region: RegionID,
        resource_type: ResourceType,
        amount: u64,
        flow_direction: u8,
    }

    // ── 常量 ──────────────────────────────────────────────────
    const E_UNAUTHORIZED: u64 = 1;
    const E_REGION_NOT_FOUND: u64 = 2;
    const E_RESOURCE_TYPE_MISMATCH: u64 = 3;
    const E_EXCEEDS_CAPACITY: u64 = 4;

    // ── 初始化 ────────────────────────────────────────────────

    fun init(ctx: &mut TxContext) {
        let oracle = ResourceOracle {
            id: object::new(ctx),
            region_resources: table::new(ctx),
            flow_records: vector::empty(),
            price_triggers: table::new(ctx),
            oracle_admin: ctx.sender(),
        };
        let admin_cap = OracleAdminCap { id: object::new(ctx) };
        transfer::share_object(oracle);
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ── 管理员函数 ─────────────────────────────────────────────

    public fun register_region(
        oracle: &mut ResourceOracle,
        _admin_cap: &OracleAdminCap,
        region_id_raw: u64,
        resource_type_raw: u8,
        initial_stock: u64,
        max_capacity: u64,
        consumption_rate: u64,
        production_rate: u64,
        price_trigger_threshold: u64,
        ctx: &mut TxContext,
    ) {
        assert!(oracle.oracle_admin == ctx.sender(), E_UNAUTHORIZED);

        let region_id = RegionID { id: region_id_raw };
        let resource_type = ResourceType { type_id: resource_type_raw };

        let region_resource = RegionResource {
            region_id,
            resource_type,
            current_stock: initial_stock,
            max_capacity,
            consumption_rate,
            production_rate,
            last_updated: 0,
            supply_demand_ratio: calculate_initial_ratio(initial_stock, max_capacity),
        };

        table::add(&mut oracle.region_resources, region_id, region_resource);
        table::add(&mut oracle.price_triggers, region_id, price_trigger_threshold);
    }

    public fun update_price_trigger(
        oracle: &mut ResourceOracle,
        _admin_cap: &OracleAdminCap,
        region_id_raw: u64,
        new_threshold: u64,
        ctx: &mut TxContext,
    ) {
        assert!(oracle.oracle_admin == ctx.sender(), E_UNAUTHORIZED);
        let region_id = RegionID { id: region_id_raw };
        assert!(table::contains(&oracle.price_triggers, region_id), E_REGION_NOT_FOUND);
        *table::borrow_mut(&mut oracle.price_triggers, region_id) = new_threshold;
    }

    // ── 公开函数 ──────────────────────────────────────────────

    public fun update_resource_data(
        oracle: &mut ResourceOracle,
        region_id_raw: u64,
        resource_type_raw: u8,
        new_stock: u64,
        consumption_rate: u64,
        production_rate: u64,
        clock: &Clock,
    ) {
        let region_id = RegionID { id: region_id_raw };
        let resource_type = ResourceType { type_id: resource_type_raw };
        assert!(table::contains(&oracle.region_resources, region_id), E_REGION_NOT_FOUND);

        let region_resource = table::borrow_mut(&mut oracle.region_resources, region_id);
        assert!(region_resource.resource_type == resource_type, E_RESOURCE_TYPE_MISMATCH);
        assert!(new_stock <= region_resource.max_capacity, E_EXCEEDS_CAPACITY);

        region_resource.current_stock = new_stock;
        region_resource.consumption_rate = consumption_rate;
        region_resource.production_rate = production_rate;
        region_resource.last_updated = clock.timestamp_ms();
        region_resource.supply_demand_ratio = calculate_supply_demand_ratio(
            new_stock, region_resource.max_capacity, consumption_rate, production_rate
        );

        let new_ratio = region_resource.supply_demand_ratio;
        check_price_adjustment_trigger(oracle, region_id, resource_type, new_ratio);

        event::emit(ResourceDataUpdated { region_id, resource_type, new_stock, supply_demand_ratio: new_ratio });
    }

    public fun record_resource_flow(
        oracle: &mut ResourceOracle,
        from_region_raw: u64,
        to_region_raw: u64,
        resource_type_raw: u8,
        amount: u64,
        flow_direction: u8,
        clock: &Clock,
    ) {
        let from_region = RegionID { id: from_region_raw };
        let to_region = RegionID { id: to_region_raw };
        let resource_type = ResourceType { type_id: resource_type_raw };
        let flow_record = ResourceFlow {
            from_region, to_region, resource_type, amount,
            timestamp: clock.timestamp_ms(),
        };

        vector::push_back(&mut oracle.flow_records, flow_record);

        if (vector::length(&oracle.flow_records) > 1000) {
            vector::remove(&mut oracle.flow_records, 0);
        };

        event::emit(ResourceFlowRecorded { from_region, to_region, resource_type, amount, flow_direction });
    }

    // ── 查询函数 ──────────────────────────────────────────────

    /// 从 RegionID struct 取出原始 u64 值（供其他模块使用）
    public fun region_id_value(region_id: &RegionID): u64 {
        region_id.id
    }

    /// 从 ResourceType struct 取出原始 u8 值（供其他模块使用）
    public fun resource_type_value(resource_type: &ResourceType): u8 {
        resource_type.type_id
    }

    /// 构造 RegionID（供其他模块使用）
    public fun make_region_id(id: u64): RegionID {
        RegionID { id }
    }

    /// 构造 ResourceType（供其他模块使用）
    public fun make_resource_type(type_id: u8): ResourceType {
        ResourceType { type_id }
    }

    public fun get_region_resource(oracle: &ResourceOracle, region_id_raw: u64): RegionResource {
        let region_id = RegionID { id: region_id_raw };
        assert!(table::contains(&oracle.region_resources, region_id), E_REGION_NOT_FOUND);
        *table::borrow(&oracle.region_resources, region_id)
    }

    public fun get_supply_demand_ratio(oracle: &ResourceOracle, region_id_raw: u64): u64 {
        get_region_resource(oracle, region_id_raw).supply_demand_ratio
    }

    public fun get_price_trigger_threshold(oracle: &ResourceOracle, region_id_raw: u64): u64 {
        let region_id = RegionID { id: region_id_raw };
        assert!(table::contains(&oracle.price_triggers, region_id), E_REGION_NOT_FOUND);
        *table::borrow(&oracle.price_triggers, region_id)
    }

    public fun get_recent_flows(oracle: &ResourceOracle, limit: u64): vector<ResourceFlow> {
        let flow_count = vector::length(&oracle.flow_records);
        let start_index = if (flow_count > limit) { flow_count - limit } else { 0 };
        let mut result = vector::empty();
        let mut i = start_index;
        while (i < flow_count) {
            vector::push_back(&mut result, *vector::borrow(&oracle.flow_records, i));
            i = i + 1;
        };
        result
    }

    // ── 内部辅助函数 ──────────────────────────────────────────

    fun calculate_initial_ratio(initial_stock: u64, max_capacity: u64): u64 {
        if (max_capacity == 0) { 10000 } else { (initial_stock * 10000) / max_capacity }
    }

    fun calculate_supply_demand_ratio(
        current_stock: u64, max_capacity: u64, consumption_rate: u64, production_rate: u64
    ): u64 {
        if (max_capacity == 0) { return 10000 };
        let base_ratio = (current_stock * 10000) / max_capacity;
        if (consumption_rate > production_rate) {
            let adjustment = ((consumption_rate - production_rate) * 100) / max_capacity;
            if (base_ratio > adjustment) { base_ratio - adjustment } else { 1000 }
        } else if (production_rate > consumption_rate) {
            let adjustment = ((production_rate - consumption_rate) * 100) / max_capacity;
            if (base_ratio + adjustment < 20000) { base_ratio + adjustment } else { 20000 }
        } else {
            base_ratio
        }
    }

    fun check_price_adjustment_trigger(
        oracle: &ResourceOracle, region_id: RegionID, resource_type: ResourceType, current_ratio: u64,
    ) {
        if (!table::contains(&oracle.price_triggers, region_id)) { return };
        let trigger_threshold = *table::borrow(&oracle.price_triggers, region_id);
        if (current_ratio < trigger_threshold || current_ratio > (20000 - trigger_threshold)) {
            event::emit(PriceAdjustmentTriggered { region_id, resource_type, current_ratio, trigger_threshold });
        }
    }
}
