import type { FreshnessAnalysis, BackendRecipeResponse, SupportedSku } from '@/types/freshness';

/**
 * Extracts the base64 data and MIME type from a data URL produced by canvas.toDataURL().
 */
function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
  const [header, base64] = dataUrl.split(',');
  const mimeType = header.match(/data:([^;]+)/)?.[1] ?? 'image/jpeg';
  return { base64, mimeType };
}

/**
 * POST /api/ripeness
 * Analyzes the ripeness of a fruit image via the backend (Gemini AI).
 * Returns a FreshnessAnalysis mapped from the backend RipenessAnalysis shape.
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
    const text = await response.text().catch(() => '');
    throw new Error(`Ripeness analysis failed (${response.status}): ${text}`);
  }

  // Backend returns RipenessAnalysis:
  // { fruitName, ripenessScore, confidence, visibleSignals, reasoning, ripenessBand }
  const data = await response.json();

  // Map backend shape → frontend FreshnessAnalysis shape
  return {
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
 * Analyzes the image and returns AI-ranked recipe recommendations via the backend.
 */
export async function getRecipeRecommendations(
  sku: SupportedSku,
  imageDataUrl: string,
): Promise<BackendRecipeResponse> {
  const { base64, mimeType } = parseDataUrl(imageDataUrl);

  const response = await fetch('/api/recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fruitName: sku, imageBase64: base64, mimeType }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Recipe recommendations failed (${response.status}): ${text}`);
  }

  return response.json() as Promise<BackendRecipeResponse>;
}

