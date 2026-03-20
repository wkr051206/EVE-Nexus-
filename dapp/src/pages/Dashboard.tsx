import React, { useCallback, useMemo } from 'react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Activity,
  AlertTriangle, RefreshCw, Map, BarChart3, Clock, Wifi, WifiOff,
} from 'lucide-react';
import { useI18n } from '../i18n';
import {
  useContractSnapshot,
  useNetworkStatus,
  usePriceEvents,
  useFlowEvents,
} from '../hooks/useContractData';
import { useSolarSystems, getResourceTypeIcon, EVE_RESOURCE_TYPES } from '../hooks/useWorldApi';
import { appConfig, hasConfiguredContracts } from '../config';
import { mistToSui } from '../utils';

// Mock fallback data（合约未部署时展示）
const MOCK_PRICE_DATA = [
  { timestamp: '00:00', price: 1.0 },
  { timestamp: '04:00', price: 0.98 },
  { timestamp: '08:00', price: 1.05 },
  { timestamp: '12:00', price: 1.12 },
  { timestamp: '16:00', price: 1.08 },
  { timestamp: '20:00', price: 1.03 },
  { timestamp: '24:00', price: 1.01 },
];

const MOCK_RESOURCE_DATA = [
  { name: 'Region 1', stock: 75000, capacity: 100000, color: '#22d3ee' },
  { name: 'Region 2', stock: 45000, capacity: 60000, color: '#34d399' },
  { name: 'Region 3', stock: 30000, capacity: 50000, color: '#f59e0b' },
  { name: 'Region 4', stock: 60000, capacity: 80000, color: '#f87171' },
];

const MOCK_FLOW_DATA = [
  { from: 'Region 1', to: 'Region 2', amount: 15000 },
  { from: 'Region 2', to: 'Region 3', amount: 8000 },
  { from: 'Region 3', to: 'Region 4', amount: 12000 },
];

