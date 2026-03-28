# @mmhack/ai

Gemini-facing prompt construction, structured response parsing, and analysis client for fruit ripeness scoring.

## Features

- **Ripeness analysis**: Sends fruit images to Gemini and parses structured JSON responses with score, band, confidence, and reasoning.
- **Fruit mismatch detection**: Detects when the image doesn't match the selected fruit and returns a `fruit_mismatch` result instead of a ripeness score.
- **Quota error handling**: Catches Gemini 429/RESOURCE_EXHAUSTED errors and wraps them in a `GeminiQuotaError` with optional `retryAfterSeconds`.

## Commands

- `pnpm --filter @mmhack/ai test`
- `pnpm --filter @mmhack/ai typecheck`
- `pnpm --filter @mmhack/ai lint`
