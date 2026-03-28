export type SupportedSku = 'banana' | 'apple' | 'tomato';

export type RipenessBand = 'underripe' | 'firm_ripe' | 'ripe' | 'very_ripe' | 'overripe';

export interface SkuInfo {
  sku: SupportedSku;
  label: string;
  emoji: string;
  description: string;
}

/** Mapped from the backend RipenessAnalysis (POST /api/ripeness) */
export interface FreshnessAnalysis {
  sku: SupportedSku;
  score: number; // 1-10  (ripenessScore from backend)
  confidence: 'high' | 'medium' | 'low';
  visibleIssues: string[];  // visibleSignals from backend
  rationale: string;        // reasoning from backend
  ripenessBand: RipenessBand;
}

/** A single recipe recommendation returned by POST /api/recipes */
export interface BackendRecipe {
  id: number;
  title: string;
  imageUrl?: string;
  sourceName?: string;
  sourceUrl?: string;
  summary?: string;
  /** Why this recipe fits the current ripeness level */
  reason: string;
  ripenessFit: RipenessBand;
}

/** Full response from POST /api/recipes */
export interface BackendRecipeResponse {
  fruitName: SupportedSku;
  reasoning: string;
  recipes: BackendRecipe[];
  ripenessBand: RipenessBand;
  ripenessScore: number;
}

export type AppStep = 'select' | 'capture' | 'analyzing' | 'result';
