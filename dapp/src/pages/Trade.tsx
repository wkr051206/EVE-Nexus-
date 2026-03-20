import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, DollarSign, Clock, MapPin, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { useI18n } from '../i18n';
import { useContractSnapshot } from '../hooks/useContractData';
import { useSolarSystems, getSolarSystemName, getResourceTypeName, getResourceTypeIcon } from '../hooks/useWorldApi';
import { appConfig, hasConfiguredContracts } from '../config';
import { suiToMist, Transaction, suiClient } from '../utils';

const tradeFormSchema = z.object({
  fromRegion: z.number().min(1),
  toRegion: z.number().min(1),
  amount: z.number().min(1),
  usePriorityPass: z.boolean().default(false),
});
type TradeFormData = z.infer<typeof tradeFormSchema>;

type CongestionLevel = 'Low' | 'Medium' | 'High';
interface TradeEstimate {
  totalFee: number;
  estimatedTime: string;
  congestionLevel: CongestionLevel;
  discountApplied: number;
  baseFeePerUnit: number;
}

const CONGESTION_COLOR: Record<CongestionLevel, string> = {
  Low: 'text-emerald-400',
  Medium: 'text-yellow-400',
  High: 'text-rose-400',
};

// 根据两个星系的 3D 坐标计算距离，用于估算费用
const calcDistance = (
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number }
): number => {
  const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
};

// 距离归一化为费率（0.01 ~ 0.2 SUI/单位）
const distanceToFeeRate = (distance: number): number => {
  // EVE 坐标单位很大，归一化到合理范围
  const normalized = Math.min(distance / 1e20, 1);
  return 0.01 + normalized * 0.19;
};

// 距离归一化为预计时间
const distanceToTime = (distance: number): string => {
  const normalized = Math.min(distance / 1e20, 1);
  const minutes = Math.round(5 + normalized * 55);
  return `~${minutes} min`;
};

const RegionSelect: React.FC<{
  label: string;
  value?: number;
  onValueChange: (v: number) => void;
  regions: Array<{ id: number; name: string; currentPrice: number; resourceIcon: string }>;
  disabled?: boolean;
  placeholder: string;
}> = ({ label, value, onValueChange, regions, disabled, placeholder }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-slate-200">{label}</label>
    <select
      value={value || ''}
      onChange={(e) => onValueChange(Number(e.target.value))}
      disabled={disabled}
      className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 disabled:opacity-50"
    >
      <option value="">{placeholder}</option>
      {regions.map((r) => (
        <option key={r.id} value={r.id}>
          {r.resourceIcon} {r.name} — {r.currentPrice.toFixed(3)} SUI
        </option>
      ))}
    </select>
  </div>
);

const TradeEstimateCard: React.FC<{ estimate?: TradeEstimate; isLoading: boolean }> = ({ estimate, isLoading }) => {
  const { t } = useI18n();
  if (isLoading) return (
    <div className="glass-card flex items-center justify-center p-6">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      <span className="ml-2 text-slate-400">{t.trade.estimateLoading}</span>
    </div>
  );
  if (!estimate) return (
    <div className="glass-card p-6">
      <div className="flex items-center space-x-2 text-slate-400">
        <AlertCircle className="h-5 w-5" />
        <span>{t.trade.estimateEmpty}</span>
      </div>
    </div>
  );
  return (
    <div className="glass-card space-y-4 p-6">
      <h3 className="font-semibold text-white">{t.trade.estimate}</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-slate-400">{t.trade.totalFee}</span>
          <span className="font-medium text-white">{estimate.totalFee.toFixed(4)} SUI</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">单位费率</span>
          <span className="font-medium text-slate-300">{estimate.baseFeePerUnit.toFixed(4)} SUI/unit</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{t.trade.estimatedTime}</span>
          <span className="font-medium text-white">{estimate.estimatedTime}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">{t.trade.congestion}</span>
          <span className={`font-medium ${CONGESTION_COLOR[estimate.congestionLevel]}`}>
            {estimate.congestionLevel}
          </span>
        </div>
        {estimate.discountApplied > 0 && (
          <div className="flex justify-between text-emerald-400">
            <span>{t.trade.discountApplied}</span>
            <span>-{estimate.discountApplied.toFixed(4)} SUI</span>
          </div>
        )}
      </div>
    </div>
  );
};

