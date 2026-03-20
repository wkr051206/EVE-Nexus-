// Region types
export interface RegionID {
  id: number;
}

export interface ResourceType {
  type_id: number;
}

// ResourceOracle types
export interface RegionResource {
  region_id: RegionID;
  resource_type: ResourceType;
  current_stock: number;
  max_capacity: number;
  consumption_rate: number;
  production_rate: number;
  last_updated: number;
  supply_demand_ratio: number;
}

export interface ResourceFlow {
  from_region: RegionID;
  to_region: RegionID;
  resource_type: ResourceType;
  amount: number;
  timestamp: number;
}

export interface ResourceOracle {
  id: string;
  region_resources: Record<string, RegionResource>;
  flow_records: ResourceFlow[];
  price_triggers: Record<string, number>;
  oracle_admin: string;
}

// PriceRegulator types
export interface PricingModel {
  model_type: number;
}

export interface PriceData {
  region_id: RegionID;
  resource_type: ResourceType;
  base_price: number;
  current_price: number;
  pricing_model: PricingModel;
  last_updated: number;
  price_change_history: PriceChange[];
}

export interface PriceChange {
  old_price: number;
  new_price: number;
  change_reason: number;
  timestamp: number;
}

export interface AMMPool {
  id: string;
  region_id: RegionID;
  resource_type: ResourceType;
  token_reserve: number;
  resource_reserve: number;
  k_constant: number;
  fee_rate_bps: number;
  pool_admin: string;
}

export interface PricingParams {
  max_price_change_percent: number;
  price_update_interval_ms: number;
  demand_elasticity_factor: number;
  regional_disparity_factor: number;
}

export interface PriceRegulator {
  id: string;
  price_data: Record<string, PriceData>;
  amm_pools: Record<string, AMMPool>;
  pricing_params: PricingParams;
  regulator_admin: string;
}

// TreasuryPool types
export interface RegionTreasury {
  id: string;
  region_id: RegionID;
  balance: number;
  total_deposited: number;
  total_withdrawn: number;
  auto_rebalance_enabled: boolean;
  min_balance_threshold: number;
  max_balance_threshold: number;
  last_rebalanced: number;
}

export interface RevenueShare {
  recipient: string;
  share_percentage: number;
  is_active: boolean;
}

export interface RebalanceConfig {
  enabled: boolean;
  interval_ms: number;
  threshold_percentage: number;
  max_transfer_amount: number;
  transfer_fee_bps: number;
}

export interface TreasuryPool {
  id: string;
  region_treasuries: Record<string, RegionTreasury>;
  revenue_shares: RevenueShare[];
  global_balance: number;
  auto_rebalance_config: RebalanceConfig;
  treasury_admin: string;
  total_revenue: number;
  total_distributed: number;
}

// DynamicGate types
export interface DynamicFeeConfig {
  base_fee: number;
  congestion_multiplier: number;
  demand_elasticity_factor: number;
  time_based_discount: boolean;
  rush_hour_surcharge: number;
  off_peak_discount: number;
  membership_discount_table: Record<number, number>;
}

export interface GateTrafficStats {
  gate_id: string;
  region_id: RegionID;
  total_jumps: number;
  jumps_last_hour: number;
  jumps_last_day: number;
  congestion_level: number;
  last_jump_time: number;
  hourly_jump_records: number[];
}

export interface PriorityPass {
  id: string;
  owner: string;
  gate_id: string;
  priority_level: number;
  validity_period_ms: number;
  created_at: number;
  usage_count: number;
  max_usage: number;
}

export interface DynamicGateExt {
  id: string;
  gate_id: string;
  fee_config: DynamicFeeConfig;
  traffic_stats: GateTrafficStats;
  active_priority_passes: Record<string, PriorityPass>;
  treasury_id: string;
  last_fee_update: number;
  revenue_collected: number;
  extension_admin: string;
}

// System types
export interface EconomicRegulatorSystem {
  id: string;
  resource_oracle: string;
  price_regulator: string;
  treasury_pool: string;
  system_admin: string;
  is_initialized: boolean;
}

// UI types
export interface DashboardStats {
  totalRegions: number;
  totalVolume: number;
  totalRevenue: number;
  avgPriceChange: number;
  congestionLevel: number;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface PriceHistory {
  region_id: string;
  data: ChartDataPoint[];
}

export interface ResourceFlowData {
  from_region: string;
  to_region: string;
  amount: number;
  timestamp: number;
}

// API types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Event types
export interface ResourceDataUpdatedEvent {
  region_id: RegionID;
  resource_type: ResourceType;
  new_stock: number;
  supply_demand_ratio: number;
}

export interface PriceUpdatedEvent {
  region_id: RegionID;
  resource_type: ResourceType;
  old_price: number;
  new_price: number;
  change_reason: number;
}

export interface FundsDepositedEvent {
  region_id: RegionID;
  amount: number;
  sender: string;
}

export interface FundsWithdrawnEvent {
  region_id: RegionID;
  amount: number;
  recipient: string;
}

export interface PriorityJumpEvent {
  gate_id: string;
  character: string;
  priority_level: number;
  fee_paid: number;
  discount_applied: number;
  timestamp: number;
}

// Form types
export interface CreateRegionForm {
  region_id: number;
  resource_type_id: number;
  initial_stock: number;
  max_capacity: number;
  consumption_rate: number;
  production_rate: number;
  price_trigger_threshold: number;
  min_balance_threshold: number;
  max_balance_threshold: number;
}

export interface UpdatePriceForm {
  region_id: number;
  new_base_price: number;
  pricing_model: number;
}

export interface TransferFundsForm {
  from_region: number;
  to_region: number;
  amount: number;
}

export interface CreatePriorityPassForm {
  owner: string;
  priority_level: number;
  validity_period_days: number;
  max_usage: number;
}