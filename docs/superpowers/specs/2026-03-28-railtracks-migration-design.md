# Railtracks Migration Design

Replace the TypeScript API and agent packages with a single Python FastAPI + railtracks application.

## Architecture

```
apps/api-python/
├── main.py              # FastAPI app, routes, startup
├── agent.py             # railtracks tools + agent + flow
├── models.py            # Pydantic schemas (mirrors @mmhack/shared)
├── requirements.txt     # railtracks, fastapi, uvicorn, google-genai, httpx
└── .env                 # API keys
```

Single Python process. FastAPI serves HTTP. On `POST /api/recipes`, it calls `flow.invoke(...)` which triggers the railtracks agent to orchestrate the full pipeline.

## Railtracks Tools

Three `@rt.function_node` tools:

### `analyze_ripeness`

- Calls Google Gemini API (`gemini-3-flash-preview`) with the fruit image
- Input: `fruitName`, `imageBase64`, `mimeType`
- Output: `RipenessAnalysis` (ripenessScore, ripenessBand, confidence, visibleSignals, reasoning, fruitName)
- Uses `google-genai` SDK directly inside the tool
- Same prompt as current `buildRipenessPrompt` in `packages/ai/src/index.ts`

### `search_recipes`

- Calls Spoonacular API (`/recipes/complexSearch`)
- Input: `fruitName`, `limit` (default 8)
- Output: list of `RecipeCandidate` (id, title, summary, imageUrl, sourceUrl, sourceName)
- Uses `httpx` for HTTP requests

### `select_recipes_heuristic`

- Pure keyword scoring, no external calls
- Input: `ripenessBand`, list of `RecipeCandidate`
- Output: top 3 recipes ranked by keyword match against ripeness band
- Keywords by band (same as current TS implementation):
  - `firm_ripe`: chips, grilled, roasted, baked, slaw
  - `overripe`: bread, muffin, smoothie, cake, pancake, pudding
  - `ripe`: salad, salsa, tart, pie, toast
  - `underripe`: pickled, green, savory, chips
  - `very_ripe`: smoothie, bread, fritter, compote, jam
- Available as a fallback tool the agent can call, and also called directly when the LLM is unavailable

## Agent & LLM

```python
llm = rt.llm.OpenAICompatibleProvider(
    "llama3.3-70b-instruct",
    api_base="https://inference.do-ai.run/v1",
    api_key=os.environ["DO_MODEL_ACCESS_KEY"],
)

RecipeAgent = rt.agent_node(
    "Recipe Agent",
    tool_nodes=[analyze_ripeness, search_recipes, select_recipes_heuristic],
    llm=llm,
    system_message="You analyze fruit ripeness and recommend recipes. Use tools to analyze the image, search for recipes, then select the best 3 for the ripeness state. Return JSON with fruitName, reasoning, recipes, ripenessBand, ripenessScore.",
)

flow = rt.Flow(name="Recipe Flow", entry_point=RecipeAgent)
```

The agent orchestrates the full pipeline: analyze ripeness -> search recipes -> select best 3 via LLM reasoning.

## Fallback Strategy

- **Happy path:** `flow.invoke(...)` runs the agent with Gradient LLM, which calls all three tools and reasons about recipe selection.
- **Degraded path:** If the LLM is unavailable (no `DO_MODEL_ACCESS_KEY` or request failure), the FastAPI route catches the error and runs a degraded pipeline:
  1. Calls `analyze_ripeness` directly (plain function)
  2. Calls `search_recipes` directly (plain function)
  3. Calls `select_recipes_heuristic` directly (keyword scoring, no LLM)

This mirrors the current `FallbackRecipeDecisionAgent` pattern.

## API Routes

Same contract as the current Express API:

| Route | Method | Description |
|---|---|---|
| `/health` | GET | `{"ok": true, "service": "api"}` |
| `/probe/gemini` | GET | Tests Gemini API connectivity |
| `/probe/gradient` | GET | Tests Gradient LLM connectivity |
| `/probe/spoonacular` | GET | Tests Spoonacular API connectivity |
| `/api/ripeness` | POST | Ripeness analysis only (calls Gemini directly, no agent) |
| `/api/recipes` | POST | Full pipeline via railtracks agent |

### Request body (POST /api/recipes and POST /api/ripeness)

```json
{
  "fruitName": "banana",
  "imageBase64": "...",
  "mimeType": "image/jpeg"
}
```

### Response body (POST /api/recipes)

```json
{
  "fruitName": "banana",
  "reasoning": "...",
  "recipes": [
    {
      "id": 123,
      "title": "Banana Bread",
      "summary": "...",
      "imageUrl": "...",
      "sourceUrl": "...",
      "sourceName": "...",
      "reason": "Great for overripe bananas",
      "ripenessFit": "overripe"
    }
  ],
  "ripenessBand": "overripe",
  "ripenessScore": 9
}
```

## Pydantic Models (models.py)

Direct port of the Zod schemas in `packages/shared/src/index.ts`:

- `RipenessAnalysis` — ripenessScore (1-10), ripenessBand, confidence, visibleSignals, reasoning, fruitName
- `RecipeCandidate` — id, title, summary?, imageUrl?, sourceUrl?, sourceName?
- `RecipeRecommendation` — extends RecipeCandidate with reason, ripenessFit
- `RecipeResponse` — fruitName, reasoning, recipes (1-3), ripenessBand, ripenessScore
- `ProbeStatus` — configured, ok, provider
- `FruitImageRequest` — fruitName (enum: banana/apple/tomato), imageBase64, mimeType

Enums: `SupportedSku`, `ConfidenceLevel`, `RipenessBand`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini API key for ripeness analysis |
| `SPOONACULAR_API_KEY` | Yes | Spoonacular API key for recipe search |
| `DO_MODEL_ACCESS_KEY` | No | DigitalOcean Gradient key (enables LLM agent; without it, heuristic-only) |
| `DO_GRADIENT_MODEL_ID` | No | Model name (default: `llama3.3-70b-instruct`) |
| `API_PORT` | No | Server port (default: `4000`) |

## Dependencies

```
railtracks>=1.3.0
fastapi>=0.115.0
uvicorn>=0.34.0
google-genai>=1.0.0
httpx>=0.28.0
pydantic>=2.0.0
python-dotenv>=1.0.0
```

Requires Python 3.10+.
