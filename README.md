# Dynamic Economic Regulator

EVE Frontier × Sui Hackathon 2026 参赛项目。

一个为 EVE Frontier 设计的动态经济调节系统，让游戏内的资源供需、价格、金库和星门费用形成联动闭环。

---

## 快速运行（前端演示）

```bash
cd dapp
npm install
npm run dev
```

浏览器打开 http://localhost:5173，无需钱包和合约即可查看演示数据。

连接钱包（推荐 Sui Wallet 或 EVE Vault）后可切换到真实链上数据。

---

## 项目结构

```
dynamic-economic-regulator/
├── dapp/                  # React + Vite 前端
│   ├── src/
│   │   ├── pages/         # Dashboard / Trade / Admin
│   │   ├── hooks/         # useContractData（链上数据查询）
│   │   ├── utils/         # SuiClient、交易构建工具
│   │   └── components/    # Header、ConnectWallet、Footer
│   └── .env.example       # 环境变量模板
├── move-contracts/        # Sui Move 智能合约
│   └── sources/
│       ├── init.move          # 系统初始化
│       ├── resource_oracle.move   # 资源预言机
│       ├── price_regulator.move   # 动态定价
│       ├── treasury_pool.move     # 金库管理
│       └── dynamic_gate.move      # 动态星门费用
├── world-contracts/       # EVE Frontier world 接口存根
├── scripts/
│   ├── deploy.sh          # 一键部署 + 初始化
│   └── init.sh            # 查询部署后的对象 ID
└── docs/
    ├── DESIGN.md
    ├── PITCH.md
    └── DEPLOYMENT.md
```

---

## 部署合约到测试网

### 前置条件

- [安装 Sui CLI](https://docs.sui.io/guides/developer/getting-started/sui-install)
- 配置测试网账户并获取测试币：`sui client faucet`

### 一键部署

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh testnet
```

脚本会自动：
1. 编译 Move 合约
2. 发布到测试网
3. 提取所有对象 ID
4. 调用 `wire_subsystems` 完成初始化

### 配置前端

将部署脚本输出的 ID 填入 `dapp/.env`：

```env
VITE_PACKAGE_ID=0x...
VITE_SYSTEM_OBJECT_ID=0x...
VITE_RESOURCE_ORACLE_ID=0x...
VITE_PRICE_REGULATOR_ID=0x...
VITE_TREASURY_POOL_ID=0x...
```

重启前端后即连接真实链上数据。

---

## 核心功能

| 模块 | 说明 |
|------|------|
| 资源预言机 | 追踪各区域库存、生产率、消耗率，计算供需比例 |
| 动态定价 | 根据供需自动调整价格，支持 AMM 模式 |
| 金库池 | 跨区域资金管理与自动再平衡 |
| 动态星门 | 拥堵感知费用、优先通行证、会员折扣 |

---

## 技术栈

- 前端：React 18 + Vite + TypeScript + Tailwind CSS
- 链上：Sui Move（testnet）
- 钱包：@mysten/dapp-kit（支持所有 Sui 兼容钱包）
- 数据：@tanstack/react-query（30s 自动刷新）
