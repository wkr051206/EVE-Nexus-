import { useQuery } from '@tanstack/react-query';
import {
  getPriceRegulator,
  getResourceOracle,
  getTreasuryPool,
  queryEvents,
  suiClient,
} from '../utils';
import { appConfig, hasConfiguredContracts } from '../config';

export const useResourceOracle = () =>
  useQuery({
    queryKey: ['resourceOracle', appConfig.sui.resourceOracleId],
    queryFn: () => getResourceOracle(appConfig.sui.resourceOracleId!),
    enabled: Boolean(appConfig.sui.resourceOracleId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

export const usePriceRegulator = () =>
  useQuery({
    queryKey: ['priceRegulator', appConfig.sui.priceRegulatorId],
    queryFn: () => getPriceRegulator(appConfig.sui.priceRegulatorId!),
    enabled: Boolean(appConfig.sui.priceRegulatorId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

export const useTreasuryPool = () =>
  useQuery({
    queryKey: ['treasuryPool', appConfig.sui.treasuryPoolId],
    queryFn: () => getTreasuryPool(appConfig.sui.treasuryPoolId!),
    enabled: Boolean(appConfig.sui.treasuryPoolId),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

export const usePriceEvents = (limit = 20) =>
  useQuery({
    queryKey: ['priceEvents', appConfig.sui.packageId, limit],
    queryFn: async () => {
      if (!appConfig.sui.packageId) return [];
      try {
        return await queryEvents(
          `${appConfig.sui.packageId}::price_regulator::PriceUpdated`,
          limit,
        );
      } catch {
        return [];
      }
    },
    enabled: Boolean(appConfig.sui.packageId),
    staleTime: 60_000,
  });

export const useFlowEvents = (limit = 20) =>
  useQuery({
    queryKey: ['flowEvents', appConfig.sui.packageId, limit],
    queryFn: async () => {
      if (!appConfig.sui.packageId) return [];
      try {
        return await queryEvents(
          `${appConfig.sui.packageId}::resource_oracle::ResourceFlowRecorded`,
          limit,
        );
      } catch {
        return [];
      }
    },
    enabled: Boolean(appConfig.sui.packageId),
    staleTime: 60_000,
  });

export const useNetworkStatus = () =>
  useQuery({
    queryKey: ['networkStatus'],
    queryFn: async () => {
      const checkpoint = await suiClient.getLatestCheckpointSequenceNumber();
      return { connected: true, checkpoint };
    },
    refetchInterval: 15_000,
    staleTime: 10_000,
    retry: 2,
  });

export const useContractSnapshot = () => {
  const oracle = useResourceOracle();
  const regulator = usePriceRegulator();
  const treasury = useTreasuryPool();

  const isPending =
    (oracle.isPending && !oracle.data) ||
    (regulator.isPending && !regulator.data) ||
    (treasury.isPending && !treasury.data);

  return {
    oracle: oracle.data,
    regulator: regulator.data,
    treasury: treasury.data,
    isLoading: isPending,
    isError: oracle.isError || regulator.isError || treasury.isError,
    hasContracts: hasConfiguredContracts,
    refetch: () => {
      oracle.refetch();
      regulator.refetch();
      treasury.refetch();
    },
  };
};
