import React from 'react';
import { Github, ExternalLink } from 'lucide-react';
import { useI18n } from '../i18n';

interface FooterProps {
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({ className }) => {
  const { t } = useI18n();

  return (
    <footer className={`border-t border-white/10 bg-slate-950/70 backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/60 ${className}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 via-sky-400 to-blue-500">
                <div className="h-5 w-5 rounded-sm bg-primary-foreground"></div>
              </div>
              <span className="text-xl font-bold tracking-[0.18em] text-white">DER</span>
            </div>
            <p className="text-sm text-slate-400">{t.footer.description}</p>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">{t.footer.quickLinks}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/" className="text-slate-400 transition-colors hover:text-white">{t.nav.dashboard}</a></li>
              <li><a href="/trade" className="text-slate-400 transition-colors hover:text-white">{t.nav.trade}</a></li>
              <li><a href="/admin" className="text-slate-400 transition-colors hover:text-white">{t.nav.admin}</a></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">{t.footer.resources}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://docs.evefrontier.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-slate-400 transition-colors hover:text-white"
                >
                  <span>EVE Frontier Docs</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/evefrontier"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-slate-400 transition-colors hover:text-white"
                >
                  <span>EVE Frontier GitHub</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://docs.sui.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-slate-400 transition-colors hover:text-white"
                >
                  <span>Sui Documentation</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-white">{t.footer.community}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://discord.com/invite/evefrontier"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-slate-400 transition-colors hover:text-white"
                >
                  <span>Discord</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com/evefrontier"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 text-slate-400 transition-colors hover:text-white"
                >
                  <span>Twitter</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-8">
          <div className="flex flex-col items-center justify-between space-y-4 sm:flex-row sm:space-y-0">
            <div className="text-sm text-slate-400">{t.footer.copyright}</div>

            <div className="flex items-center space-x-4">
              <a
                href="https://github.com/your-username/dynamic-economic-regulator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 transition-colors hover:text-white"
                aria-label="GitHub Repository"
              >
                <Github className="h-5 w-5" />
              </a>

              <div className="text-xs text-slate-500">{t.footer.motto}</div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};
