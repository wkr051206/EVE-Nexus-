#!/bin/bash
# 初始化合约状态脚本（部署后运行）
# 用法: PACKAGE_ID=0x... SYSTEM_ID=0x... ./scripts/init.sh

set -e

: "${PACKAGE_ID:?需要设置 PACKAGE_ID}"
: "${SYSTEM_ID:?需要设置 SYSTEM_ID}"

NETWORK=${NETWORK:-testnet}
GAS_BUDGET=50000000

echo "=== 初始化 Economic Regulator System ==="
echo "Package: $PACKAGE_ID"
echo "System:  $SYSTEM_ID"
echo "Network: $NETWORK"

# 查询系统对象，找到子对象 ID
echo ""
echo "查询系统对象..."
sui client object "$SYSTEM_ID" --json | python3 -c "
import json, sys
data = json.load(sys.stdin)
fields = data.get('content', {}).get('fields', {})
print('ResourceOracle ID:', fields.get('resource_oracle', {}).get('id', {}).get('id', 'N/A'))
print('PriceRegulator ID:', fields.get('price_regulator', {}).get('id', {}).get('id', 'N/A'))
print('TreasuryPool ID:  ', fields.get('treasury_pool', {}).get('id', {}).get('id', 'N/A'))
" 2>/dev/null || echo "请手动查询: sui client object $SYSTEM_ID"

echo ""
echo "将上述 ID 填入 dapp/.env:"
echo "  VITE_RESOURCE_ORACLE_ID=<ResourceOracle ID>"
echo "  VITE_PRICE_REGULATOR_ID=<PriceRegulator ID>"
echo "  VITE_TREASURY_POOL_ID=<TreasuryPool ID>"
