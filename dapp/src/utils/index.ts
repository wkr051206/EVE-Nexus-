import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { appConfig } from '../config';
import type {
  EconomicRegulatorSystem,
  PriceRegulator,
  ResourceOracle,
  TreasuryPool,
} from '../types';

export { Transaction };

let _suiClient: SuiClient | null = null;

export const getSuiClient = (): SuiClient => {
  if (!_suiClient) {
    _suiClient = new SuiClient({ url: appConfig.sui.rpcUrl });
  }
  return _suiClient;
};

export const suiClient = getSuiClient();

export const CONTRACT_ADDRESSES = {
  DYNAMIC_ECONOMIC_REGULATOR: appConfig.sui.packageId ?? '',
  RESOURCE_ORACLE: appConfig.sui.resourceOracleId ?? '',
  PRICE_REGULATOR: appConfig.sui.priceRegulatorId ?? '',
  TREASURY_POOL: appConfig.sui.treasuryPoolId ?? '',
} as const;

export type ContractSnapshot = {
  resourceOracle?: ResourceOracle;
  priceRegulator?: PriceRegulator;
  treasuryPool?: TreasuryPool;
  system?: EconomicRegulatorSystem;
};

export const mistToSui = (mist: number): number => mist / 1_000_000_000;
export const suiToMist = (sui: number): number => Math.floor(sui * 1_000_000_000);

export const formatNumber = (num: number): string => num.toLocaleString();
export const formatSui = (amount: number): string => `${mistToSui(amount).toFixed(4)} SUI`;
export const formatTimestamp = (timestamp: number): string => new Date(timestamp).toLocaleString();