export const Trade: React.FC = () => {
  const { t } = useI18n();
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending: isSigning } = useSignAndExecuteTransaction();
  const { oracle, regulator } = useContractSnapshot();
  const { data: solarSystems = [] } = useSolarSystems();

  const [estimate, setEstimate] = useState<TradeEstimate | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [txDigest, setTxDigest] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);

  const { handleSubmit, watch, control, register, formState: { errors }, reset } = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
  });

  const fromRegion = watch('fromRegion');
  const toRegion = watch('toRegion');
  const amount = watch('amount');
  const usePriorityPass = watch('usePriorityPass');

  // 从链上数据 + World API 构建区域列表
  const regions = useMemo(() => {
    if (!oracle?.region_resources) return [];
    return Object.entries(oracle.region_resources)
      .filter(([id]) => id && !isNaN(Number(id)))
      .map(([id, res]: [string, any]) => {
        const typeId = Number(res?.resource_type?.fields?.type_id ?? res?.resource_type?.type_id ?? 0);
        const priceRaw = regulator?.price_data?.[id]
          ? Number((regulator.price_data as any)[id].current_price ?? 0)
          : 0;
        return {
          id: Number(id),
          name: getSolarSystemName(id, solarSystems),
          currentPrice: priceRaw > 0 ? priceRaw / 1000 : 1.0,
          stock: Number(res?.current_stock ?? 0),
          capacity: Number(res?.max_capacity ?? 1),
          resourceTypeId: typeId,
          resourceIcon: getResourceTypeIcon(typeId),
          resourceName: getResourceTypeName(typeId),
          // 星系坐标（用于距离计算）
          location: solarSystems.find((s) => s.id === Number(id))?.location,
        };
      });
  }, [oracle, regulator, solarSystems]);

  // 基于真实星系坐标估算费用
  useEffect(() => {
    if (!fromRegion || !toRegion || fromRegion === toRegion) {
      setEstimate(null);
      return;
    }
    setIsCalculating(true);
    const timer = setTimeout(() => {
      const fromSys = solarSystems.find((s) => s.id === fromRegion);
      const toSys = solarSystems.find((s) => s.id === toRegion);

      let feeRate = 0.05; // fallback
      let timeStr = '~20 min';
      let congestion: CongestionLevel = 'Low';

      if (fromSys && toSys) {
        const dist = calcDistance(fromSys.location, toSys.location);
        feeRate = distanceToFeeRate(dist);
        timeStr = distanceToTime(dist);
        // 拥堵基于供需比
        const fromRes = oracle?.region_resources?.[String(fromRegion)] as any;
        const ratio = Number(fromRes?.supply_demand_ratio ?? 10000);
        congestion = ratio < 5000 ? 'High' : ratio < 8000 ? 'Medium' : 'Low';
      }

      const baseFee = feeRate * (amount || 1);
      const discount = usePriorityPass ? baseFee * 0.2 : 0;
      setEstimate({
        totalFee: baseFee - discount,
        estimatedTime: timeStr,
        congestionLevel: congestion,
        discountApplied: discount,
        baseFeePerUnit: feeRate,
      });
      setIsCalculating(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [fromRegion, toRegion, amount, usePriorityPass, solarSystems, oracle]);

  const onSubmit = async (data: TradeFormData) => {
    if (!estimate) return;
    setTxDigest(null);
    setTxError(null);

    if (hasConfiguredContracts && account && appConfig.sui.packageId && appConfig.sui.treasuryPoolId) {
      const tx = new Transaction();
      const feeMist = suiToMist(estimate.totalFee);
      // 正确调用：treasury_pool::cross_region_transfer（内部自动扣手续费）
      tx.moveCall({
        target: `${appConfig.sui.packageId}::treasury_pool::cross_region_transfer`,
        arguments: [
          tx.object(appConfig.sui.treasuryPoolId),
          tx.pure.u64(data.fromRegion),
          tx.pure.u64(data.toRegion),
          tx.pure.u64(feeMist),
        ],
      });

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async (result) => {
            try {
              await suiClient.waitForTransaction({ digest: result.digest });
            } catch { /* 超时继续 */ }
            setTxDigest(result.digest);
            reset();
            setEstimate(null);
          },
          onError: (err) => setTxError(err.message ?? t.trade.fail),
        }
      );
    } else {
      await new Promise((r) => setTimeout(r, 1200));
      setTxDigest('demo-' + Date.now());
      reset();
      setEstimate(null);
    }
  };

  // 最近路线：取链上已有区域的两两组合（最多3条）
  const recentRoutes = useMemo(() => {
    if (regions.length < 2) return [];
    const routes = [];
    for (let i = 0; i < Math.min(regions.length - 1, 3); i++) {
      const from = regions[i];
      const to = regions[i + 1];
      let feeRate = 0.05;
      if (from.location && to.location) {
        feeRate = distanceToFeeRate(calcDistance(from.location, to.location));
      }
      const fromRes = oracle?.region_resources?.[String(from.id)] as any;
      const ratio = Number(fromRes?.supply_demand_ratio ?? 10000);
      routes.push({
        from: from.id, to: to.id,
        fromName: from.name, toName: to.name,
        fee: feeRate,
        congestion: ratio < 5000 ? 'High' as CongestionLevel : ratio < 8000 ? 'Medium' as CongestionLevel : 'Low' as CongestionLevel,
      });
    }
    return routes;
  }, [regions, oracle]);

  return (
    <div className="page-shell">
      <div className="hero-panel">
        <div className="relative z-10 space-y-4">
          <span className="eyebrow">{t.trade.badge}</span>
          <h1 className="section-title">{t.trade.title}</h1>
          <p className="section-copy">{t.trade.subtitle}</p>
        </div>
        <div className="relative z-10 mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{t.trade.tip1}</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{t.trade.tip2}</div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">{t.trade.tip3}</div>
        </div>
      </div>

      {txDigest && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>
            {t.trade.success}
            {txDigest.startsWith('demo-') ? ' (演示模式)' : (
              <a href={`https://suiexplorer.com/txblock/${txDigest}?network=testnet`}
                target="_blank" rel="noreferrer" className="ml-2 underline">
                {txDigest.slice(0, 16)}...
              </a>
            )}
          </span>
        </div>
      )}

      {txError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{txError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="glass-card p-6">
            <h2 className="mb-2 text-xl font-semibold text-white">{t.trade.createTrade}</h2>
            <p className="mb-6 text-sm text-slate-400">{t.trade.createTradeDesc}</p>

            {!account && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-yellow-400/20 bg-yellow-400/10 p-3 text-sm text-yellow-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                请先连接钱包以执行链上交易
              </div>
            )}

            {regions.length === 0 && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-3 text-sm text-sky-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                链上暂无区域数据，请先在管理面板创建区域
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Controller
                  name="fromRegion"
                  control={control}
                  render={({ field }) => (
                    <RegionSelect
                      label={t.trade.fromRegion}
                      value={field.value}
                      onValueChange={field.onChange}
                      regions={regions}
                      placeholder={t.trade.selectRegion}
                    />
                  )}
                />
                <Controller
                  name="toRegion"
                  control={control}
                  render={({ field }) => (
                    <RegionSelect
                      label={t.trade.toRegion}
                      value={field.value}
                      onValueChange={field.onChange}
                      regions={regions.filter((r) => r.id !== fromRegion)}
                      disabled={!fromRegion}
                      placeholder={t.trade.selectRegion}
                    />
                  )}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">{t.trade.amount}</label>
                <input
                  type="number"
                  {...register('amount', { valueAsNumber: true })}
                  placeholder={t.trade.amountPlaceholder}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  min="1" step="1"
                />
                {errors.amount && <p className="text-sm text-rose-400">{errors.amount.message}</p>}
              </div>

              <div className="flex items-center space-x-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input type="checkbox" id="priority-pass"
                  {...register('usePriorityPass')}
                  className="rounded" />
                <label htmlFor="priority-pass" className="text-sm text-slate-200">{t.trade.priorityPass}</label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={!estimate || isSigning || regions.length === 0}
                  className="flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSigning ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t.trade.executing}</>
                  ) : t.trade.execute}
                </button>
              </div>
            </form>
          </div>

          {/* 链上区域资源状态 */}
          {regions.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="mb-4 font-semibold text-white">星系资源状态</h3>
              <div className="space-y-3">
                {regions.map((r) => {
                  const pct = r.capacity > 0 ? Math.round((r.stock / r.capacity) * 100) : 0;
                  return (
                    <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white text-sm">{r.resourceIcon} {r.name}</span>
                        <span className="text-xs text-slate-400">{r.resourceName} · {r.currentPrice.toFixed(3)} SUI</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-white/10">
                        <div
                          className="h-1.5 rounded-full bg-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-xs text-slate-500">
                        <span>{r.stock.toLocaleString()} / {r.capacity.toLocaleString()}</span>
                        <span>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <TradeEstimateCard estimate={estimate} isLoading={isCalculating} />

          <div className="glass-card p-6">
            <h3 className="mb-2 font-semibold text-white">{t.trade.bestRoutes}</h3>
            <p className="mb-4 text-sm text-slate-400">{t.trade.bestRoutesDesc}</p>
            <div className="space-y-3">
              {recentRoutes.length > 0 ? recentRoutes.map((route, i) => (
                <div key={i} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm">
                  <div className="flex items-center space-x-2 text-slate-200">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    <span className="truncate max-w-[80px]">{route.fromName}</span>
                    <ArrowRightLeft className="h-3 w-3 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[80px]">{route.toName}</span>
                  </div>
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className="text-slate-400">{route.fee.toFixed(3)}</span>
                    <span className={`h-2 w-2 rounded-full ${
                      route.congestion === 'Low' ? 'bg-emerald-400' : route.congestion === 'Medium' ? 'bg-yellow-400' : 'bg-rose-400'
                    }`} />
                  </div>
                </div>
              )) : (
                <p className="text-sm text-slate-500">创建至少两个区域后显示路线</p>
              )}
            </div>
          </div>

          <div className="glass-card p-6 space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              路线详情
            </h3>
            {fromRegion && toRegion && fromRegion !== toRegion && (
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.trade.from}</span>
                  <span>{regions.find((r) => r.id === fromRegion)?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.trade.to}</span>
                  <span>{regions.find((r) => r.id === toRegion)?.name}</span>
                </div>
                {estimate && (
                  <div className="flex justify-between">
                    <span className="text-slate-400"><DollarSign className="inline h-3 w-3" /> {t.trade.totalFee}</span>
                    <span className="text-cyan-300">{estimate.totalFee.toFixed(4)} SUI</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
