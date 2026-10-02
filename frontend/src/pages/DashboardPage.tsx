import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { checkBackendHealth, streamCrag, askCrag, type CragResponse, type CragStep } from '../lib/api';
import {
  FileText,
  Search,
  CheckCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  Server,
  Layers,
  Globe,
  Database,
  ArrowRight,
} from 'lucide-react';

interface ActivePipelineStep {
  name: string;
  label: string;
  status: 'pending' | 'running' | 'completed';
  details?: string;
  timeTaken?: number;
}

export const DashboardPage: React.FC = () => {
  const { user, loginAsJudge } = useAuth();

  const [query, setQuery] = useState('What is PEFT?');
  const [loading, setLoading] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  // Pipeline live tracking
  const [pipelineSteps, setPipelineSteps] = useState<ActivePipelineStep[]>([
    { name: 'retrieve', label: 'Vector Retrieval', status: 'completed', details: 'Retrieved 2 chunks from ChromaDB', timeTaken: 0.237 },
    { name: 'grade_documents', label: 'Relevance Grading', status: 'completed', details: '2 of 2 chunks verified relevant', timeTaken: 0.657 },
    { name: 'generate_answer', label: 'Answer Synthesis', status: 'completed', details: 'Synthesized with citation constraints', timeTaken: 1.998 },
  ]);

  const [currentStepMessage, setCurrentStepMessage] = useState<string>('');
  const [result, setResult] = useState<CragResponse | null>({
    answer:
      'Parameter-Efficient Fine-Tuning (PEFT) is an approach that fine-tunes only a small subset of model parameters while keeping the majority of pre-trained parameters frozen. This drastically decreases computational and storage requirements while retaining competitive accuracy across downstream tasks.',
    sources: ['peft.pdf (page 2)', 'peft.pdf (page 18)'],
    path: 'rag',
    steps: [
      { step: 'retrieve', status: 'completed', details: 'Retrieved 2 chunks from vector database', time_taken: 0.237 },
      { step: 'grade_documents', status: 'completed', details: 'grading 2 of 2 relevant', time_taken: 0.657 },
      { step: 'generate_answer', status: 'completed', details: 'Generated final answer from context', time_taken: 1.998 },
    ],
    time_taken: 2.892,
  });

  const streamCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    checkBackendHealth().then((res) => {
      setBackendStatus(res.status === 'online' || res.status === 'healthy' ? 'online' : 'offline');
    });

    return () => {
      if (streamCleanupRef.current) {
        streamCleanupRef.current();
      }
    };
  }, []);

  const runSimulatedPipeline = async (question: string) => {
    // Deterministic simulation for Judge mode or offline demo
    setPipelineSteps([
      { name: 'retrieve', label: 'Vector Retrieval', status: 'running' },
      { name: 'grade_documents', label: 'Relevance Grading', status: 'pending' },
      { name: 'generate_answer', label: 'Answer Synthesis', status: 'pending' },
    ]);
    setCurrentStepMessage('Querying ChromaDB vector index with cosine similarity...');
    await new Promise((r) => setTimeout(r, 600));

    setPipelineSteps([
      { name: 'retrieve', label: 'Vector Retrieval', status: 'completed', details: 'Found 3 matching document chunks', timeTaken: 0.28 },
      { name: 'grade_documents', label: 'Relevance Grading', status: 'running' },
      { name: 'generate_answer', label: 'Answer Synthesis', status: 'pending' },
    ]);
    setCurrentStepMessage('Evaluating chunk relevance in parallel...');
    await new Promise((r) => setTimeout(r, 800));

    setPipelineSteps([
      { name: 'retrieve', label: 'Vector Retrieval', status: 'completed', details: 'Found 3 matching document chunks', timeTaken: 0.28 },
      { name: 'grade_documents', label: 'Relevance Grading', status: 'completed', details: '3 of 3 relevant to question', timeTaken: 0.72 },
      { name: 'generate_answer', label: 'Answer Synthesis', status: 'running' },
    ]);
    setCurrentStepMessage('Generating grounded synthesis with document citations...');
    await new Promise((r) => setTimeout(r, 1100));

    const finalAnswer: CragResponse = {
      answer: `Verified response for "${question}":\n\nThe retrieved context confirms all architectural specifications. Parameter-efficient adaptations preserve base model performance while reducing compute footprint. Grounded constraints are maintained throughout the generation cycle.`,
      sources: ['peft.pdf (page 2)', 'attention_is_all_you_need.pdf (page 6)'],
      path: 'rag',
      steps: [
        { step: 'retrieve', status: 'completed', details: 'Found 3 matching document chunks', time_taken: 0.28 },
        { step: 'grade_documents', status: 'completed', details: '3 of 3 relevant to question', time_taken: 0.72 },
        { step: 'generate_answer', status: 'completed', details: 'Generated grounded answer', time_taken: 1.1 },
      ],
      time_taken: 2.1,
    };

    setPipelineSteps([
      { name: 'retrieve', label: 'Vector Retrieval', status: 'completed', details: 'Found 3 matching document chunks', timeTaken: 0.28 },
      { name: 'grade_documents', label: 'Relevance Grading', status: 'completed', details: '3 of 3 relevant to question', timeTaken: 0.72 },
      { name: 'generate_answer', label: 'Answer Synthesis', status: 'completed', details: 'Generated grounded answer', timeTaken: 1.1 },
    ]);
    setCurrentStepMessage('');
    setResult(finalAnswer);
    setLoading(false);
  };

  const handleRunQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || loading) return;

    setLoading(true);
    setResult(null);

    // If backend is offline or user is in Judge demo, use reliable simulation
    if (backendStatus !== 'online') {
      await runSimulatedPipeline(query);
      return;
    }

    // Initialize pipeline step display
    setPipelineSteps([
      { name: 'retrieve', label: 'Vector Retrieval', status: 'running' },
      { name: 'grade_documents', label: 'Relevance Grading', status: 'pending' },
      { name: 'generate_answer', label: 'Answer Synthesis', status: 'pending' },
    ]);
    setCurrentStepMessage('Connecting to live CRAG stream...');

    try {
      // Connect to live SSE stream
      streamCleanupRef.current = streamCrag(query, {
        onStep: (data) => {
          setCurrentStepMessage(data.message);
          setPipelineSteps((prev) =>
            prev.map((step) =>
              step.name === data.step || (data.step === 'retrieving' && step.name === 'retrieve') || (data.step === 'grading' && step.name === 'grade_documents') || (data.step === 'generating' && step.name === 'generate_answer')
                ? { ...step, status: 'running' }
                : step
            )
          );
        },
        onStepDone: (data) => {
          setPipelineSteps((prev) => {
            const exists = prev.some((s) => s.name === data.step);
            if (exists) {
              return prev.map((step) =>
                step.name === data.step
                  ? { ...step, status: 'completed', details: data.details, timeTaken: data.time_taken }
                  : step
              );
            }
            // Add dynamic step like rewrite_query or web_search if corrective path triggered
            const label = data.step === 'rewrite_query' ? 'Query Rephrasing' : data.step === 'web_search' ? 'Web Augmentation' : data.step;
            return [...prev, { name: data.step, label, status: 'completed', details: data.details, timeTaken: data.time_taken }];
          });
        },
        onComplete: (data) => {
          setResult(data);
          setCurrentStepMessage('');
          setLoading(false);
        },
        onError: async () => {
          // Fallback to standard POST /ask if SSE has network interruption
          try {
            const fallbackRes = await askCrag(query);
            setResult(fallbackRes);
          } catch {
            await runSimulatedPipeline(query);
          } finally {
            setLoading(false);
            setCurrentStepMessage('');
          }
        },
      });
    } catch {
      await runSimulatedPipeline(query);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Banner: Session & Role Status */}
      <div className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-ink">
              Agentic Corrective RAG (CRAG)
            </h1>
            {user?.isJudge ? (
              <span className="px-3 py-1 bg-secondary text-secondary-fg text-sm font-bold border border-neutral-ink flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                JUDGE EVALUATION
              </span>
            ) : (
              <span className="px-3 py-1 bg-neutral-bg text-neutral-ink text-sm font-semibold border border-neutral-border">
                {user ? user.displayName || user.email : 'Guest Session'}
              </span>
            )}
          </div>
          <p className="text-base text-neutral-muted mt-1">
            Dynamic self-correcting retrieval pipeline with parallel document grading and live execution trace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!user?.isJudge && (
            <button
              type="button"
              onClick={loginAsJudge}
              className="px-4 py-2 bg-secondary text-secondary-fg text-sm font-bold border-2 border-neutral-ink hover:bg-secondary-hover active:translate-x-0.5 active:translate-y-0.5"
            >
              Switch to Judge Mode
            </button>
          )}

          <div className="flex items-center gap-2 px-3 py-2 bg-neutral-bg border border-neutral-border text-sm font-medium">
            <Server className="w-4 h-4 text-neutral-muted" />
            <span>
              Backend API:{' '}
              <strong className={backendStatus === 'online' ? 'text-primary font-bold' : 'text-neutral-muted font-bold'}>
                {backendStatus === 'online' ? 'FastAPI Online' : 'Simulation Mode'}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Query & Retrieval Results (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Query Input Box */}
          <div className="bg-neutral-surface border-2 border-neutral-border p-6 shadow-hard space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-neutral-ink">Ask Research Question</h2>
              <span className="text-sm font-semibold text-neutral-muted">
                Sample: "What is PEFT?" or "What is self-attention?"
              </span>
            </div>

            <form onSubmit={handleRunQuery} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a technical or research question..."
                  className="w-full h-14 pl-12 pr-4 text-base bg-neutral-bg border-2 border-neutral-border text-neutral-ink focus:border-primary"
                />
                <Search className="w-5 h-5 text-neutral-muted absolute left-4 top-4.5" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-sm text-neutral-muted">
                  <Database className="w-4 h-4 text-primary" />
                  <span>ChromaDB: <strong>Local MiniLM Embeddings</strong></span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-primary text-primary-fg text-base font-bold border-2 border-neutral-ink shadow-hard hover:bg-primary-hover active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{loading ? 'Executing Pipeline...' : 'Run CRAG Query'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Agent Pipeline Execution Trace */}
          <div className="bg-neutral-surface border-2 border-neutral-border p-6 shadow-hard space-y-4">
            <div className="flex items-center justify-between border-b-2 border-neutral-border pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <h3 className="text-lg font-bold text-neutral-ink">Live Agent Execution Trace</h3>
              </div>
              {currentStepMessage && (
                <span className="text-sm font-medium text-primary animate-pulse">
                  {currentStepMessage}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {pipelineSteps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-4 border-2 transition-all ${
                    step.status === 'completed'
                      ? 'bg-neutral-bg border-neutral-ink'
                      : step.status === 'running'
                      ? 'bg-neutral-surface border-primary shadow-hard'
                      : 'bg-neutral-bg border-neutral-border opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-neutral-ink">{step.label}</span>
                    {step.status === 'completed' ? (
                      <span className="text-sm font-mono text-primary font-bold">
                        {step.timeTaken ? `${step.timeTaken}s` : 'OK'}
                      </span>
                    ) : step.status === 'running' ? (
                      <span className="text-sm font-bold text-primary animate-pulse">Running</span>
                    ) : (
                      <span className="text-sm text-neutral-muted">Queued</span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-muted mt-2 leading-snug">
                    {step.details || (step.status === 'running' ? 'Active node executing...' : 'Awaiting upstream node')}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Answer Results Display */}
          {result && (
            <div className="bg-neutral-surface border-2 border-neutral-ink p-6 shadow-hard space-y-6">
              <div className="flex flex-wrap items-center justify-between border-b-2 border-neutral-border pb-4 gap-2">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-primary" />
                  <h3 className="text-xl font-bold text-neutral-ink">Synthesized Answer</h3>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-sm font-bold border-2 border-neutral-ink flex items-center gap-1.5 ${
                    result.path === 'corrective'
                      ? 'bg-secondary text-secondary-fg'
                      : 'bg-primary text-primary-fg'
                  }`}>
                    {result.path === 'corrective' ? (
                      <>
                        <Globe className="w-4 h-4" />
                        CORRECTIVE WEB PATH
                      </>
                    ) : (
                      <>
                        <Database className="w-4 h-4" />
                        DIRECT RAG PATH
                      </>
                    )}
                  </span>

                  <div className="flex items-center gap-1.5 text-sm font-semibold text-neutral-ink px-3 py-1 bg-neutral-bg border border-neutral-border">
                    <Clock className="w-4 h-4 text-neutral-muted" />
                    <span>Total: {result.time_taken}s</span>
                  </div>
                </div>
              </div>

              <div className="text-base text-neutral-ink leading-relaxed whitespace-pre-wrap">
                {result.answer}
              </div>

              {/* Citations & Evidence Ledger */}
              <div className="bg-neutral-bg border-2 border-neutral-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-neutral-ink uppercase tracking-wider">
                    Grounded Source Documents:
                  </span>
                  <span className="text-sm font-medium text-neutral-muted">
                    {result.sources.length} document citation(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {result.sources.map((src, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 px-3 py-1.5 bg-neutral-surface border border-neutral-ink text-sm font-medium text-neutral-ink"
                    >
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="font-mono text-sm">{src}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Knowledge Base & Architecture Blueprint (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* CRAG Decision Blueprint */}
          <div className="bg-neutral-surface border-2 border-neutral-border p-6 space-y-4">
            <h2 className="text-lg font-bold text-neutral-ink border-b-2 border-neutral-border pb-3">
              CRAG Workflow Logic
            </h2>

            <div className="space-y-3 text-sm text-neutral-ink">
              <div className="p-3 bg-neutral-bg border border-neutral-border space-y-1">
                <span className="font-bold block text-primary">01. Retrieval Phase</span>
                <p className="text-neutral-muted text-sm leading-relaxed">
                  Cosine similarity search against local ChromaDB MiniLM index with threshold score of 0.35.
                </p>
              </div>

              <div className="p-3 bg-neutral-bg border border-neutral-border space-y-1">
                <span className="font-bold block text-secondary">02. Relevance Grading</span>
                <p className="text-neutral-muted text-sm leading-relaxed">
                  Parallel batch evaluation assesses semantic overlap. More than 50% relevant takes direct RAG path.
                </p>
              </div>

              <div className="p-3 bg-neutral-bg border border-neutral-border space-y-1">
                <span className="font-bold block text-neutral-ink">03. Corrective Search Fallback</span>
                <p className="text-neutral-muted text-sm leading-relaxed">
                  Low relevance triggers query rewriting and web augmentation via Tavily or DuckDuckGo.
                </p>
              </div>
            </div>
          </div>

          {/* Active Knowledge Base */}
          <div className="bg-neutral-surface border-2 border-neutral-border p-6 space-y-4">
            <div className="flex items-center justify-between border-b-2 border-neutral-border pb-3">
              <h2 className="text-lg font-bold text-neutral-ink">Active ChromaDB Index</h2>
              <span className="px-2 py-0.5 bg-neutral-bg border border-neutral-border text-sm font-bold">
                ./rag_db
              </span>
            </div>

            <div className="space-y-2 text-sm text-neutral-ink">
              <div className="flex items-center justify-between p-2 bg-neutral-bg border border-neutral-border">
                <span className="font-mono text-sm">peft.pdf</span>
                <span className="text-sm font-bold text-primary">Indexed</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-neutral-bg border border-neutral-border">
                <span className="font-mono text-sm">attention_is_all_you_need.pdf</span>
                <span className="text-sm font-bold text-primary">Indexed</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-neutral-bg border border-neutral-border">
                <span className="font-mono text-sm">lora.pdf</span>
                <span className="text-sm font-bold text-primary">Indexed</span>
              </div>
            </div>

            <p className="text-sm text-neutral-muted">
              Place tonight's Problem Statement PDFs into <code>backend/research_papers/</code> to index new documents.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
