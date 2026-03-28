export type SupportedSku = 'banana' | 'apple' | 'tomato' | 'avocado' | 'strawberry' | 'mango' | 'peach' | 'pear' | 'pineapple' | 'lettuce' | 'bell_pepper' | 'broccoli';

export type RipenessBand = 'underripe' | 'firm_ripe' | 'ripe' | 'very_ripe' | 'overripe';
export type AnalysisStatus = 'ok' | 'fruit_mismatch';

export interface SkuInfo {
  sku: SupportedSku;
  label: string;
  emoji: string;
  description: string;
}

/** Mapped from the backend RipenessAnalysis (POST /api/ripeness) */
export interface FreshnessMatchAnalysis {
  status: 'ok';
  sku: SupportedSku;
  score: number; // 1-10  (ripenessScore from backend)
  confidence: 'high' | 'medium' | 'low';
  visibleIssues: string[];  // visibleSignals from backend
  rationale: string;        // reasoning from backend
  ripenessBand: RipenessBand;
}

export interface FreshnessMismatchAnalysis {
  status: 'fruit_mismatch';
  sku: SupportedSku;
  detectedSku: SupportedSku | null;
  confidence: 'high' | 'medium' | 'low';
  visibleIssues: string[];
  rationale: string;
}

export type FreshnessAnalysis = FreshnessMatchAnalysis | FreshnessMismatchAnalysis;

export interface NutritionFacts {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

/** A single recipe recommendation returned by POST /api/recipes */
export interface BackendRecipe {
  id: number;
  title: string;
  imageUrl?: string;
  nutrition?: NutritionFacts;
  readyInMinutes?: number;
  servings?: number;
  sourceName?: string;
  sourceUrl?: string;
  summary?: string;
  /** Why this recipe fits the current ripeness level */
  reason: string;
  ripenessFit: RipenessBand;
}

/** Full response from POST /api/recipes */
export interface BackendRecipeSuccessResponse {
  status: 'ok';
  fruitName: SupportedSku;
  reasoning: string;
  recipes: BackendRecipe[];
  ripenessBand: RipenessBand;
  ripenessScore: number;
}

export interface BackendRecipeMismatchResponse {
  status: 'fruit_mismatch';
  selectedFruit: SupportedSku;
  detectedFruit: SupportedSku | null;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  visibleSignals: string[];
}

export type BackendRecipeResponse = BackendRecipeSuccessResponse | BackendRecipeMismatchResponse;

export type AppStep = 'select' | 'capture' | 'analyzing' | 'result';
