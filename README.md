# MMHack

MMHack is a `pnpm` monorepo for a hackathon MVP that scores fruit ripeness from a photo and turns that result into recipe recommendations matched to the fruit's ripeness. The recipe selection layer uses **DigitalOcean Gradient** serverless inference to rank recipes with an LLM.

## Workspace

| Path | Description |
|---|---|
| `apps/api` | Express backend — probes, ripeness analysis, recipe recommendation routes |
| `apps/api-python` | Python FastAPI backend — LiteLLM-based agent alternative |
| `apps/web` | Next.js frontend — capture photo, display ripeness + recipes |
| `packages/shared` | Shared Zod schemas, types, constants, and utility helpers |
| `packages/ai` | Gemini ripeness prompt, mismatch detection, and quota error handling |
| `packages/recipes` | Spoonacular recipe provider |
| `packages/agent` | Recipe decision agents (DigitalOcean Gradient LLM, heuristic fallback) |
| `packages/db` | Prisma + SQLite persistence scaffold |
| `packages/pricing` | Deterministic pricing rules for freshness scores |
| `packages/vori` | VoriOS adapter boundaries |
| `scripts/` | DigitalOcean Gradient health check scripts |
| `docs/` | Implementation plan and product decisions |

## Quick Start

1. Copy `.env.example` to `.env` and fill in your API keys.
2. Install dependencies with `pnpm install`.
3. Start everything with `pnpm dev`, or just the API with `pnpm --filter @mmhack/api dev`.
4. Verify DigitalOcean Gradient connectivity: `node scripts/check-gradient.mjs`.

## Common Commands

| Command | Description |
|---|---|
| `pnpm dev` | Run all workspace dev scripts through Turbo |
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint across the workspace |
| `pnpm typecheck` | Run TypeScript checks across the workspace |
| `pnpm test` | Run package-level test suites |
| `pnpm test:e2e` | Run Playwright end-to-end tests |
| `pnpm --filter @mmhack/api dev` | Run the Express API locally |
| `node scripts/check-gradient.mjs` | Test DigitalOcean Gradient API connectivity |
| `pnpm db:generate` | Generate the Prisma client |
| `pnpm db:push` | Apply the SQLite schema without a migration |
| `pnpm db:migrate` | Create and apply a Prisma migration |
| `pnpm db:seed` | Seed starter SKU records |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key for ripeness analysis |
| `SPOONACULAR_API_KEY` | Yes | Spoonacular API key for recipe search |
| `DO_MODEL_ACCESS_KEY` | Yes | DigitalOcean Gradient model access key |
| `DO_GRADIENT_MODEL_ID` | No | Gradient model ID (default: `llama3.3-70b-instruct`) |
| `API_PORT` | No | Express API port (default: `4000`) |
| `DATABASE_URL` | No | SQLite URL for Prisma (default: `file:./dev.db`) |
| `NEXT_PUBLIC_APP_NAME` | No | App name shown in the web UI |

Get your DigitalOcean Gradient key from the [DigitalOcean console](https://cloud.digitalocean.com) under **Gradient > Serverless Inference > Model Access Keys**.

## Architecture

```
User → Web UI (Next.js)
         ↓
       API (Express)
         ├─→ Gemini (image → ripeness score + mismatch detection)
         ├─→ Spoonacular (fruit → recipe candidates)
         └─→ DigitalOcean Gradient LLM (candidates + ripeness → ranked recipes)
                ↳ fallback → Heuristic keyword agent
```

## Deployment

The backend is optimized for deployment as a dedicated API service. The recommendation layer uses DigitalOcean Gradient serverless inference (`llama3.3-70b-instruct` by default) and falls back to a heuristic keyword-matching agent if the LLM is unavailable.

## Notes

- Playwright requires browser binaries. After install, run `pnpm exec playwright install chromium` if they are not already present.
- The project deliberately encodes current hackathon decisions in repo-local docs so future implementation turns do not depend on chat history.
- Supported fruits for v1: `banana`, `apple`, `tomato`.
