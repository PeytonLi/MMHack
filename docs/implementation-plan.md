# MMHack Implementation Plan

## Product Summary

- Build a backend-first fruit ripeness and recipe recommendation product.
- The backend accepts `fruitName` plus image data, scores ripeness with Gemini, fetches candidate recipes from Spoonacular, and returns recipes matched to the fruit's ripeness.
- Supported fruits for the first slice remain `banana`, `apple`, and `tomato`.
- The ripeness score scale is `1 = underripe`, `10 = overripe`.
- The recommendation layer should choose among fetched recipes, not invent recipes from scratch.

## Current Architecture Direction

- `apps/api` is the primary delivery target for this phase.
- `packages/ai` owns Gemini ripeness analysis.
- `packages/recipes` owns Spoonacular recipe lookup.
- `packages/agent` owns recommendation selection, prefers DigitalOcean Gradient hosted models when configured, and remains the seam for an eventual Railtracks/Python sidecar.
- `apps/web` remains as a placeholder UI scaffold, but backend completion comes first.

## Current Public Interfaces

- `FruitImageRequest = { fruitName; imageBase64; mimeType }`
- `RipenessAnalysis = { fruitName; ripenessScore; ripenessBand; confidence; visibleSignals; reasoning }`
- `RecipeResponse = { fruitName; ripenessScore; ripenessBand; reasoning; recipes[] }`
- Routes:
- `GET /health`
- `GET /probe/gemini`
- `GET /probe/gradient`
- `GET /probe/spoonacular`
- `POST /api/ripeness`
- `POST /api/recipes`

## Build Priorities

1. Prove Gemini connectivity independently.
2. Keep `POST /api/ripeness` working as the foundational slice.
3. Prove Spoonacular independently.
4. Layer the recipe-selection seam on top of the ripeness output.
5. Keep the final combined route composing prior layers instead of bypassing them.

## Defaults Locked In

- No Unkey or rate limiting yet
- Spoonacular is the recipe provider
- Express is the backend host
- DigitalOcean Gradient is the preferred hosted model provider for recipe selection
- Lovable frontend integration comes after backend routes are stable
- Railtracks is deferred behind the agent seam because Python execution is not currently available here
