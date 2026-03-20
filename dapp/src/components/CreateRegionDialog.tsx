import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Layers, Loader2, Plus, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { Transaction, suiClient } from '../utils';
import { appConfig, hasConfiguredContracts } from '../config';
import { EVE_RESOURCE_TYPES, useSolarSystems } from '../hooks/useWorldApi';

const regionSchema = z.object({
  regionId: z.number().min(1, 'Region ID must be greater than 0'),
  resourceTypeId: z.number().min(0).max(255),
  initialStock: z.number().min(1, 'Initial stock must be greater than 0'),
  maxCapacity: z.number().min(1, 'Max capacity must be greater than 0'),
  consumptionRate: z.number().min(0),
  productionRate: z.number().min(0),
});

type RegionFormData = z.infer<typeof regionSchema>;

interface FieldProps {
  label: string;
  error?: string;
  children: React.ReactNode;
}

const Field: React.FC<FieldProps> = ({ label, error, children }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold uppercase tracking-widest text-slate-400">
      {label}
    </label>
    {children}
    {error && (
      <p className="flex items-center gap-1 text-xs text-rose-400">
        <AlertCircle className="h-3 w-3" />
        {error}
      </p>
    )}
  </div>
);

interface Props {
  onCreated?: () => void;
}

export const CreateRegionDialog: React.FC<Props> = ({ onCreated }) => {
  const [open, setOpen] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const account = useCurrentAccount();
  const { mutate: signAndExecute, isPending } = useSignAndExecuteTransaction();
  const { data: solarSystems = [] } = useSolarSystems();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<RegionFormData>({
    resolver: zodResolver(regionSchema),
    defaultValues: { resourceTypeId: 0, consumptionRate: 0, productionRate: 0 },
  });

  const handleClose = useCallback(() => {
    if (isPending) return;
    setOpen(false);
    reset();
    setTxError(null);
  }, [isPending, reset]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const onSubmit = async (data: RegionFormData) => {
    setTxError(null);

    if (
      hasConfiguredContracts &&
      account &&
      appConfig.sui.packageId &&
      appConfig.sui.resourceOracleId &&
      appConfig.sui.oracleAdminCap
    ) {
      const tx = new Transaction();
      const pkg = appConfig.sui.packageId;

      tx.moveCall({
        target: `${pkg}::resource_oracle::register_region`,
        arguments: [
          tx.object(appConfig.sui.resourceOracleId),
          tx.object(appConfig.sui.oracleAdminCap),
          tx.pure.u64(data.regionId),
          tx.pure.u8(data.resourceTypeId),
          tx.pure.u64(data.initialStock),
          tx.pure.u64(data.maxCapacity),
          tx.pure.u64(data.consumptionRate),
          tx.pure.u64(data.productionRate),
          tx.pure.u64(3000),
        ],
      });

      if (appConfig.sui.priceRegulatorId && appConfig.sui.regulatorAdminCap) {
        tx.moveCall({
          target: `${pkg}::price_regulator::set_price_data`,
          arguments: [
            tx.object(appConfig.sui.priceRegulatorId),
            tx.object(appConfig.sui.regulatorAdminCap),
            tx.pure.u64(data.regionId),
            tx.pure.u8(data.resourceTypeId),
            tx.pure.u64(1000),
            tx.pure.u8(0),
          ],
        });
      }

      if (appConfig.sui.treasuryPoolId && appConfig.sui.treasuryAdminCap) {
        let treasuryExists = false;

        try {
          const existing = await suiClient.getDynamicFieldObject({
            parentId: appConfig.sui.treasuryPoolId,
            name: {
              type: `${appConfig.sui.packageId}::resource_oracle::RegionID`,
              value: { id: String(data.regionId) },
            },
          });
          treasuryExists = !!existing.data;
        } catch {
          treasuryExists = false;
        }

        if (!treasuryExists) {
          tx.moveCall({
            target: `${pkg}::treasury_pool::create_region_treasury`,
            arguments: [
              tx.object(appConfig.sui.treasuryPoolId),
              tx.object(appConfig.sui.treasuryAdminCap),
              tx.pure.u64(data.regionId),
              tx.pure.u64(100_000_000),
              tx.pure.u64(10_000_000_000),
            ],
          });
        }
      }

      signAndExecute(
        { transaction: tx as any },
        {
          onSuccess: async (result) => {
            try {
              await suiClient.waitForTransaction({ digest: result.digest });
            } catch {
              // Keep the UX moving even if confirmation polling times out.
            }

            handleClose();
            onCreated?.();
          },
          onError: (err) => setTxError(err.message),
        },
      );
    } else {
      await new Promise((resolve) => setTimeout(resolve, 600));
      handleClose();
      onCreated?.();
    }
  };

  const inputCls = 'w-full rounded-xl border border-white/10 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 transition focus:border-cyan-400/60 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-400/30';

  const modal = open ? (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(2,6,23,0.8)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0d1424] shadow-2xl"
        style={{
          boxShadow: '0 0 0 1px rgba(34,211,238,0.1), 0 40px 80px rgba(0,0,0,0.7)',
          animation: 'modalIn 0.18s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />

        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cyan-400/10 ring-1 ring-cyan-400/20">
              <Layers className="h-4 w-4 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Create Region</h2>
              <p className="text-xs text-slate-500">Register a new resource region on chain.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/8 hover:text-slate-200 disabled:opacity-40"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-white/6" />

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-6 py-5">
          {txError && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-400/20 bg-rose-400/8 px-4 py-3 text-sm text-rose-300">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{txError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field label="Solar System (Region ID)" error={errors.regionId?.message}>
              <select
                {...register('regionId', { valueAsNumber: true })}
                className={inputCls}
              >
                <option value="">Select a system...</option>
                {solarSystems.slice(0, 200).map((sys) => (
                  <option key={sys.id} value={sys.id}>
                    {sys.name} ({sys.id})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Resource Type">
              <select
                {...register('resourceTypeId', { valueAsNumber: true })}
                className={inputCls}
              >
                {EVE_RESOURCE_TYPES.map((rt) => (
                  <option key={rt.typeId} value={rt.typeId}>
                    {rt.icon} {rt.name} ({rt.category})
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Initial Stock" error={errors.initialStock?.message}>
              <input
                type="number"
                {...register('initialStock', { valueAsNumber: true })}
                className={inputCls}
                placeholder="50000"
              />
            </Field>
            <Field label="Max Capacity" error={errors.maxCapacity?.message}>
              <input
                type="number"
                {...register('maxCapacity', { valueAsNumber: true })}
                className={inputCls}
                placeholder="100000"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Consumption / hour">
              <input
                type="number"
                {...register('consumptionRate', { valueAsNumber: true })}
                className={inputCls}
                placeholder="100"
              />
            </Field>
            <Field label="Production / hour">
              <input
                type="number"
                {...register('productionRate', { valueAsNumber: true })}
                className={inputCls}
                placeholder="80"
              />
            </Field>
          </div>

          <div className="h-px bg-white/6" />
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={isPending}
              className="rounded-full border border-white/10 px-5 py-2 text-sm text-slate-400 transition hover:border-white/20 hover:text-white disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  <span>Create Region</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  ) : null;

  return (
    <>
      <button
        className="flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-300"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Create Region
      </button>

      {createPortal(modal, document.body)}
    </>
  );
};
