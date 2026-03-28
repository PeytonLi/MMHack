# MMHack

MMHack is a `pnpm` monorepo for a hackathon MVP that scores fruit ripeness from a photo and turns that result into recipe recommendations matched to the fruit's ripeness.

## Workspace

- `apps/api`: Express backend for probes, ripeness analysis, and recipe recommendation routes
- `apps/web`: existing Next.js scaffold, kept for future UI work
- `packages/shared`: shared types, constants, and schema validation
- `packages/ai`: Gemini-facing ripeness prompt and response parsing layer
- `packages/recipes`: Spoonacular recipe provider
- `packages/agent`: recommendation-selection seam for the eventual Railtracks replacement
- `packages/db`: Prisma + SQLite persistence scaffold, currently unused by the recipe flow
- `docs/implementation-plan.md`: saved implementation plan and product decisions
- `CODEX.md`: canonical project memory for future work

## Quick Start

1. Copy `.env.example` to `.env`.
2. Install dependencies with `pnpm install`.
3. Start the API with `pnpm --filter @mmhack/api dev`.

## Common Commands

- `pnpm dev`: run workspace dev scripts through Turbo
- `pnpm build`: build all packages and the Next.js app
- `pnpm lint`: run ESLint across the workspace
- `pnpm typecheck`: run TypeScript checks across the workspace
- `pnpm test`: run package-level test suites
- `pnpm test:e2e`: run the Playwright placeholder flow
- `pnpm --filter @mmhack/api dev`: run the Express API locally
- `pnpm db:generate`: generate the Prisma client
- `pnpm db:push`: apply the SQLite schema without creating a migration
- `pnpm db:migrate`: create and apply a Prisma migration
- `pnpm db:seed`: seed starter SKU records

## Environment Variables

- `NEXT_PUBLIC_APP_NAME`: app name shown in the UI
- `GOOGLE_GENERATIVE_AI_API_KEY`: Gemini API key
- `SPOONACULAR_API_KEY`: Spoonacular API key
- `DO_MODEL_ACCESS_KEY`: DigitalOcean Gradient serverless model access key
- `DO_GRADIENT_MODEL_ID`: hosted model id for the recipe-selection layer
- `API_PORT`: Express API port
- `DATABASE_URL`: SQLite database URL used by Prisma

For local development, point `DATABASE_URL` to a writable SQLite file. The default intended location is `file:./dev.db` inside `packages/db`.

## Deployment

The backend is optimized for deployment as a dedicated API service. The current implementation focuses on backend-first delivery: Gemini ripeness analysis, Spoonacular recipe lookup, and a recommendation layer that can use a DigitalOcean-hosted model today and later be swapped for a Python Railtracks sidecar once Python execution is available.

## Notes

- Playwright requires browser binaries. After install, run `pnpm exec playwright install chromium` if they are not already present.
- The project deliberately encodes current hackathon decisions in repo-local docs so future implementation turns do not depend on chat history.
