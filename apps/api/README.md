# @mmhack/api

Express backend for ripeness analysis, external API probe checks, and recipe recommendation orchestration.

## Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `GET` | `/probe/gemini` | Validate Gemini API connectivity |
| `GET` | `/probe/gradient` | Validate DigitalOcean Gradient API connectivity |
| `GET` | `/probe/spoonacular` | Validate Spoonacular API connectivity |
| `POST` | `/api/ripeness` | Analyze fruit ripeness from an image |
| `POST` | `/api/recipes` | Get ripeness-matched recipe recommendations |

## Key Behaviors

- **Fruit mismatch detection**: If the image doesn't match the selected fruit, returns a `fruit_mismatch` status without fetching recipes.
- **Pre-analyzed input**: `POST /api/recipes` accepts an optional `analysis` field to skip the Gemini call when the client already has ripeness data.
- **Gemini quota handling**: Returns a structured `429` response with `retryAfterSeconds` when Gemini rate limits are hit.
- **Gradient fallback**: Uses DigitalOcean Gradient LLM for recipe selection when `DO_MODEL_ACCESS_KEY` is set, otherwise falls back to heuristic keyword scoring.

## Commands

- `pnpm --filter @mmhack/api dev`
- `pnpm --filter @mmhack/api test`
- `pnpm --filter @mmhack/api build`