const REGION_COLORS = ['#22d3ee', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#fb7185'];

const StatCard: React.FC<{
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  format?: 'number' | 'currency' | 'percentage';
}> = ({ title, value, change, icon, format = 'number' }) => {
  const formattedValue =
    format === 'currency'
      ? Number(value).toLocaleString()
      : format === 'percentage'
        ? `${value}%`
        : Number(value).toLocaleString();

  return (
    <div className="metric-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-400">{title}</p>
          <p className="mt-3 text-3xl font-bold text-white">{formattedValue}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center">
              {change >= 0
                ? <TrendingUp className="h-4 w-4 text-emerald-400" />
                : <TrendingDown className="h-4 w-4 text-rose-400" />}
              <span className={`ml-1 text-sm ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
        <div className="rounded-2xl bg-cyan-400/10 p-3 ring-1 ring-cyan-300/15">{icon}</div>
      </div>
    </div>
  );
};

const ResourceBar: React.FC<{ name: string; stock: number; capacity: number; color: string }> = ({
  name, stock, capacity, color,
}) => {
  const percentage = capacity > 0 ? (stock / capacity) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-white">{name}</span>
        <span className="text-slate-400">{percentage.toFixed(1)}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-white/5">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{stock.toLocaleString()}</span>
        <span>{capacity.toLocaleString()}</span>
      </div>
    </div>
  );
};

// 网络状态指示器
const NetworkBadge: React.FC<{ connected: boolean; checkpoint?: string }> = ({ connected, checkpoint }) => (
  <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${
    connected
      ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
      : 'border-rose-400/30 bg-rose-400/10 text-rose-300'
  }`}>
    {connected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
    <span>{connected ? `Testnet #${checkpoint ?? '...'}` : 'Disconnected'}</span>
  </div>
);

// 合约配置状态提示
const ContractStatusBanner: React.FC = () => {
  if (hasConfiguredContracts) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-4 text-sm text-yellow-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-400" />
      <div>
        <span className="font-medium">合约未配置</span> — 当前显示演示数据。
        请在 <code className="rounded bg-yellow-400/20 px-1">.env</code> 中填写
        <code className="rounded bg-yellow-400/20 px-1 ml-1">VITE_PACKAGE_ID</code> 等合约地址后重启。
        网络：<span className="font-medium">{appConfig.sui.network}</span>
      </div>
    </div>
  );
};

export const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { oracle, regulator, treasury, isLoading, refetch } = useContractSnapshot();
  const { data: networkStatus } = useNetworkStatus();
  const { data: priceEvents } = usePriceEvents(24);
  const { data: flowEvents } = useFlowEvents(10);
  const { data: solarSystems = [] } = useSolarSystems();

  const getSysName = useCallback((id: number | string) => {
    const sys = solarSystems.find((s) => s.id === Number(id));
    return sys?.name ?? `System ${id}`;
  }, [solarSystems]);

  // 从链上数据派生价格趋势
  const priceData = useMemo(() => {
    if (!priceEvents?.length) return MOCK_PRICE_DATA;
    return priceEvents
      .slice()
      .reverse()
      .map((ev, i) => {
        const fields = (ev.parsedJson as any) ?? {};
        const price = fields.new_price ? Number(fields.new_price) / 1000 : 1.0;
        const ts = ev.timestampMs
          ? new Date(Number(ev.timestampMs)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : `T${i}`;
        return { timestamp: ts, price };
      });
  }, [priceEvents]);

  // 从链上数据派生资源分布，名称用 World API 真实星系名 + 真实物品名
  const resourceData = useMemo(() => {
    if (!oracle?.region_resources) return MOCK_RESOURCE_DATA;
    const entries = Object.entries(oracle.region_resources);
    if (!entries.length) return MOCK_RESOURCE_DATA;
    return entries.map(([regionId, res]: [string, any], i) => {
      const typeId = Number(res?.resource_type?.fields?.type_id ?? res?.resource_type?.type_id ?? 0);
      return {
        name: `${getResourceTypeIcon(typeId)} ${getSysName(regionId)}`,
        stock: Number(res?.current_stock ?? 0),
        capacity: Number(res?.max_capacity ?? 1),
        color: REGION_COLORS[i % REGION_COLORS.length],
      };
    });
  }, [getSysName, oracle]);

  // 从链上事件派生资源流转
  const flowData = useMemo(() => {
    if (!flowEvents?.length) return MOCK_FLOW_DATA;
    return flowEvents.slice(0, 5).map((ev) => {
      const f = (ev.parsedJson as any) ?? {};
      return {
        from: getSysName(f.from_region ?? '?'),
        to: getSysName(f.to_region ?? '?'),
        amount: Number(f.amount ?? 0),
      };
    });
  }, [flowEvents, getSysName]);

  // 统计数据
  const stats = useMemo(() => {
    const regionCount = resourceData.length;
    const totalVolume = resourceData.reduce((s, r) => s + r.stock, 0);
    const totalRevenue = treasury ? mistToSui(treasury.total_revenue) : 15234;
    const avgPriceChange =
      priceData.length >= 2
        ? Number(((priceData[priceData.length - 1].price - priceData[0].price) / priceData[0].price * 100).toFixed(1))
        : 2.3;
    return { regionCount, totalVolume, totalRevenue, avgPriceChange };
  }, [resourceData, treasury, priceData]);

  if (isLoading && hasConfiguredContracts && !oracle && !regulator && !treasury) {
    return (
      <div className="page-shell">
        <div className="space-y-6">
          <h1 className="section-title">{t.dashboard.title}</h1>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
            <div className="h-80 animate-pulse rounded-3xl border border-white/10 bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <ContractStatusBanner />

      <div className="hero-panel">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="eyebrow">{t.dashboard.badge}</span>
            <div>
              <h1 className="section-title">{t.dashboard.title}</h1>
              <p className="section-copy">{t.dashboard.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <NetworkBadge
              connected={networkStatus?.connected ?? false}
              checkpoint={networkStatus?.checkpoint}
            />
            <button
              onClick={refetch}
              className="flex items-center space-x-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300"
            >
              <RefreshCw className="h-4 w-4" />
              <span>{t.dashboard.refresh}</span>
            </button>
          </div>
        </div>
        <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t.dashboard.signal}</p>
            <p className="mt-2 text-lg font-semibold text-white">{t.dashboard.signalValue}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t.dashboard.attention}</p>
            <p className="mt-2 text-lg font-semibold text-white">{t.dashboard.attentionValue}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{t.dashboard.action}</p>
            <p className="mt-2 text-lg font-semibold text-white">{t.dashboard.actionValue}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t.dashboard.activeRegions} value={stats.regionCount} icon={<Map className="h-6 w-6 text-cyan-300" />} />
        <StatCard title={t.dashboard.totalVolume} value={stats.totalVolume} change={5.2} icon={<BarChart3 className="h-6 w-6 text-cyan-300" />} format="currency" />
        <StatCard title={t.dashboard.totalRevenue} value={stats.totalRevenue.toFixed(2)} change={3.8} icon={<DollarSign className="h-6 w-6 text-cyan-300" />} format="currency" />
        <StatCard title={t.dashboard.avgPriceChange} value={stats.avgPriceChange} change={stats.avgPriceChange} icon={<TrendingUp className="h-6 w-6 text-cyan-300" />} format="percentage" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-1 text-lg font-semibold text-white">{t.dashboard.priceTrend}</h3>
          <p className="mb-4 text-sm text-slate-400">{t.dashboard.priceTrendDesc}</p>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={priceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis dataKey="timestamp" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(8,15,28,0.95)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '16px' }} />
              <Line type="monotone" dataKey="price" stroke="#22d3ee" strokeWidth={3} dot={{ fill: '#22d3ee' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-1 text-lg font-semibold text-white">{t.dashboard.resourceDistribution}</h3>
          <p className="mb-4 text-sm text-slate-400">{t.dashboard.resourceDistributionDesc}</p>
          <div className="space-y-4">
            {resourceData.map((r) => (
              <ResourceBar key={r.name} name={r.name} stock={r.stock} capacity={r.capacity} color={r.color} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass-card p-6">
          <h3 className="mb-1 text-lg font-semibold text-white">{t.dashboard.resourceFlow}</h3>
          <p className="mb-4 text-sm text-slate-400">{t.dashboard.resourceFlowDesc}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={flowData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
              <XAxis type="number" stroke="#94a3b8" />
              <YAxis dataKey="from" type="category" width={80} stroke="#94a3b8" />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(8,15,28,0.95)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '16px' }}
                formatter={(value) => [`${value} ${t.dashboard.units}`, 'Amount']}
              />
              <Bar dataKey="amount" fill="#38bdf8" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <h3 className="mb-1 text-lg font-semibold text-white">{t.dashboard.systemStatus}</h3>
          <p className="mb-4 text-sm text-slate-400">{t.dashboard.systemStatusDesc}</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center space-x-3">
                {networkStatus?.connected
                  ? <Activity className="h-5 w-5 text-emerald-400" />
                  : <WifiOff className="h-5 w-5 text-rose-400" />}
                <span className="font-medium text-white">{t.dashboard.networkStatus}</span>
              </div>
              <span className={`text-sm ${networkStatus?.connected ? 'text-emerald-400' : 'text-rose-400'}`}>
                {networkStatus?.connected ? t.dashboard.operational : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-sky-400" />
                <span className="font-medium text-white">{t.dashboard.lastUpdated}</span>
              </div>
              <span className="text-sm text-slate-300">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center space-x-3">
                <Activity className="h-5 w-5 text-cyan-400" />
                <span className="font-medium text-white">合约状态</span>
              </div>
              <span className={`text-sm ${hasConfiguredContracts ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {hasConfiguredContracts ? '已配置' : '演示模式'}
              </span>
            </div>
            {treasury && (
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-emerald-400" />
                  <span className="font-medium text-white">金库余额</span>
                </div>
                <span className="text-sm text-emerald-400">
                  {mistToSui(treasury.global_balance).toFixed(4)} SUI
                </span>
              </div>
            )}
            {/* EVE Frontier 真实资源类型 */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="mb-2 text-xs font-medium text-slate-400 uppercase tracking-widest">游戏资源类型</p>
              <div className="grid grid-cols-2 gap-2">
                {EVE_RESOURCE_TYPES.map((rt) => (
                  <div key={rt.typeId} className="flex items-center gap-2 text-xs text-slate-300">
                    <span>{rt.icon}</span>
                    <span>{rt.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
