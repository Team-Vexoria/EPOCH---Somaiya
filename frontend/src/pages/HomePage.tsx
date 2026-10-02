import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, CheckCircle2, Cpu, FileText, Database } from 'lucide-react';

export const HomePage: React.FC = () => {
  const { user, isFirebaseReady, loginAsJudge } = useAuth();

  return (
    <div className="space-y-12">
      {/* Asymmetric Editorial Hero Section */}
      <section className="bg-neutral-surface border-2 border-neutral-ink p-8 sm:p-12 shadow-hard">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <div className="inline-block px-3 py-1 bg-neutral-bg border border-neutral-ink text-sm font-semibold text-neutral-ink">
              SOMAIYA HACKATHON 2026 // FINAL ROUND
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-neutral-ink leading-tight">
              Intelligent Workspace & Verified Retrieval System
            </h1>

            <p className="text-lg text-neutral-ink leading-relaxed max-w-2xl">
              Engineered for rapid problem adaptation, document grounding, and verifiable decision traces. Pre-scaffolded with Judge bypass modes and domain-focused retrieval pipelines.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-primary text-primary-fg text-base font-semibold border-2 border-neutral-ink shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5"
              >
                <span>Open Workspace</span>
                <ArrowRight className="w-5 h-5" />
              </Link>

              {!user && (
                <button
                  type="button"
                  onClick={loginAsJudge}
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-secondary text-secondary-fg text-base font-semibold border-2 border-neutral-ink hover:bg-secondary-hover active:translate-x-0.5 active:translate-y-0.5"
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span>Enter as Judge</span>
                </button>
              )}
            </div>
          </div>

          {/* System Readiness Ledger */}
          <div className="lg:col-span-4 bg-neutral-bg border-2 border-neutral-border p-6 space-y-4">
            <h2 className="text-xl font-bold text-neutral-ink border-b-2 border-neutral-border pb-3">
              System Readiness
            </h2>

            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-base font-semibold text-neutral-ink">Frontend Core</div>
                  <div className="text-sm text-neutral-muted">Vite + React + Tailwind design tokens</div>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-base font-semibold text-neutral-ink">Auth Layer</div>
                  <div className="text-sm text-neutral-muted">
                    {isFirebaseReady ? 'Firebase live' : 'Judge Mode ready (keys pending in .env)'}
                  </div>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="text-base font-semibold text-neutral-ink">RAG Agent Bridge</div>
                  <div className="text-sm text-neutral-muted">API skeleton ready for model integration</div>
                </div>
              </li>
            </ul>

            <div className="pt-2">
              <span className="block text-sm text-neutral-muted">Active Session:</span>
              <span className="font-bold text-base text-neutral-ink">
                {user ? (user.isJudge ? 'Judge / Evaluator' : user.displayName || user.email) : 'Guest Visitor'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Domain Architecture Blocks (Asymmetric 3-part layout) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-neutral-surface border-2 border-neutral-border p-6 space-y-3">
          <div className="w-12 h-12 bg-neutral-bg border-2 border-neutral-ink flex items-center justify-center">
            <FileText className="w-6 h-6 text-neutral-ink" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-ink">Document Grounding</h3>
          <p className="text-base text-neutral-ink leading-relaxed">
            Attach problem statement manuals, regulatory briefs, or specifications for grounded question answering.
          </p>
        </div>

        <div className="bg-neutral-surface border-2 border-neutral-border p-6 space-y-3">
          <div className="w-12 h-12 bg-neutral-bg border-2 border-neutral-ink flex items-center justify-center">
            <Cpu className="w-6 h-6 text-neutral-ink" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-ink">Agent Execution</h3>
          <p className="text-base text-neutral-ink leading-relaxed">
            Connect your custom Python RAG pipeline or local agent script directly to the frontend query console.
          </p>
        </div>

        <div className="bg-neutral-surface border-2 border-neutral-border p-6 space-y-3">
          <div className="w-12 h-12 bg-neutral-bg border-2 border-neutral-ink flex items-center justify-center">
            <Database className="w-6 h-6 text-neutral-ink" />
          </div>
          <h3 className="text-2xl font-bold text-neutral-ink">Evaluator Stability</h3>
          <p className="text-base text-neutral-ink leading-relaxed">
            Built-in Judge mode eliminates live demo downtime caused by API token limits or authentication network latency.
          </p>
        </div>
      </section>
    </div>
  );
};
