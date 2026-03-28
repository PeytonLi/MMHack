# @mmhack/web

Next.js frontend for the MMHack fruit ripeness and recipe recommendation app.

## Features

- Capture or upload a photo of a fruit
- Display ripeness analysis (score, band, reasoning, visible signals)
- Show fruit mismatch warnings when the detected fruit doesn't match the selection
- Fetch and display LLM-ranked recipe recommendations based on ripeness

## Commands

- `pnpm --filter @mmhack/web dev`
- `pnpm --filter @mmhack/web build`
- `pnpm --filter @mmhack/web lint`
