import { getFullnodeUrl } from '@mysten/sui/client';

type SuiNetwork = 'mainnet' | 'testnet' | 'devnet' | 'localnet';

const envNetwork = (import.meta.env.VITE_SUI_NETWORK as SuiNetwork | undefined) ?? 'testnet';
const defaultRpcUrl = getFullnodeUrl(envNetwork);

const envValue = (value?: string) => {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const appConfig = {
  sui: {
    network: envNetwork,
    rpcUrl: envValue(import.meta.env.VITE_SUI_RPC_URL) ?? defaultRpcUrl,
    packageId: envValue(import.meta.env.VITE_PACKAGE_ID),
    resourceOracleId: envValue(import.meta.env.VITE_RESOURCE_ORACLE_ID),
    priceRegulatorId: envValue(import.meta.env.VITE_PRICE_REGULATOR_ID),
    treasuryPoolId: envValue(import.meta.env.VITE_TREASURY_POOL_ID),
    systemObjectId: envValue(import.meta.env.VITE_SYSTEM_OBJECT_ID),
    oracleAdminCap: envValue(import.meta.env.VITE_ORACLE_ADMIN_CAP),
    treasuryAdminCap: envValue(import.meta.env.VITE_TREASURY_ADMIN_CAP),
    regulatorAdminCap: envValue(import.meta.env.VITE_REGULATOR_ADMIN_CAP),
    systemAdminCap: envValue(import.meta.env.VITE_SYSTEM_ADMIN_CAP),
  },
  game: {
    apiUrl: envValue(import.meta.env.VITE_EVE_API_URL),
    statusUrl: envValue(import.meta.env.VITE_EVE_STATUS_URL),
    graphqlUrl: envValue(import.meta.env.VITE_EVE_GRAPHQL_URL),
    environment: envValue(import.meta.env.VITE_EVE_ENVIRONMENT) ?? 'test',
  },
} as const;

export const hasConfiguredContracts =
  Boolean(appConfig.sui.packageId) &&
  Boolean(appConfig.sui.resourceOracleId) &&
  Boolean(appConfig.sui.priceRegulatorId) &&
  Boolean(appConfig.sui.treasuryPoolId);

export const hasConfiguredGameApi =
  Boolean(appConfig.game.apiUrl || appConfig.game.statusUrl || appConfig.game.graphqlUrl);
