export type DecisionType = 'SELL_NOW' | 'HOLD';
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ForecastPoint {
  date: string;
  dayLabel: string;
  low: number;
  mid: number;
  high: number;
}

export interface MandiNetComparison {
  id: string;
  name: string;
  name_mr: string;
  name_hi: string;
  distanceKm: number;
  forecastPrice: number;
  transportCost: number;
  spoilageLoss: number;
  netPerQuintal: number;
  totalNet: number;
  isBest: boolean;
  transportExplanation?: string;
  priceExplanation?: string;
  spoilageExplanation?: string;
}

export interface Recommendation {
  decision: DecisionType;
  holdDays?: number;
  bestMandi: string;
  bestMandi_mr: string;
  bestMandi_hi: string;
  expectedGainPerQuintal: number;
  totalGain: number;
  confidence: ConfidenceLevel;
  confidenceReason: string;
  confidenceReason_mr: string;
  confidenceReason_hi: string;
  forecast: ForecastPoint[];
  mandis: MandiNetComparison[];
}

export interface RagSource {
  title: string;
  snippet: string;
  url?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  recommendation?: Recommendation;
  sources?: RagSource[];
  timestamp: string;
}

export interface ChatRequest {
  message: string;
  language: 'mr' | 'hi' | 'en';
  crop?: string;
  quantity?: number;
  village?: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface ChatResponse {
  text: string;
  recommendation?: Recommendation;
  sources?: RagSource[];
}

export interface HeatmapItem {
  mandiId: string;
  name: string;
  name_mr: string;
  name_hi: string;
  lat: number;
  lng: number;
  distanceKm: number;
  forecastPrice: number;
  transportCost: number;
  spoilageLoss: number;
  netReturn: number;
  arrivalsTodayQuintals: number;
  confidence: ConfidenceLevel;
  sparkline: number[];
  transportExplanation?: string;
  priceExplanation?: string;
  spoilageExplanation?: string;
}

export interface HeatmapResponse {
  crop: string;
  horizonDays: number;
  village: string;
  items: HeatmapItem[];
  topMandiId: string;
}

export interface FpoAllocation {
  mandiId: string;
  mandiName: string;
  mandiName_mr: string;
  percentage: number;
  quantityQuintals: number;
  dailyArrivalsQuintals?: number;
  intakeSharePct?: number;
  absorptionStatus?: 'SAFE' | 'MODERATE' | 'RISK';
  absorptionLabel?: string;
  absorptionLabel_mr?: string;
  glutPricePenaltyAvoided?: number;
  expectedPrice: number;
  estimatedFreight: number;
  netRevenue: number;
  trucksNeeded: number;
  dispatchDate: string;
  capacityWarning?: string;
}

export interface FpoPlanRequest {
  crop: string;
  quantity: number;
  village: string;
  horizonDays: number;
}

export interface FpoPlanResponse {
  totalQuantity: number;
  metricTonnes?: number;
  totalTrucks?: number;
  membersPooled?: number;
  bulkFreightSavings?: number;
  hubId?: string;
  hubName?: string;
  hubName_mr?: string;
  registeredMembers?: number;
  taluka?: string;
  totalRevenue: number;
  baselineRevenue: number; // if sold at nearest mandi today
  extraRevenueEarned: number;
  percentageGain: number;
  bestMandi: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  allocations: FpoAllocation[];
  totalGlutLossAvoided?: number;
  singleDumpSharePct?: number;
  singleDumpMandiName?: string;
  priceDepressionPerQtl?: number;
  maxIntakeSharePct?: number;
  glutRiskExplanation?: string;
  glutRiskExplanation_mr?: string;
}

export interface BacktestDecision {
  date: string;
  crop: string;
  adviceGiven: string;
  optimalMandi: string;
  nearestMandi: string;
  actualPriceRealized: number;
  baselinePrice: number;
  netRupeeGainPerQuintal: number;
  wasOptimal: boolean;
}

export interface BacktestResponse {
  crop: string;
  season: string;
  totalDecisions: number;
  averageGainPerQuintal: number;
  totalPotentialGainedPerFarmer100Qtl: number;
  accuracyRate: number; // percentage of times recommendation beat harvest-day baseline
  cumulativeTimeline: Array<{ date: string; MohraNet: number; baselineNet: number }>;
  sampleDecisions: BacktestDecision[];
}
