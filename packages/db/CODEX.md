# @mmhack/db Codex Notes

- SQLite is the persistence target for v1.
- The audit log must store image references plus score, confidence, visible issues, rationale, selected action, and Vori write outcome.
- SKU config should remain explicit and curated for the first three produce items.
- The DB layer should stay narrow: schema, repositories, and seed data, not business logic.
