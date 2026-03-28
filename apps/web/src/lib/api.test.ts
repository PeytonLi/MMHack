import { afterEach, describe, expect, it, vi } from 'vitest';
import { analyzeRipeness, getRecipeRecommendations } from '@/lib/api';

describe('analyzeRipeness', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps fruit mismatch responses into the frontend mismatch shape', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            status: 'fruit_mismatch',
            selectedFruit: 'banana',
            detectedFruit: 'tomato',
            confidence: 'high',
            reasoning: 'This image shows a green tomato, not a banana.',
            visibleSignals: ['round shape', 'green skin'],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(analyzeRipeness('banana', 'data:image/jpeg;base64,abc123')).resolves.toEqual({
      status: 'fruit_mismatch',
      sku: 'banana',
      detectedSku: 'tomato',
      confidence: 'high',
      rationale: 'This image shows a green tomato, not a banana.',
      visibleIssues: ['round shape', 'green skin'],
    });
  });

  it('maps structured quota exhaustion into a friendly error message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            error: 'quota_exhausted',
            message: 'Gemini is out of requests right now. Try again in 38 seconds.',
            provider: 'gemini',
            retryAfterSeconds: 38,
          }),
          { status: 429 },
        ),
      ),
    );

    await expect(analyzeRipeness('banana', 'data:image/jpeg;base64,abc123')).rejects.toThrow(
      'Gemini is out of requests right now. Try again in 38 seconds.',
    );
  });

  it('sends the prior analysis to the recipe endpoint instead of image data', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(
        JSON.stringify({
          status: 'ok',
          fruitName: 'banana',
          reasoning: 'Very ripe bananas fit baking well.',
          recipes: [],
          ripenessBand: 'overripe',
          ripenessScore: 9,
        }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchSpy);

    await getRecipeRecommendations('banana', {
      status: 'ok',
      sku: 'banana',
      score: 9,
      confidence: 'high',
      visibleIssues: ['brown peel'],
      rationale: 'Very ripe banana.',
      ripenessBand: 'overripe',
    });

    expect(fetchSpy).toHaveBeenCalledWith('/api/recipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fruitName: 'banana',
        analysis: {
          status: 'ok',
          sku: 'banana',
          score: 9,
          confidence: 'high',
          visibleIssues: ['brown peel'],
          rationale: 'Very ripe banana.',
          ripenessBand: 'overripe',
        },
      }),
    });
  });
});
