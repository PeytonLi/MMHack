# @mmhack/api Codex Notes

- Keep probe routes independent from product routes so credentials can be validated stage by stage.
- `POST /api/ripeness` is the foundational feature slice and must stay usable even if recipe integration is failing.
- `POST /api/recipes` must compose prior layers, not bypass them.
- The recommendation layer should prefer a DigitalOcean-hosted model when `DO_MODEL_ACCESS_KEY` is configured.
- The agent seam is still TypeScript because Railtracks is Python-first and Python is not currently runnable in this environment.
