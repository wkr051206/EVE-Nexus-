module dynamic_economic_regulator::init {
    use sui::object::{Self, UID};
    use sui::tx_context::TxContext;
    use sui::transfer;

    // ── 系统对象 ──────────────────────────────────────────────

    /// 经济调节器系统（共享对象，部署后自动创建）
    public struct EconomicRegulatorSystem has key {
        id: UID,
        resource_oracle: address,
        price_regulator: address,
        treasury_pool: address,
        system_admin: address,
        is_initialized: bool,
    }

    /// 系统管理员凭证
    public struct SystemAdminCap has key, store {
        id: UID,
    }

    // ── 模块初始化（发布时自动执行一次）────────────────────────

    fun init(ctx: &mut TxContext) {
        // 创建系统对象（共享，所有人可读）
        let system = EconomicRegulatorSystem {
            id: object::new(ctx),
            resource_oracle: @0x0,
            price_regulator: @0x0,
            treasury_pool: @0x0,
            system_admin: ctx.sender(),
            is_initialized: false,
        };

        // 创建管理员凭证（转给部署者）
        let admin_cap = SystemAdminCap {
            id: object::new(ctx),
        };

        transfer::share_object(system);
        transfer::transfer(admin_cap, ctx.sender());
    }

    // ── 管理员函数 ─────────────────────────────────────────────

    /// 绑定已部署的子系统对象 ID（entry 函数，可由部署脚本直接调用）
    public entry fun wire_subsystems(
        system: &mut EconomicRegulatorSystem,
        _cap: &SystemAdminCap,
        oracle_addr: address,
        regulator_addr: address,
        treasury_addr: address,
        ctx: &mut TxContext,
    ) {
        assert!(system.system_admin == ctx.sender(), 1);
        system.resource_oracle = oracle_addr;
        system.price_regulator = regulator_addr;
        system.treasury_pool = treasury_addr;
        system.is_initialized = true;
    }

    // ── 查询函数 ──────────────────────────────────────────────

    public fun is_initialized(system: &EconomicRegulatorSystem): bool {
        system.is_initialized
    }

    public fun get_system_admin(system: &EconomicRegulatorSystem): address {
        system.system_admin
    }

    public fun get_resource_oracle(system: &EconomicRegulatorSystem): address {
        system.resource_oracle
    }

    public fun get_price_regulator(system: &EconomicRegulatorSystem): address {
        system.price_regulator
    }

    public fun get_treasury_pool(system: &EconomicRegulatorSystem): address {
        system.treasury_pool
    }
}
