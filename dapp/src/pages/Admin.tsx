import React, { useCallback, useMemo, useState } from 'react';
import {
  Edit, Trash2, RefreshCw, AlertCircle, CheckCircle,
  Users, DollarSign, Activity, TrendingUp,
} from 'lucide-react';
import { useI18n } from '../i18n';
import { useContractSnapshot } from '../hooks/useContractData';
import { useSolarSystems, getResourceTypeName, getResourceTypeIcon } from '../hooks/useWorldApi';
import { hasConfiguredContracts } from '../config';
import { mistToSui } from '../utils';
import { CreateRegionDialog } from '../components/CreateRegionDialog';


const StatCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}> = ({ title, value, icon, trend }) => (
  <div className="metric-card">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <p className="mt-3 text-3xl font-bold text-white">{value}</p>
        {trend && (
          <div className="mt-1 flex items-center">
            <TrendingUp className={`h-4 w-4 ${trend.isPositive ? 'text-emerald-400' : 'rotate-180 text-rose-400'}`} />
            <span className={`ml-1 text-sm ${trend.isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{Math.abs(trend.value)}%</span>
          </div>
        )}
      </div>
      <div className="rounded-2xl bg-cyan-400/10 p-3 ring-1 ring-cyan-300/15">{icon}</div>
    </div>
  </div>
);


export const Admin: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'regions' | 'pricing' | 'treasury'>('overview');
  const { t, language } = useI18n();
  const { oracle, regulator, treasury, isLoading, refetch } = useContractSnapshot();
  const { data: solarSystems = [] } = useSolarSystems();

  const getSysName = useCallback((id: number | string) => {
    const sys = solarSystems.find((s) => s.id === Number(id));
    return sys?.name ?? `System ${id}`;
  }, [solarSystems]);

  // 从链上数据派生区域列表
  // region_resources 的 key 是 regionId 字符串，value 是链上 RegionResource fields
  const regions = useMemo(() => {
    if (!oracle?.region_resources) return [];
    return Object.entries(oracle.region_resources)
      .filter(([id]) => id && !isNaN(Number(id)))
      .map(([id, res]: [string, any]) => {
        const typeId = res?.resource_type?.type_id ?? res?.resource_type?.fields?.type_id ?? 0;
        return {
          id: Number(id),
          name: getSysName(id),
          resourceType: `${getResourceTypeIcon(Number(typeId))} ${getResourceTypeName(Number(typeId))}`,
          stock: Number(res?.current_stock ?? 0),
          capacity: Number(res?.max_capacity ?? 0),
          status: 'Active' as const,
        };
      });
  }, [getSysName, oracle]);

  // 从链上数据派生定价列表
  const pricing = useMemo(() => {
    if (!regulator?.price_data) return [];
    return Object.entries(regulator.price_data)
      .filter(([id]) => id && !isNaN(Number(id)))
      .map(([id, pd]: [string, any]) => {
        // pricing_model 是嵌套 struct: { type: "...", fields: { model_type: 0 } }
        const modelType = pd?.pricing_model?.fields?.model_type ?? pd?.pricing_model?.model_type ?? pd?.is_dynamic;
        const isDynamic = modelType === 0 || modelType === true || modelType === 'Dynamic';
        return {
          regionId: Number(id),
          currentPrice: Number(pd?.current_price ?? 0) / 1000,
          basePrice: Number(pd?.base_price ?? 0) / 1000,
          model: isDynamic ? 'Dynamic' : 'Fixed',
        };
      });
  }, [regulator]);

  // 从链上数据派生金库列表
  const treasuries = useMemo(() => {
    if (!treasury?.region_treasuries) return [];
    return Object.entries(treasury.region_treasuries)
      .filter(([id]) => id && !isNaN(Number(id)))
      .map(([id, tr]: [string, any]) => {
        // balance 是 Balance<SUI> struct: { type: "...", fields: { value: "123" } }
        const balanceRaw = Number(tr?.balance?.fields?.value ?? tr?.balance ?? 0);
        return {
          regionId: Number(id),
          balance: mistToSui(balanceRaw),
          minThreshold: mistToSui(Number(tr?.min_balance_threshold ?? 0)),
          maxThreshold: mistToSui(Number(tr?.max_balance_threshold ?? 0)),
        };
      });
  }, [treasury]);

  const stats = {
    totalUsers: regions.length || 4,
    dailyVolume: treasury ? mistToSui(treasury.total_revenue) : 2847392,
    activeRegions: regions.filter((r) => r.status === 'Active').length || 4,
    systemHealth: t.admin.good,
  };

  const TABS = [
    { id: 'overview', label: t.admin.overview },
    { id: 'regions', label: t.admin.regions },
    { id: 'pricing', label: t.admin.pricing },
    { id: 'treasury', label: t.admin.treasury },
  ] as const;

  // 使用 mock 数据作为 fallback（合约未配置时）
  const displayRegions = regions.length ? regions : [
    { id: 30000001, name: solarSystems[0]?.name ?? 'A 2560',   resourceType: '🌑 Crude Matter',      stock: 75000, capacity: 100000, status: 'Active' },
    { id: 30000002, name: solarSystems[1]?.name ?? 'M 974',    resourceType: '💎 Sophrogon',          stock: 45000, capacity: 60000,  status: 'Active' },
    { id: 30000003, name: solarSystems[2]?.name ?? 'U 3183',   resourceType: '🔷 Feldspar Crystals',  stock: 30000, capacity: 50000,  status: 'Maintenance' },
    { id: 30000004, name: solarSystems[3]?.name ?? 'O3H-1FN',  resourceType: '📡 Feral Data',         stock: 60000, capacity: 80000,  status: 'Active' },
  ];
  const displayPricing = pricing.length ? pricing : [
    { regionId: 1, currentPrice: 1.05, basePrice: 1.0, model: 'Dynamic' },
    { regionId: 2, currentPrice: 1.12, basePrice: 1.1, model: 'Dynamic' },
    { regionId: 3, currentPrice: 0.98, basePrice: 1.0, model: 'Fixed' },
    { regionId: 4, currentPrice: 1.08, basePrice: 1.05, model: 'Dynamic' },
  ];
  const displayTreasuries = treasuries.length ? treasuries : [
    { regionId: 1, balance: 15234.5, minThreshold: 1000, maxThreshold: 10000 },
    { regionId: 2, balance: 8921.3, minThreshold: 800, maxThreshold: 8000 },
    { regionId: 3, balance: 5643.2, minThreshold: 500, maxThreshold: 5000 },
    { regionId: 4, balance: 12456.8, minThreshold: 1200, maxThreshold: 12000 },
  ];

  return (
    <div className="page-shell">
      <div className="hero-panel">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">{t.admin.badge}</span>
            <h1 className="mt-4 text-3xl font-bold text-white md:text-4xl">{t.admin.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300">{t.admin.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              刷新
            </button>
            <CreateRegionDialog onCreated={refetch} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard title={t.admin.totalUsers} value={stats.totalUsers} icon={<Users className="h-6 w-6 text-cyan-300" />} trend={{ value: 12.5, isPositive: true }} />
        <StatCard title={t.admin.dailyVolume} value={stats.dailyVolume.toFixed(2)} icon={<DollarSign className="h-6 w-6 text-cyan-300" />} trend={{ value: 8.3, isPositive: true }} />
        <StatCard title={t.admin.activeRegions} value={stats.activeRegions} icon={<Activity className="h-6 w-6 text-cyan-300" />} />
        <StatCard
          title={t.admin.systemHealth}
          value={hasConfiguredContracts ? stats.systemHealth : '演示'}
          icon={hasConfiguredContracts ? <CheckCircle className="h-6 w-6 text-emerald-400" /> : <AlertCircle className="h-6 w-6 text-yellow-400" />}
        />
      </div>

      <div className="rounded-full border border-white/10 bg-slate-950/45 px-4 py-2">
        <nav className="flex space-x-3 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="glass-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">{t.admin.recentActivity}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span>{t.admin.activity1}</span><span className="text-slate-400">{t.admin.minutesAgo2}</span></div>
                <div className="flex justify-between"><span>{t.admin.activity2}</span><span className="text-slate-400">{t.admin.minutesAgo5}</span></div>
                <div className="flex justify-between"><span>{t.admin.activity3}</span><span className="text-slate-400">{t.admin.minutesAgo12}</span></div>
                <div className="flex justify-between"><span>{t.admin.activity4}</span><span className="text-slate-400">{t.admin.hourAgo1}</span></div>
              </div>
            </div>
            <div className="glass-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-white">{t.admin.systemAlerts}</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3 rounded-2xl border border-yellow-300/20 bg-yellow-400/10 p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 text-yellow-400" />
                  <div>
                    <p className="text-sm font-medium text-yellow-100">{t.admin.highCongestionWarning}</p>
                    <p className="text-xs text-yellow-200/75">{t.admin.highCongestionBody}</p>
                  </div>
                </div>
                {!hasConfiguredContracts && (
                  <div className="flex items-start space-x-3 rounded-2xl border border-sky-300/20 bg-sky-400/10 p-3">
                    <Activity className="mt-0.5 h-5 w-5 text-sky-300" />
                    <div>
                      <p className="text-sm font-medium text-sky-100">演示模式</p>
                      <p className="text-xs text-sky-200/75">合约未部署，显示模拟数据。部署后在 .env 配置合约地址。</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'regions' && (
          <div className="glass-card overflow-hidden">
            <div className="border-b border-white/10 p-6"><h3 className="text-lg font-semibold text-white">{t.admin.regionManagement}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    {[t.admin.name, t.admin.resourceType, t.admin.stock, t.admin.capacity, t.admin.status, t.admin.actions].map((h) => (
                      <th key={h} className="p-4 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRegions.map((r) => (
                    <tr key={r.id} className="border-b border-white/5">
                      <td className="p-4 font-medium">{r.name}</td>
                      <td className="p-4">{r.resourceType}</td>
                      <td className="p-4">{r.stock.toLocaleString()}</td>
                      <td className="p-4">{r.capacity.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${r.status === 'Active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-yellow-400/15 text-yellow-300'}`}>
                          {r.status === 'Active' ? t.admin.active : t.admin.maintenance}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex space-x-2">
                          <button className="rounded-full p-2 hover:bg-white/5" aria-label="edit"><Edit className="h-4 w-4" /></button>
                          <button className="rounded-full p-2 hover:bg-white/5" aria-label="delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="glass-card overflow-hidden">
            <div className="border-b border-white/10 p-6"><h3 className="text-lg font-semibold text-white">{t.admin.pricingConfig}</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    {[t.admin.regions, t.admin.currentPrice, t.admin.basePrice, t.admin.model, t.admin.actions].map((h) => (
                      <th key={h} className="p-4 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayPricing.map((p) => {
                    const region = displayRegions.find((r) => r.id === p.regionId);
                    const modelLabel = language === 'zh' ? (p.model === 'Dynamic' ? '动态' : '固定') : p.model;
                    return (
                      <tr key={p.regionId} className="border-b border-white/5">
                        <td className="p-4 font-medium">{region?.name ?? getSysName(p.regionId)}</td>
                        <td className="p-4">{p.currentPrice.toFixed(4)}</td>
                        <td className="p-4">{p.basePrice.toFixed(4)}</td>
                        <td className="p-4">
                          <span className={`rounded-full px-2 py-1 text-xs font-medium ${p.model === 'Dynamic' ? 'bg-cyan-400/15 text-cyan-200' : 'bg-slate-400/15 text-slate-300'}`}>
                            {modelLabel}
                          </span>
                        </td>
                        <td className="p-4"><button className="rounded-full p-2 hover:bg-white/5" aria-label="edit"><Edit className="h-4 w-4" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'treasury' && (
          <div className="glass-card overflow-hidden">
            <div className="border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{t.admin.treasuryManagement}</h3>
                {treasury && (
                  <span className="text-sm text-slate-400">
                    总余额: <span className="text-cyan-300">{mistToSui(treasury.global_balance).toFixed(4)} SUI</span>
                  </span>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-white/10 bg-white/5">
                  <tr>
                    {[t.admin.regions, t.admin.balance, t.admin.minThreshold, t.admin.maxThreshold, t.admin.actions].map((h) => (
                      <th key={h} className="p-4 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayTreasuries.map((tr) => {
                    const region = displayRegions.find((r) => r.id === tr.regionId);
                    const isBelowMin = tr.balance < tr.minThreshold;
                    return (
                      <tr key={tr.regionId} className="border-b border-white/5">
                        <td className="p-4 font-medium">{region?.name ?? getSysName(tr.regionId)}</td>
                        <td className={`p-4 ${isBelowMin ? 'text-rose-400' : ''}`}>{tr.balance.toFixed(4)}</td>
                        <td className="p-4">{tr.minThreshold.toFixed(4)}</td>
                        <td className="p-4">{tr.maxThreshold.toFixed(4)}</td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <button className="rounded-full p-2 hover:bg-white/5" aria-label="edit"><Edit className="h-4 w-4" /></button>
                            {isBelowMin && <button className="rounded-full p-2 hover:bg-white/5 text-yellow-400" aria-label="rebalance"><DollarSign className="h-4 w-4" /></button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