export const calculatePercentageChange = (oldValue: number, newValue: number): number => {
  if (oldValue === 0) return newValue > 0 ? 100 : 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

export const shortenAddress = (address: string, chars = 6): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const isValidSuiAddress = (address: string): boolean =>
  /^0x[a-fA-F0-9]{40,}$/.test(address);

export const getObjectData = async (objectId: string) => {
  try {
    const object = await suiClient.getObject({
      id: objectId,
      options: { showContent: true, showOwner: true },
    });
    return object.data;
  } catch (error) {
    console.error('Error fetching object data:', error);
    throw error;
  }
};

export const getMultipleObjectsData = async (objectIds: string[]) => {
  try {
    const objects = await suiClient.multiGetObjects({
      ids: objectIds,
      options: { showContent: true, showOwner: true },
    });
    return objects.map((obj) => obj.data);
  } catch (error) {
    console.error('Error fetching multiple objects:', error);
    throw error;
  }
};

export const queryEvents = async (eventType: string, limit = 50) => {
  try {
    const events = await suiClient.queryEvents({
      query: { MoveEventType: eventType },
      limit,
      order: 'descending',
    });
    return events.data;
  } catch (error) {
    console.error('Error querying events:', error);
    throw error;
  }
};

const readTableEntries = async (tableId: string): Promise<Record<string, any>> => {
  const result: Record<string, any> = {};
  let cursor: string | null | undefined;
  const allFields: any[] = [];

  do {
    const page = await suiClient.getDynamicFields({ parentId: tableId, cursor });
    allFields.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);

  await Promise.all(allFields.map(async (field) => {
    const keyId = (field.name as any)?.value?.id ?? String(field.name);
    const fieldObj = await suiClient.getDynamicFieldObject({
      parentId: tableId,
      name: field.name,
    });
    const value = (fieldObj.data?.content as any)?.fields?.value?.fields ?? null;
    if (value) result[keyId] = value;
  }));

  return result;
};

export const getResourceOracle = async (oracleId: string): Promise<ResourceOracle | null> => {
  try {
    const data = await getObjectData(oracleId);
    if (!data?.content || data.content.dataType !== 'moveObject') return null;
    const fields = (data.content as any).fields;

    let region_resources: Record<string, any> = {};
    const tableId = fields?.region_resources?.fields?.id?.id;
    if (tableId) {
      region_resources = await readTableEntries(tableId);
    }

    return {
      id: oracleId,
      region_resources,
      flow_records: fields?.flow_records ?? [],
      price_triggers: fields?.price_triggers ?? {},
      oracle_admin: fields?.oracle_admin ?? '',
    };
  } catch {
    return null;
  }
};

export const getPriceRegulator = async (regulatorId: string): Promise<PriceRegulator | null> => {
  try {
    const data = await getObjectData(regulatorId);
    if (!data?.content || data.content.dataType !== 'moveObject') return null;
    const fields = (data.content as any).fields;

    let price_data: Record<string, any> = {};
    const priceTableId = fields?.price_data?.fields?.id?.id;
    if (priceTableId) {
      price_data = await readTableEntries(priceTableId);
    }

    let amm_pools: Record<string, any> = {};
    const ammTableId = fields?.amm_pools?.fields?.id?.id;
    if (ammTableId) {
      amm_pools = await readTableEntries(ammTableId);
    }

    return {
      id: regulatorId,
      price_data,
      amm_pools,
      pricing_params: fields?.pricing_params?.fields ?? fields?.pricing_params ?? {
        max_price_change_percent: 500,
        price_update_interval_ms: 300000,
        demand_elasticity_factor: 150,
        regional_disparity_factor: 120,
      },
      regulator_admin: fields?.regulator_admin ?? '',
    };
  } catch {
    return null;
  }
};

export const getTreasuryPool = async (poolId: string): Promise<TreasuryPool | null> => {
  try {
    const data = await getObjectData(poolId);
    if (!data?.content || data.content.dataType !== 'moveObject') return null;
    const fields = (data.content as any).fields;

    let region_treasuries: Record<string, any> = {};
    const tableId = fields?.region_treasuries?.fields?.id?.id;
    if (tableId) {
      region_treasuries = await readTableEntries(tableId);
    }

    const globalBalanceRaw = fields?.global_balance;
    const global_balance = Number(globalBalanceRaw?.fields?.value ?? globalBalanceRaw ?? 0);

    return {
      id: poolId,
      region_treasuries,
      revenue_shares: fields?.revenue_shares ?? [],
      global_balance,
      auto_rebalance_config: fields?.auto_rebalance_config?.fields ?? fields?.auto_rebalance_config ?? {
        enabled: false,
        interval_ms: 3600000,
        threshold_percentage: 500,
        max_transfer_amount: 0,
        transfer_fee_bps: 10,
      },
      treasury_admin: fields?.treasury_admin ?? '',
      total_revenue: Number(fields?.total_revenue ?? 0),
      total_distributed: Number(fields?.total_distributed ?? 0),
    };
  } catch {
    return null;
  }
};

export const buildUpdateResourceTx = (
  packageId: string,
  oracleId: string,
  regionId: number,
  resourceTypeId: number,
  newStock: number,
  consumptionRate: number,
  productionRate: number,
): Transaction => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::resource_oracle::update_resource_data`,
    arguments: [
      tx.object(oracleId),
      tx.pure.u64(regionId),
      tx.pure.u8(resourceTypeId),
      tx.pure.u64(newStock),
      tx.pure.u64(consumptionRate),
      tx.pure.u64(productionRate),
    ],
  });
  return tx;
};

export const buildCrossRegionTransferTx = (
  packageId: string,
  treasuryId: string,
  fromRegion: number,
  toRegion: number,
  amount: number,
): Transaction => {
  const tx = new Transaction();
  tx.moveCall({
    target: `${packageId}::treasury_pool::cross_region_transfer`,
    arguments: [
      tx.object(treasuryId),
      tx.pure.u64(fromRegion),
      tx.pure.u64(toRegion),
      tx.pure.u64(amount),
    ],
  });
  return tx;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const getValueColor = (
  value: number,
  min: number,
  max: number,
  colors = ['#ef4444', '#f59e0b', '#10b981'],
): string => {
  const ratio = (value - min) / (max - min);
  const index = Math.floor(ratio * (colors.length - 1));
  return colors[Math.max(0, Math.min(colors.length - 1, index))];
};
