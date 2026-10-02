export type Language = 'en' | 'hi' | 'mr';

export type CropId = 'onion' | 'tomato' | 'soybean';

export interface Crop {
  id: CropId;
  emoji: string;
  name_en: string;
  name_hi: string;
  name_mr: string;
  shelfLifeDays: number;
}

export interface Mandi {
  id: string;
  name: string;
  name_mr: string;
  name_hi: string;
  distanceKm: number;
  forecastPrice: number;
  transportCost: number;
  spoilageLoss: number;
  netPerQuintal: number;
  isOptimal?: boolean;
}

export interface ForecastPoint {
  dayLabel: string;
  date: string;
  low: number;
  mid: number;
  high: number;
}

export interface RagSource {
  title: string;
  snippet: string;
  source: string;
}

export interface Recommendation {
  decision: 'SELL_NOW' | 'HOLD';
  cropId?: CropId;
  holdDays?: number;
  bestMandi: string;
  bestMandi_mr?: string;
  bestMandi_hi?: string;
  bestMandiId?: string;
  expectedGainPerQuintal: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  confidenceReason: string;
  mandis: Mandi[];
  forecastTrend?: ForecastPoint[];
  whyAdvice?: RagSource[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  recommendation?: Recommendation;
  feedback?: 'up' | 'down';
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  phone: string | null;
  isLoggedIn: boolean;
}

export interface UserPreferences {
  language: Language;
  crops: CropId[];
  onboardingComplete: boolean;
}
