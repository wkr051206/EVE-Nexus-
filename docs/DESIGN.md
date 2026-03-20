# 设计说明

## 一句话定位

Dynamic Economic Regulator 是一个面向 EVE Frontier 的动态经济调节台，把"资源供需变化"转成"价格变化、金库调节、星门费用变化"的联动系统。

---

## 系统架构

### 链上层（Move 合约）

四个模块，各司其职：

```
resource_oracle  →  price_regulator
       ↓                  ↓
  treasury_pool  ←  dynamic_gate
```

- `resource_oracle`：采集区域库存/生产/消耗，输出供需比例
- `price_regulator`：消费供需比例，自动调整价格；支持 AMM 流动性池
- `treasury_pool`：管理各区域 SUI 余额，支持跨区域转账和自动再平衡
- `dynamic_gate`：根据拥堵级别和供需动态调整星门通行费，支持优先通行证

初始化流程：发布合约 → 各模块自动创建共享对象 → `wire_subsystems` 绑定地址 → 系统就绪。

### 前端层（React + Vite）

三个页面对应三种角色：

| 页面 | 角色 | 核心功能 |
|------|------|----------|
| Dashboard | 所有人 | 价格趋势、资源分布、流转图、网络状态 |
| Trade | 玩家/交易者 | 选择路线、估算费用、执行链上交易 |
| Admin | 系统运营方 | 区域管理、定价配置、金库监控 |

数据流：`useContractData` hooks → `SuiClient.getObject` → 30s 自动刷新。合约未配置时自动降级为演示数据，不影响演示。

---

## 关键设计决策

### 为什么合约未配置时不报错而是降级

黑客松评审期间合约可能未部署，降级演示保证评委能看到完整产品逻辑，同时 `ContractStatusBanner` 明确提示当前状态。

### 为什么 `auto_rebalance` 需要传入区域 ID

Sui Move 的 `Table` 不支持迭代，无法在合约内遍历所有区域。链下服务（或管理员）负责识别需要再平衡的区域对，然后调用 `auto_rebalance_region`。

### 为什么用 `overrides` 统一 `@mysten/sui` 版本

`@mysten/dapp-kit` 内部捆绑了自己的 `@mysten/sui`，导致 `Transaction` 类型不兼容。`package.json` 的 `overrides` 字段强制所有依赖使用同一版本。

---

## 当前完成度

### 已完成 ✅

- 前端三页面接入真实链上数据，合约未配置时降级演示
- Trade 页面 `useSignAndExecuteTransaction` 真实链上交易
- Admin 页面链上创建区域
- Move 合约四个模块完整可编译
- 部署脚本自动完成从编译到初始化的全流程
- 网络状态指示器（Testnet checkpoint 实时显示）

### 赛后扩展方向

- 链下定时服务：定期触发价格更新和金库再平衡
- AMM 流动性池管理界面
- 多区域批量操作
- 事件订阅实时推送（WebSocket）
