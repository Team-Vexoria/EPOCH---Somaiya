/**
 * Lightweight API Client wrapper for backend communication.
 * Connects to FastAPI or Express backend via VITE_API_URL.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  data?: unknown;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { data, headers, ...customConfig } = options;

  const config: RequestInit = {
    method: data ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    ...customConfig,
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API Error [${response.status}]: ${errorBody || response.statusText}`);
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Request to ${url} failed:`, error);
    throw error;
  }
}

/**
 * Health check utility
 */
export async function checkBackendHealth(): Promise<{ status: string; timestamp?: string }> {
  try {
    return await apiClient<{ status: string; timestamp?: string }>('/api/health');
  } catch {
    return { status: 'offline' };
  }
}

/**
 * RAG Query helper placeholder ready for when backend agent is plugged in
 */
export async function queryRagAgent(query: string, documentId?: string): Promise<{ answer: string; sources?: string[] }> {
  return await apiClient<{ answer: string; sources?: string[] }>('/api/rag/query', {
    data: { query, document_id: documentId },
  });
}
