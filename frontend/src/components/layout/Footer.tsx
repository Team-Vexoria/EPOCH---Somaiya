import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Footer: React.FC = () => {
  const { user } = useAuth();

  return (
    <footer className="w-full bg-neutral-surface border-t-2 border-neutral-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg text-neutral-ink">EPOCH Somaiya 2026</span>
            <span className="px-2 py-0.5 bg-neutral-bg border border-neutral-border text-sm font-semibold text-neutral-muted">
              Team Vexoria
            </span>
          </div>
          <p className="text-sm text-neutral-muted mt-2 max-w-md">
            Built for the hackathon final presentation. Strict light-theme typography and domain-driven state trace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm text-neutral-ink font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-none inline-block"></span>
            <span>Auth: {user ? (user.isJudge ? 'Judge Mode' : 'Firebase User') : 'Guest'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-secondary rounded-none inline-block"></span>
            <span>API: Ready</span>
          </div>
          <div className="text-neutral-muted">
            Design compliant with DESIGN_RULES.md
          </div>
        </div>
      </div>
    </footer>
  );
};
