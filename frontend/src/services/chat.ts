import type { Language, CropId, Recommendation, Message } from '../types';
import { useAppStore } from '../store/useAppStore';

export interface SendMessageParams {
  message: string;
  language: Language;
  crops: CropId[];
  history: Message[];
  onChunk: (chunk: string) => void;
  onDone: (fullText: string, recommendation?: Recommendation) => void;
  onError: (err: any) => void;
  signal?: AbortSignal;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function detectCropFromQuery(query: string, userCrops: CropId[]): CropId | undefined {
  const lower = query.toLowerCase();
  if (lower.includes('onion') || lower.includes('कांदा') || lower.includes('कांदे') || lower.includes('प्याज') || lower.includes('lasalgaon') || lower.includes('लासलगाव')) {
    return 'onion';
  }
  if (lower.includes('tomato') || lower.includes('टोमॅटो') || lower.includes('टमाटर') || lower.includes('pimpalgaon') || lower.includes('पिंपळगाव')) {
    return 'tomato';
  }
  if (lower.includes('soybean') || lower.includes('सोयाबीन') || lower.includes('malegaon') || lower.includes('मालेगाव')) {
    return 'soybean';
  }
  if (userCrops && userCrops.length > 0) {
    return userCrops[0];
  }
  return undefined;
}

/**
 * Sends a message directly to the Agentic Corrective RAG (CRAG) backend
 * and streams the genuine AI-synthesized response into the UI.
 */
export async function sendMessage({
  message,
  language,
  crops,
  onChunk,
  onDone,
  onError,
  signal,
}: SendMessageParams): Promise<void> {
  try {
    const activeCrop = detectCropFromQuery(message, crops);
    const storeState = useAppStore.getState();
    const batchQty = activeCrop ? (storeState.cropQuantities?.[activeCrop] || 20) : 20;

    let response: Response;

    // 1. Try primary /ask endpoint with fallback to /api/chat
    try {
      response = await fetch(`${API_BASE_URL}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: message }),
        signal,
      });

      if (!response.ok && response.status === 404) {
        response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            language,
            crop: activeCrop,
            quantity: batchQty,
            village: 'niphad_rural',
          }),
          signal,
        });
      }
    } catch {
      response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          language,
          crop: activeCrop,
          quantity: batchQty,
          village: 'niphad_rural',
        }),
        signal,
      });
    }

    if (!response.ok) {
      throw new Error(`CRAG Backend Server Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.answer || data.text || 'No response generated from CRAG.';

    // Stream the real tokens word-by-word into the chat UI
    const words = rawText.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
      }

      accumulated += (i === 0 ? '' : ' ') + words[i];
      onChunk(accumulated);

      // Natural, crisp token delivery (16ms per word)
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    const recommendation: Recommendation | undefined = data.recommendation || undefined;
    onDone(rawText, recommendation);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return;
    }
    onError(err);
  }
}
