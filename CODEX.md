# MMHack Codex Memory

## Project Brief

Build a hackathon MVP that lets a user submit a fruit photo, score ripeness with Gemini vision, and return recipes whose best use matches that fruit's ripeness.

## Current Product Decisions

- Lovable frontend will call a backend in this repo
- Backend should be a separate Express service
- Supported fruits for v1 remain `banana`, `apple`, `tomato`
- Gemini should return structured JSON with ripeness score, confidence, visible signals, and reasoning
- Ripeness score semantics are `1 = underripe`, `10 = overripe`
- The core product route accepts `fruitName` plus image payload
- The recipe provider is Spoonacular
- The recommendation layer should choose from fetched recipes instead of generating recipes from scratch
- The preferred hosted model path is DigitalOcean Gradient for the recipe-selection layer

## Fail-Safe Rules

- Invalid or malformed model output should fail the request clearly
- No recipe candidates should produce an explicit backend error
- Gemini and Spoonacular should each keep a probe route separate from product routes
- The foundational ripeness route must remain usable even if recipe integration is failing

## Persistence Expectations

- Persistence is not required for the first backend slice
- Existing SQLite/Prisma scaffolding can be reused later if request logging becomes necessary

## Stack Choices

- Monorepo: `pnpm` + `Turborepo`
- API: Express + TypeScript
- Existing web app: Next.js App Router + Tailwind CSS + TypeScript
- Validation: `zod`
- Recipe provider: Spoonacular
- AI provider: Gemini
- Hosted model layer: DigitalOcean Gradient serverless inference
- Tests: Vitest + Playwright
- Agent seam: TypeScript heuristic selector for now

## Non-Goals For This Phase

- No Unkey or rate limiting yet
- No frontend implementation in this repo beyond the existing placeholder app
- No Vori pricing integration
- No live Railtracks service until Python execution is available
