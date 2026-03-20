import React from 'react';
import { Wallet, ExternalLink } from 'lucide-react';
import { ConnectButton, useWallets, useConnectWallet } from '@mysten/dapp-kit';
import { useI18n } from '../i18n';

interface ConnectWalletProps {
  className?: string;
  onConnect?: () => void;
}

export const ConnectWallet: React.FC<ConnectWalletProps> = ({ className, onConnect }) => {
  const { t } = useI18n();
  const wallets = useWallets();
  const { mutate: connectWallet, isPending } = useConnectWallet();

  const handleConnect = (wallet: ReturnType<typeof useWallets>[0]) => {
    connectWallet(
      { wallet },
      {
        onSuccess: () => {
          onConnect?.();
        },
      }
    );
  };

  return (
    <div className={`mx-auto max-w-md space-y-6 ${className}`}>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
          <Wallet className="h-7 w-7" />
        </div>
        <h2 className="mt-6 text-3xl font-bold text-white">{t.wallet.title}</h2>
        <p className="mt-2 text-sm text-slate-300">{t.wallet.subtitle}</p>
      </div>

      <div className="space-y-3">
        {wallets.length > 0 ? (
          wallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => handleConnect(wallet)}
              disabled={isPending}
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-left text-white transition-all hover:border-cyan-500/50 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="flex items-center gap-3">
                {wallet.icon && (
                  <img src={wallet.icon} alt={wallet.name} className="h-6 w-6 rounded" />
                )}
                <span className="font-medium">{wallet.name}</span>
              </div>
              <span className="text-xs uppercase tracking-wide text-emerald-400">
                {t.wallet.installed}
              </span>
            </button>
          ))
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm text-slate-400">{t.wallet.noWallets}</p>
            {/* Sui Wallet 优先推荐 */}
            <a
              href="https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-4 py-3 text-left text-slate-200 transition-all hover:border-cyan-400 hover:bg-cyan-500/20"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🔵</span>
                <div>
                  <p className="font-medium text-white">Sui Wallet</p>
                  <p className="text-xs text-slate-400">推荐 · Chrome 插件</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-cyan-400">
                <span>{t.wallet.install}</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </a>
            <a
              href="https://github.com/evefrontier/evevault/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-800/50 px-4 py-3 text-left text-slate-300 transition-all hover:border-cyan-500/50 hover:bg-slate-700"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">🎮</span>
                <div>
                  <p className="font-medium">EVE Vault</p>
                  <p className="text-xs text-slate-500">需要 EVE 账号</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-cyan-400">
                <span>{t.wallet.install}</span>
                <ExternalLink className="h-3 w-3" />
              </div>
            </a>
          </div>
        )}
      </div>

      {/* 也可以使用 dapp-kit 内置的连接按钮 */}
      <div className="flex justify-center">
        <ConnectButton
          connectText={t.wallet.connectButton}
          className="rounded-full bg-cyan-400 px-6 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
        />
      </div>

      <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4">
        <h3 className="mb-2 text-sm font-semibold text-white">{t.wallet.noteTitle}</h3>
        <p className="text-xs leading-6 text-slate-400">{t.wallet.noteBody}</p>
      </div>
    </div>
  );
};
