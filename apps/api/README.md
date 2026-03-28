# @mmhack/api

Express backend for ripeness analysis, external API probe checks, and recipe recommendation orchestration.

## Routes

- `GET /health`
- `GET /probe/gemini`
- `GET /probe/gradient`
- `GET /probe/spoonacular`
- `POST /api/ripeness`
- `POST /api/recipes`

## Commands

- `pnpm --filter @mmhack/api dev`
- `pnpm --filter @mmhack/api test`
- `pnpm --filter @mmhack/api build`
