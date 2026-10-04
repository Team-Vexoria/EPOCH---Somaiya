/**
 * API Client & SSE Streamer for Agentic Corrective RAG (CRAG) Backend.
 */

import { API_BASE_URL } from '../config/constants';

export interface CragStep {
  step: string;
  status: string;
  details: string;
  time_taken: number;
}

export interface CragResponse {
  answer: string;
  sources: string[];
  path: 'rag' | 'corrective';
  steps: CragStep[];
  time_taken: number;
}

export interface StreamCallbacks {
  onStep?: (data: { step: string; message: string }) => void;
  onStepDone?: (data: { step: string; details: string; time_taken: number; web_search_needed?: string }) => void;
  onComplete?: (data: CragResponse) => void;
  onError?: (error: Error) => void;
}

/**
 * Health check utility
 */
export async function checkBackendHealth(): Promise<{ status: string; system?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/`, { method: 'GET' });
    if (!res.ok) throw new Error('Health check failed');
    return await res.json();
  } catch {
    return { status: 'offline' };
  }
}

/**
 * Synchronous Ask Query
 */
export async function askCrag(question: string): Promise<CragResponse> {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`CRAG Backend Error [${response.status}]: ${errText || response.statusText}`);
  }

  return (await response.json()) as CragResponse;
}

/**
 * Live Server-Sent Events (SSE) Streamer
 * Connects to GET /ask/stream?question=...
 * Returns a cancel/cleanup function.
 */
export function streamCrag(question: string, callbacks: StreamCallbacks): () => void {
  const encodedQ = encodeURIComponent(question);
  const streamUrl = `${API_BASE_URL}/ask/stream?question=${encodedQ}`;
  const es = new EventSource(streamUrl);

  es.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.event === 'step') {
        callbacks.onStep?.({ step: data.step, message: data.message });
      } else if (data.event === 'step_done') {
        callbacks.onStepDone?.({
          step: data.step,
          details: data.details,
          time_taken: data.time_taken,
          web_search_needed: data.web_search_needed,
        });
      } else if (data.event === 'complete') {
        callbacks.onComplete?.({
          answer: data.answer,
          sources: data.sources || [],
          path: data.path || 'rag',
          steps: data.steps || [],
          time_taken: data.time_taken || 0,
        });
        es.close();
      }
    } catch (parseErr) {
      console.warn('Failed to parse SSE payload:', parseErr);
    }
  };

  es.onerror = (err) => {
    console.error('SSE connection error:', err);
    es.close();
    callbacks.onError?.(new Error('SSE connection failed or closed.'));
  };

  return () => {
    es.close();
  };
}
