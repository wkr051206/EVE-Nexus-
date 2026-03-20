import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-4xl font-bold">{t.notFound.title}</h1>
          <p className="text-lg text-muted-foreground">{t.notFound.subtitle}</p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.notFound.helper}</p>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Home className="h-4 w-4" />
              <span>{t.nav.dashboard}</span>
            </button>

            <button
              onClick={() => navigate('/trade')}
              className="rounded-lg border border-input bg-background px-4 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {t.nav.trade}
            </button>

            <button
              onClick={() => navigate('/admin')}
              className="rounded-lg border border-input bg-background px-4 py-2 transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {t.nav.admin}
            </button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">{t.notFound.contact}</div>
      </div>
    </div>
  );
};
