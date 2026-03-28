# @mmhack/shared

Shared domain types, constants, and validation helpers for the MMHack monorepo.

## Key Exports

**Constants**: `SUPPORTED_SKUS`, `CONFIDENCE_LEVELS`, `RIPENESS_BANDS`, `ANALYSIS_STATUSES`

**Schemas**:
- `fruitImageRequestSchema`, `recipeRequestSchema` — API input validation
- `ripenessAnalysisSchema`, `fruitMismatchAnalysisSchema` — Gemini output parsing
- `ripenessAnalysisResultSchema` — discriminated union (`ok` | `fruit_mismatch`)
- `recipeCandidateSchema`, `recipeRecommendationSchema`, `recipeResponseSchema` — recipe pipeline
- `recipeApiResponseSchema` — discriminated union for full recipe API response
- `probeStatusSchema`, `quotaErrorResponseSchema` — probe and error responses
- Legacy: `freshnessAnalysisSchema`, `pricingActionSchema`, `auditRecordSchema`

**Utilities**: `getRipenessBand()`, `isLowConfidence()`

## Commands

- `pnpm --filter @mmhack/shared build`
- `pnpm --filter @mmhack/shared typecheck`
- `pnpm --filter @mmhack/shared lint`
