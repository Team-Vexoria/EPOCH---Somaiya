import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-neutral-surface border-t-2 border-neutral-ink mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-neutral-muted">
          <AlertCircle className="w-4 h-4 text-hold shrink-0" />
          <span className="font-medium">{t('app.disclaimer')}</span>
        </div>

        <div className="flex items-center gap-4 text-sm font-semibold text-neutral-ink">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>Nashik APMC Network</span>
          </span>
          <span className="text-neutral-muted">•</span>
          <span>KJSIT Hackathon Oct 2026</span>
        </div>
      </div>
    </footer>
  );
};
