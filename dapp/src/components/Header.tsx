import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ArrowLeftRight, Settings, LogOut, Menu, X } from 'lucide-react';
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useI18n } from '../i18n';

interface HeaderProps {
  className?: string;
}

export const Header: React.FC<HeaderProps> = ({ className }) => {
  const { language, setLanguage, t } = useI18n();
  const account = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const isConnected = Boolean(account);
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const navigation = [
    { name: t.nav.dashboard, href: '/', icon: BarChart3 },
    { name: t.nav.trade, href: '/trade', icon: ArrowLeftRight },
    { name: t.nav.admin, href: '/admin', icon: Settings },
  ];

  const shortAddress = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : '';

  return (
    <header className={`sticky top-0 z-40 border-b border-white/10 bg-slate-950/75 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500 shadow-lg shadow-cyan-950/40">
                <BarChart3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-[0.18em] text-white">DER</span>
                <p className="text-[10px] uppercase tracking-[0.3em] text-slate-400">{t.nav.command}</p>
              </div>
            </Link>
          </div>

          <nav className="hidden items-center space-x-3 md:flex">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-400/15 text-cyan-100 ring-1 ring-cyan-300/25'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center space-x-4">
            <div className="hidden items-center rounded-full border border-white/10 bg-white/5 p-1 sm:flex">
              <button
                onClick={() => setLanguage('en')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${language === 'en' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('zh')}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${language === 'zh' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'}`}
              >
                {t.nav.chinese}
              </button>
            </div>

            {isConnected && account && (
              <div className="hidden items-center space-x-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100 sm:flex">
                <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.8)]" />
                <span className="font-mono text-xs tracking-wide">{shortAddress}</span>
              </div>
            )}

            {isConnected && (
              <button
                onClick={() => disconnect()}
                className="hidden items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10 sm:flex"
              >
                <LogOut className="h-4 w-4" />
                <span>{t.nav.disconnect}</span>
              </button>
            )}

            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="rounded-full border border-white/10 bg-white/5 p-2 text-slate-200 transition-colors hover:bg-white/10 md:hidden"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="border-t border-white/10 py-4 md:hidden">
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`flex items-center space-x-3 rounded-2xl px-3 py-3 text-sm font-medium transition-colors ${
                      isActive ? 'bg-cyan-400/15 text-cyan-100' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              <div className="flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => setLanguage('en')}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${language === 'en' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}
                >
                  EN
                </button>
                <button
                  onClick={() => setLanguage('zh')}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${language === 'zh' ? 'bg-cyan-400 text-slate-950' : 'bg-white/5 text-slate-300'}`}
                >
                  {t.nav.chinese}
                </button>
              </div>

              {isConnected && account && (
                <div className="px-3 py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t.nav.connected}</span>
                    <span className="font-mono text-xs">
                      {account.address.slice(0, 10)}...{account.address.slice(-6)}
                    </span>
                  </div>
                  <button
                    onClick={() => disconnect()}
                    className="mt-2 flex w-full items-center justify-center space-x-2 rounded-2xl bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t.nav.disconnect}</span>
                  </button>
                </div>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
