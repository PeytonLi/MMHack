# MMHack

MMHack is a `pnpm` monorepo for a hackathon MVP that scores produce freshness from a phone-captured image, converts that score into a deterministic pricing action, and pushes the result into VoriOS.

## Workspace

- `apps/web`: Next.js mobile web app for SKU selection, camera capture, analysis review, and audit history
- `packages/shared`: shared types, constants, and schema validation
- `packages/pricing`: rule engine that maps freshness score to keep, markdown, discard, or manual review
- `packages/ai`: Gemini-facing prompt and response parsing layer
- `packages/vori`: VoriOS adapter surface and typed request helpers
- `packages/db`: Prisma + SQLite persistence for SKU config and audit logging
- `docs/implementation-plan.md`: saved implementation plan and product decisions
- `CODEX.md`: canonical project memory for future work

## Quick Start

1. Copy `.env.example` to `.env`.
2. Install dependencies with `pnpm install`.
3. Push the SQLite schema with `pnpm db:push`.
4. Start the app with `pnpm dev`.

## Common Commands

- `pnpm dev`: run the web app through Turbo
- `pnpm build`: build all packages and the Next.js app
- `pnpm lint`: run ESLint across the workspace
- `pnpm typecheck`: run TypeScript checks across the workspace
- `pnpm test`: run package-level test suites
- `pnpm test:e2e`: run the Playwright placeholder flow
- `pnpm db:generate`: generate the Prisma client
- `pnpm db:push`: apply the SQLite schema without creating a migration
- `pnpm db:migrate`: create and apply a Prisma migration
- `pnpm db:seed`: seed starter SKU records

## Environment Variables

- `NEXT_PUBLIC_APP_NAME`: app name shown in the UI
- `GOOGLE_GENERATIVE_AI_API_KEY`: Gemini API key
- `VORI_API_BASE_URL`: Vori API base URL
- `VORI_API_KEY`: Vori API key
- `DATABASE_URL`: SQLite database URL used by Prisma

For local development, point `DATABASE_URL` to a writable SQLite file. The default intended location is `file:./dev.db` inside `packages/db`.

## Deployment

The scaffold is optimized for a hosted HTTPS deployment, with Vercel as the primary target so phone camera permissions work reliably during demos. The web app includes placeholder routes and env wiring, but the live Gemini and Vori calls are still stubbed behind package APIs for the next implementation turn.

## Notes

- Playwright requires browser binaries. After install, run `pnpm exec playwright install chromium` if they are not already present.
- The project deliberately encodes current hackathon decisions in repo-local docs so future implementation turns do not depend on chat history.
