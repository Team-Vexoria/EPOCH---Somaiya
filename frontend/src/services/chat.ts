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

    // Direct call to the backend CRAG pipeline
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
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

    if (!response.ok) {
      throw new Error(`CRAG Backend Server Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const rawText = data.text || data.answer || 'No response generated from CRAG.';

    // Stream the real tokens word-by-word into the chat UI
    const words = rawText.split(' ');
    let accumulated = '';

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError');
      }

      accumulated += (i === 0 ? '' : ' ') + words[i];
      onChunk(accumulated);

      // Fast, natural token delivery (16ms per word)
      await new Promise((resolve) => setTimeout(resolve, 16));
    }

    // Extract dynamic recommendation if present from backend
    const recommendation: Recommendation | undefined = data.recommendation || undefined;

    onDone(rawText, recommendation);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return;
    }

    // If backend is not running, provide an honest, helpful diagnostic
    const offlineMsg =
      language === 'mr'
        ? '⚠️ **CRAG बॅकएंड सर्व्हरशी संपर्क होऊ शकला नाही.**\n\nकृपया `backend` फोल्डरमध्ये `python main.py` सुरू असल्याची खात्री करा (http://localhost:8000).'
        : language === 'hi'
        ? '⚠️ **CRAG बैकएंड सर्वर से कनेक्शन नहीं हो पाया।**\n\nकृपया सुनिश्चित करें कि `backend` डायरेक्टरी में `python main.py` चल रहा है (http://localhost:8000).'
        : '⚠️ **Unable to connect to the CRAG Backend Server.**\n\nPlease ensure the FastAPI server is running (`python main.py` in the `backend/` directory on http://localhost:8000).';

    onChunk(offlineMsg);
    onDone(offlineMsg, undefined);
    onError(err);
  }
}
