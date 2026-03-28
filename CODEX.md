# MMHack Codex Memory

## Project Brief

Build a single-store hackathon MVP that lets a store employee select a produce SKU, capture a phone photo, score freshness with Gemini vision, convert that score into a deterministic pricing or discard action, and write the result to VoriOS.

## Current Product Decisions

- Single store only
- Hosted HTTPS app, optimized for Vercel
- Mobile-friendly web app, not a native mobile client
- Employee selects the SKU before taking the photo
- Live camera preview with on-demand capture, not continuous video analysis
- Supported SKUs for v1: `banana`, `apple`, `tomato`
- Gemini should return structured JSON with score, confidence, visible issues, and rationale
- AI is responsible for scoring and visible-decay analysis only
- Pricing and discard decisions are deterministic and rule-based

## Pricing Policy

- `10-9`: keep current price
- `8-6`: markdown `15%`
- `5-3`: markdown `35%`
- `2-1`: discard / remove from sale if Vori supports it

## Fail-Safe Rules

- Low confidence becomes `manual_review`
- Invalid or malformed model output becomes `manual_review`
- Missing SKU mapping or failed Vori write should be recorded in the audit log
- If Vori cannot mark an item unavailable, discard should fall back to an audit record plus an operator removal instruction

## Persistence Expectations

- Store raw image file references plus metadata in the audit trail
- SQLite is the persistence target for v1
- Prisma owns schema, migrations, and client generation

## Stack Choices

- Monorepo: `pnpm` + `Turborepo`
- Web app: Next.js App Router + Tailwind CSS + TypeScript
- Validation: `zod`
- Database: Prisma + SQLite
- Tests: Vitest + Playwright

## Non-Goals For This Scaffold

- No continuous video scoring
- No multi-store support
- No mock/demo mode
- No full auth or role system
- No production-hardening beyond clean package boundaries and typed interfaces
