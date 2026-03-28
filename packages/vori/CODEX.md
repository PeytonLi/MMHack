# @mmhack/vori Codex Notes

- The current workflow assumes price writes happen immediately after a valid analysis.
- Discard should prefer a Vori remove-from-sale or unavailable operation when the API supports it.
- If Vori does not support a discard operation, preserve the audit record and surface a staff removal instruction instead of silently downgrading to a markdown.
- Keep the adapter boundary narrow so the rest of the app does not depend on Vori response shapes.
