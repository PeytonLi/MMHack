# @mmhack/ai Codex Notes

- Gemini output must stay in a strict JSON shape.
- The response must include `fruitName`, `ripenessScore`, `confidence`, `visibleSignals`, and `reasoning`.
- Ripeness is not freshness. The score scale is `1 = underripe` and `10 = overripe`.
- Low confidence should not be hidden; downstream code should surface it clearly.
- The model is for ripeness analysis only, not for recipe invention or recipe ranking.
- Keep the prompt tuned to controlled employee photos, not arbitrary consumer images.
