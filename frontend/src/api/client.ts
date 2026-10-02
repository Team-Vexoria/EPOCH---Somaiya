import type {
  ChatRequest,
  ChatResponse,
  HeatmapResponse,
  FpoPlanRequest,
  FpoPlanResponse,
  BacktestResponse,
} from './types';
import { MANDIS, type MandiConfig } from '../config/mandis';
import {
  generateMockChatResponse,
  generateMockHeatmap,
  generateMockFpoPlan,
  generateMockBacktest,
} from './mockData';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true'; // Defaults to false: connects to live CRAG backend

/**
 * 1. POST /api/chat (or mock)
 */
export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  if (USE_MOCKS) {
    // Realistic network delay
    await new Promise((r) => setTimeout(r, 400));
    return generateMockChatResponse(req);
  }

  const res = await fetch(`${API_BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`Chat API Error: ${res.statusText}`);
  return await res.json();
}

/**
 * 2. GET /api/mandis?district=nashik (or mock)
 */
export async function fetchMandis(_district = 'nashik'): Promise<MandiConfig[]> {
  if (USE_MOCKS) {
    return MANDIS;
  }
  const res = await fetch(`${API_BASE_URL}/api/mandis?district=${_district}`);
  if (!res.ok) throw new Error(`Mandis API Error: ${res.statusText}`);
  return await res.json();
}

/**
 * 3. GET /api/heatmap?crop=&horizonDays=&village= (or mock)
 */
export async function fetchHeatmap(crop = 'onion', horizonDays = 0, village = 'niphad_rural'): Promise<HeatmapResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 200));
    return generateMockHeatmap(crop, horizonDays, village);
  }
  const res = await fetch(`${API_BASE_URL}/api/heatmap?crop=${crop}&horizonDays=${horizonDays}&village=${village}`);
  if (!res.ok) throw new Error(`Heatmap API Error: ${res.statusText}`);
  return await res.json();
}

/**
 * 4. POST /api/fpo/plan (or mock)
 */
export async function fetchFpoPlan(req: FpoPlanRequest): Promise<FpoPlanResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 300));
    return generateMockFpoPlan(req);
  }
  const res = await fetch(`${API_BASE_URL}/api/fpo/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
  if (!res.ok) throw new Error(`FPO Plan API Error: ${res.statusText}`);
  return await res.json();
}

/**
 * 5. GET /api/backtest?crop=&from=&to= (or mock)
 */
export async function fetchBacktest(crop = 'onion', _from = '', _to = ''): Promise<BacktestResponse> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 250));
    return generateMockBacktest(crop);
  }
  const res = await fetch(`${API_BASE_URL}/api/backtest?crop=${crop}&from=${_from}&to=${_to}`);
  if (!res.ok) throw new Error(`Backtest API Error: ${res.statusText}`);
  return await res.json();
}

/**
 * 6. POST /api/transcribe (Whisper stub for Marathi/Hindi audio)
 */
export async function transcribeAudio(_audioBlob: Blob): Promise<{ text: string }> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 500));
    return { text: 'कांदा 30 क्विंटल लासलगाव कधी विकू?' };
  }
  const formData = new FormData();
  formData.append('audio', _audioBlob);
  const res = await fetch(`${API_BASE_URL}/api/transcribe`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`Transcribe API Error: ${res.statusText}`);
  return await res.json();
}
