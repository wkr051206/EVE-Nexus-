import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ConnectWallet } from './components/ConnectWallet';
import { useI18n } from './i18n';

const Dashboard = lazy(() => import('./pages/Dashboard').then((module) => ({ default: module.Dashboard })));
const Trade = lazy(() => import('./pages/Trade').then((module) => ({ default: module.Trade })));
const Admin = lazy(() => import('./pages/Admin').then((module) => ({ default: module.Admin })));
const NotFound = lazy(() => import('./pages/NotFound').then((module) => ({ default: module.NotFound })));

const App: React.FC = () => {
  const account = useCurrentAccount();
  const { t } = useI18n();
  const isConnected = Boolean(account);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12">
          <div className="space-y-6 text-center">
            <div className="inline-flex items-center rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1 text-sm text-cyan-200">
              {t.landing.badge}
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              {t.landing.title}
            </h1>
            <p className="mx-auto max-w-3xl text-lg text-slate-300 sm:text-xl">
              {t.landing.subtitle}
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">{t.landing.trackedRegions}</p>
                  <p className="mt-3 text-3xl font-semibold text-cyan-300">4</p>
                  <p className="mt-2 text-sm text-slate-400">{t.landing.trackedRegionsDesc}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">{t.landing.pricingModel}</p>
                  <p className="mt-3 text-3xl font-semibold text-emerald-300">AMM + Elastic</p>
                  <p className="mt-2 text-sm text-slate-400">{t.landing.pricingModelDesc}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-400">{t.landing.demoMode}</p>
                  <p className="mt-3 text-3xl font-semibold text-amber-300">Testnet</p>
                  <p className="mt-2 text-sm text-slate-400">{t.landing.demoModeDesc}</p>
                </div>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-5">
                  <h2 className="text-lg font-semibold text-cyan-100">{t.landing.proves}</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {t.landing.provesItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
                  <h2 className="text-lg font-semibold text-emerald-100">{t.landing.ships}</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-200">
                    {t.landing.shipsItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-black/40">
              <ConnectWallet />
            </section>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto min-h-[calc(100vh-8rem)] px-4 py-8">
        <Suspense
          fallback={(
            <div className="flex min-h-[50vh] items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-slate-300">
              Loading control surface...
            </div>
          )}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trade" element={<Trade />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/404" element={<NotFound />} />
            <Route path="*" element={<Navigate to="/404" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default App;
