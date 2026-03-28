import type {
  BackendRecipeResponse,
  FreshnessAnalysis,
  FreshnessMatchAnalysis,
  RecipeAssistantMessage,
  RecipeAssistantResponse,
  SupportedSku,
} from '@/types/freshness';

type ApiErrorPayload = {
  error?: string;
  message?: string;
  retryAfterSeconds?: number;
};

/**
 * Extracts the base64 data and MIME type from a data URL produced by canvas.toDataURL().
 */
function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  return { base64, mimeType };
}

function mapAnalysisForBackend(analysis: FreshnessMatchAnalysis) {
  return {
    status: 'ok' as const,
    confidence: analysis.confidence,
    fruitName: analysis.sku,
    reasoning: analysis.rationale,
    ripenessBand: analysis.ripenessBand,
    ripenessScore: analysis.score,
    visibleSignals: analysis.visibleIssues,
  };
}

async function buildApiError(response: Response, fallbackPrefix: string): Promise<Error> {
  let payload: ApiErrorPayload | null = null;
  let rawText = '';

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    rawText = await response.text().catch(() => '');
  }

  if (payload?.error === 'quota_exhausted') {
    return new Error(payload.message ?? 'Gemini is out of requests right now. Please try again later.');
  }

  if (payload?.error === 'invalid_request') {
    if (fallbackPrefix.includes('assistant')) {
      return new Error('Recipe assistant could not process that request.');
    }
    return new Error(
      fallbackPrefix.startsWith('Recipe')
        ? 'Recipe recommendations could not be loaded right now.'
        : 'This request could not be processed. Please try again.',
    );
  }

  const detail = payload?.message ?? payload?.error ?? rawText;
  return new Error(`${fallbackPrefix} (${response.status})${detail ? `: ${detail}` : ''}`);
}

/**
 * POST /api/ripeness
 * Analyzes the ripeness of a fruit image via the backend.
 */
export async function analyzeRipeness(
  sku: SupportedSku,
  imageDataUrl: string,
): Promise<FreshnessAnalysis> {
  const { base64, mimeType } = parseDataUrl(imageDataUrl);

  const response = await fetch('/api/ripeness', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fruitName: sku, imageBase64: base64, mimeType }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Ripeness analysis failed');
  }

  const data = await response.json();

  if (data.status === 'fruit_mismatch') {
    return {
      status: 'fruit_mismatch',
      sku: data.selectedFruit,
      detectedSku: data.detectedFruit ?? null,
      confidence: data.confidence,
      visibleIssues: data.visibleSignals ?? [],
      rationale: data.reasoning,
    } satisfies FreshnessAnalysis;
  }

  return {
    status: 'ok',
    sku: data.fruitName,
    score: data.ripenessScore,
    confidence: data.confidence,
    visibleIssues: data.visibleSignals ?? [],
    rationale: data.reasoning,
    ripenessBand: data.ripenessBand,
  } satisfies FreshnessAnalysis;
}

/**
 * POST /api/recipes
 * Returns AI-ranked recipe recommendations using an already-computed analysis.
 */
export async function getRecipeRecommendations(
  sku: SupportedSku,
  analysis: FreshnessMatchAnalysis,
): Promise<BackendRecipeResponse> {
  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fruitName: sku, analysis: mapAnalysisForBackend(analysis) }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Recipe recommendations failed');
  }

  return response.json() as Promise<BackendRecipeResponse>;
}

/**
 * POST /api/recipe-assistant
 * Sends a grounded recipe assistant turn for the current scan context.
 */
export async function sendRecipeAssistantMessage(
  sku: SupportedSku,
  analysis: FreshnessMatchAnalysis,
  history: RecipeAssistantMessage[],
  message: string,
): Promise<RecipeAssistantResponse> {
  const response = await fetch('/api/recipe-assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fruitName: sku,
      analysis: mapAnalysisForBackend(analysis),
      history,
      message,
    }),
  });

  if (!response.ok) {
    throw await buildApiError(response, 'Recipe assistant failed');
  }

  return response.json() as Promise<RecipeAssistantResponse>;
}
