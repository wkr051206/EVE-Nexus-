#!/bin/bash
# EVE Frontier Dynamic Economic Regulator — 部署脚本
# 用法: ./scripts/deploy.sh [testnet|devnet]
# 依赖: sui CLI 已安装并配置好测试网账户

set -e

NETWORK=${1:-testnet}
CONTRACTS_DIR="$(dirname "$0")/../move-contracts"
OUTPUT_FILE="/tmp/der_publish_output.json"

echo "=== 部署到 $NETWORK ==="

# 1. 编译合约
echo "[1/4] 编译 Move 合约..."
sui move build --path "$CONTRACTS_DIR" -e "$NETWORK"

# 2. 发布合约
echo "[2/4] 发布合约..."
sui client publish --path "$CONTRACTS_DIR" \
  --gas-budget 200000000 \
  --json > "$OUTPUT_FILE" 2>&1

cat "$OUTPUT_FILE"

# 3. 提取关键对象 ID
echo ""
echo "[3/4] 提取对象 ID..."

PACKAGE_ID=$(python3 -c "
import json, sys
data = json.load(open('$OUTPUT_FILE'))
for obj in data.get('objectChanges', []):
    if obj.get('type') == 'published':
        print(obj['packageId'])
        break
" 2>/dev/null || echo "")

SYSTEM_ID=$(python3 -c "
import json, sys
data = json.load(open('$OUTPUT_FILE'))
for obj in data.get('objectChanges', []):
    t = obj.get('objectType', '')
    if 'EconomicRegulatorSystem' in t and obj.get('type') == 'created':
        print(obj['objectId'])
        break
" 2>/dev/null || echo "")

ORACLE_ID=$(python3 -c "
import json, sys
data = json.load(open('$OUTPUT_FILE'))
for obj in data.get('objectChanges', []):
    t = obj.get('objectType', '')
    if 'ResourceOracle' in t and obj.get('type') == 'created':
        print(obj['objectId'])
        break
" 2>/dev/null || echo "")

REGULATOR_ID=$(python3 -c "
import json, sys
data = json.load(open('$OUTPUT_FILE'))
for obj in data.get('objectChanges', []):
    t = obj.get('objectType', '')
    if 'PriceRegulator' in t and obj.get('type') == 'created':
        print(obj['objectId'])
        break
" 2>/dev/null || echo "")

TREASURY_ID=$(python3 -c "
import json, sys
data = json.load(open('$OUTPUT_FILE'))
for obj in data.get('objectChanges', []):
    t = obj.get('objectType', '')
    if 'TreasuryPool' in t and obj.get('type') == 'created':
        print(obj['objectId'])
        break
" 2>/dev/null || echo "")

ADMIN_CAP_ID=$(python3 -c "
import json, sys
data = json.load(open('$OUTPUT_FILE'))
for obj in data.get('objectChanges', []):
    t = obj.get('objectType', '')
    if 'SystemAdminCap' in t and obj.get('type') == 'created':
        print(obj['objectId'])
        break
" 2>/dev/null || echo "")

if [ -z "$PACKAGE_ID" ]; then
  echo "❌ 无法提取 Package ID，请检查 $OUTPUT_FILE"
  exit 1
fi

# 4. 调用 wire_subsystems 绑定子系统
echo "[4/4] 绑定子系统对象..."
if [ -n "$SYSTEM_ID" ] && [ -n "$ORACLE_ID" ] && [ -n "$REGULATOR_ID" ] && [ -n "$TREASURY_ID" ] && [ -n "$ADMIN_CAP_ID" ]; then
  sui client call \
    --package "$PACKAGE_ID" \
    --module init \
    --function wire_subsystems \
    --args "$SYSTEM_ID" "$ADMIN_CAP_ID" "$ORACLE_ID" "$REGULATOR_ID" "$TREASURY_ID" \
    --gas-budget 10000000
  echo "✅ 子系统绑定完成"
else
  echo "⚠️  部分对象 ID 未找到，请手动调用 wire_subsystems"
fi

echo ""
echo "=== 部署完成 ==="
echo ""
echo "请将以下内容填入 dapp/.env："
echo "VITE_PACKAGE_ID=$PACKAGE_ID"
echo "VITE_SYSTEM_OBJECT_ID=${SYSTEM_ID:-<未找到>}"
echo "VITE_RESOURCE_ORACLE_ID=${ORACLE_ID:-<未找到>}"
echo "VITE_PRICE_REGULATOR_ID=${REGULATOR_ID:-<未找到>}"
echo "VITE_TREASURY_POOL_ID=${TREASURY_ID:-<未找到>}"
