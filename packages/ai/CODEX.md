# @mmhack/ai Codex Notes

- Gemini output must stay in a strict JSON shape.
- The response must include `sku`, `score`, `confidence`, `visibleIssues`, and `rationale`.
- Low confidence should not be coerced into a pricing action. Downstream code should treat it as `manual_review`.
- The model is for freshness scoring only, not for deciding markdown percentages.
- Keep the prompt tuned to controlled employee photos, not arbitrary consumer images.
