# MMHack Implementation Plan

## Product Summary

- Build a hosted HTTPS, mobile-friendly Next.js app for a single-store workflow.
- The employee selects a SKU first, then uses a live in-browser camera preview on their phone to capture one image of that item.
- v1 supports exactly three SKUs: `banana`, `apple`, and `tomato`.
- The app sends the captured image plus selected SKU to Gemini vision using a structured prompt and strict JSON response schema.
- Gemini returns a `1-10` freshness score plus confidence and visible defect notes.
- A deterministic pricing policy converts the score into one of four actions:
  - `10-9`: keep current price
  - `8-6`: markdown `15%`
  - `5-3`: markdown `35%`
  - `2-1`: discard / remove from sale
- If confidence is low, the response is malformed, or the result is otherwise unreliable, the system fails safe and does not write to Vori; it shows `manual_review` or retry instead.
- If the result is valid, the app writes the new price or availability action to VoriOS and stores an audit record with the image and outcome.

## Monorepo Scaffold

- Root workspace managed by `pnpm` and `Turborepo`
- `apps/web` for the employee-facing mobile web app
- `packages/shared` for domain types and schema validation
- `packages/pricing` for rule-based pricing decisions
- `packages/ai` for Gemini prompts, parsing, and client boundaries
- `packages/vori` for VoriOS read/write contracts
- `packages/db` for Prisma schema, SQLite persistence, and audit storage
- Root docs and `CODEX.md` as the canonical repo-local memory of product decisions

## Public Interfaces

- `SupportedSku = 'banana' | 'apple' | 'tomato'`
- `FreshnessAnalysis = { sku; score; confidence; visibleIssues; rationale }`
- `PricingAction = { type; markdownPercent?; voriOperation }`
- `AuditRecord = { id; sku; imagePath; score; confidence; actionType; markdownPercent?; voriItemId; voriResult; createdAt }`

## Initial Build Priorities

1. Scaffold the workspace and docs so implementation no longer depends on chat history.
2. Wire the app and packages with placeholder exports and typed boundaries.
3. Add test harnesses for pricing, AI schema validation, DB create/read, and a placeholder browser flow.
4. Verify install, typecheck, build, and test behavior locally.

## Defaults Locked In

- Single demo operator, no auth system in v1
- Live APIs only, no mock mode in the initial scaffold
- Hosted URL as the primary phone access path
- SQLite for local persistence
- Vercel as the intended first deployment target
