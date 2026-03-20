# Dynamic Economic Regulator

EVE Frontier x Sui Hackathon 2026 project.

This project is a dynamic economic regulation system for EVE Frontier. It links resource supply and demand, pricing, treasury balancing, and route fee signals into one on-chain control loop.

## Quick Start

```bash
cd dapp
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.

Without a wallet or deployed contracts, the app can still run in demo mode.
With a Sui-compatible wallet connected and contract IDs configured, it can read live on-chain data and submit transactions on Sui testnet.

## Project Structure

```text
dynamic-economic-regulator/
├── dapp/                  # React + Vite frontend
│   ├── src/
│   │   ├── pages/         # Dashboard / Trade / Admin
│   │   ├── hooks/         # Contract data and world API hooks
│   │   ├── utils/         # Sui client and transaction helpers
│   │   └── components/    # Shared UI
│   └── .env.example       # Environment template
├── move-contracts/        # Sui Move contracts
├── world-contracts/       # EVE Frontier world interface stubs
├── scripts/               # Deploy and initialization scripts
└── docs/                  # Design / pitch / deployment docs
```

## Deployment

### 1. Publish contracts to Sui testnet

Prerequisites:

- Install Sui CLI
- Configure testnet account
- Request test SUI with `sui client faucet`

Deploy:

```bash
chmod +x scripts/deploy.sh
./scripts/deploy.sh testnet
```

### 2. Configure frontend

Fill `dapp/.env` with the published object IDs:

```env
VITE_SUI_NETWORK=testnet
VITE_PACKAGE_ID=0x...
VITE_SYSTEM_OBJECT_ID=0x...
VITE_RESOURCE_ORACLE_ID=0x...
VITE_PRICE_REGULATOR_ID=0x...
VITE_TREASURY_POOL_ID=0x...
```

Then restart the frontend.

## Core Features

- Resource oracle: tracks inventory, production, and consumption across regions
- Dynamic pricing: adjusts prices from supply-demand signals and supports AMM-style behavior
- Treasury pool: manages cross-region funds and rebalancing
- Dynamic gate logic: models route fee pressure and congestion-aware transfer cost

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- On-chain: Sui Move on testnet
- Wallet integration: `@mysten/dapp-kit`
- Data layer: TanStack Query + EVE Frontier world API

## Local Verification

Frontend checks already passing in the current workspace:

- `npm run lint`
- `npm run build`
