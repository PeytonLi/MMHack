# Railtracks Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the TypeScript API + agent with a single Python FastAPI + railtracks application that orchestrates ripeness analysis, recipe search, and recipe selection.

**Architecture:** A single FastAPI server at `apps/api-python/` with three railtracks `@rt.function_node` tools (`analyze_ripeness`, `search_recipes`, `select_recipes_heuristic`) orchestrated by one `rt.agent_node` using DigitalOcean Gradient LLM. Falls back to heuristic-only when LLM is unavailable.

**Tech Stack:** Python 3.10+, railtracks, FastAPI, uvicorn, google-genai, httpx, pydantic, pytest

---

## File Map

| File | Responsibility |
|---|---|
| `apps/api-python/models.py` | Pydantic schemas (enums, request/response models) |
| `apps/api-python/tools.py` | Three `@rt.function_node` tools |
| `apps/api-python/agent.py` | Agent node, LLM config, Flow, fallback pipeline |
| `apps/api-python/main.py` | FastAPI app, routes, error handling |
| `apps/api-python/requirements.txt` | Python dependencies |
| `apps/api-python/tests/test_models.py` | Model validation tests |
| `apps/api-python/tests/test_tools.py` | Tool unit tests |
| `apps/api-python/tests/test_agent.py` | Agent fallback tests |
| `apps/api-python/tests/test_main.py` | API route integration tests |
| `apps/api-python/tests/__init__.py` | (empty) |
| `apps/api-python/tests/conftest.py` | Shared fixtures |

---

### Task 1: Project scaffold and dependencies

**Files:**
- Create: `apps/api-python/requirements.txt`
- Create: `apps/api-python/tests/__init__.py`
- Create: `apps/api-python/tests/conftest.py`

- [ ] **Step 1: Create requirements.txt**

```
railtracks>=1.3.0
fastapi>=0.115.0
uvicorn>=0.34.0
google-genai>=1.0.0
httpx>=0.28.0
pydantic>=2.0.0
python-dotenv>=1.0.0
pytest>=8.0.0
pytest-asyncio>=0.24.0
httpx
```

- [ ] **Step 2: Create test boilerplate**

`apps/api-python/tests/__init__.py` — empty file.

`apps/api-python/tests/conftest.py`:

```python
import pytest


@pytest.fixture
def overripe_banana_analysis():
    return {
        "confidence": "high",
        "fruitName": "banana",
        "reasoning": "Very spotted peel and collapsing structure.",
        "ripenessBand": "overripe",
        "ripenessScore": 9,
        "visibleSignals": ["brown peel", "soft shape"],
    }


@pytest.fixture
def sample_candidates():
    return [
        {"id": 1, "title": "Banana Chips"},
        {"id": 2, "title": "Banana Bread"},
        {"id": 3, "title": "Banana Smoothie"},
    ]
```

- [ ] **Step 3: Install dependencies**

Run:
```bash
cd apps/api-python
py -3.13 -m venv .venv
.venv/Scripts/activate  # Windows
pip install -r requirements.txt
```

- [ ] **Step 4: Verify pytest runs**

Run: `py -3.13 -m pytest tests/ -v`
Expected: "no tests ran" (0 collected), exit code 5 — this is fine.

- [ ] **Step 5: Commit**

```bash
git add apps/api-python/requirements.txt apps/api-python/tests/__init__.py apps/api-python/tests/conftest.py
git commit -m "chore: scaffold api-python project with dependencies and test fixtures"
```

---

### Task 2: Pydantic models

**Files:**
- Create: `apps/api-python/models.py`
- Create: `apps/api-python/tests/test_models.py`

- [ ] **Step 1: Write failing tests for models**

`apps/api-python/tests/test_models.py`:

```python
import pytest
from pydantic import ValidationError

from models import (
    ConfidenceLevel,
    FruitImageRequest,
    ProbeStatus,
    RecipeCandidate,
    RecipeRecommendation,
    RecipeResponse,
    RipenessAnalysis,
    RipenessBand,
    SupportedSku,
    get_ripeness_band,
)


def test_supported_sku_valid():
    assert SupportedSku("banana") == SupportedSku.BANANA


def test_supported_sku_invalid():
    with pytest.raises(ValueError):
        SupportedSku("mango")


def test_get_ripeness_band():
    assert get_ripeness_band(1) == RipenessBand.UNDERRIPE
    assert get_ripeness_band(2) == RipenessBand.UNDERRIPE
    assert get_ripeness_band(3) == RipenessBand.FIRM_RIPE
    assert get_ripeness_band(4) == RipenessBand.FIRM_RIPE
    assert get_ripeness_band(5) == RipenessBand.RIPE
    assert get_ripeness_band(6) == RipenessBand.RIPE
    assert get_ripeness_band(7) == RipenessBand.VERY_RIPE
    assert get_ripeness_band(8) == RipenessBand.VERY_RIPE
    assert get_ripeness_band(9) == RipenessBand.OVERRIPE
    assert get_ripeness_band(10) == RipenessBand.OVERRIPE


def test_ripeness_analysis_valid():
    analysis = RipenessAnalysis(
        confidence=ConfidenceLevel.HIGH,
        fruitName=SupportedSku.BANANA,
        reasoning="Spotted peel.",
        ripenessScore=9,
        ripenessBand=RipenessBand.OVERRIPE,
        visibleSignals=["brown peel"],
    )
    assert analysis.ripenessScore == 9


def test_ripeness_analysis_score_out_of_range():
    with pytest.raises(ValidationError):
        RipenessAnalysis(
            confidence=ConfidenceLevel.HIGH,
            fruitName=SupportedSku.BANANA,
            reasoning="Spotted peel.",
            ripenessScore=11,
            ripenessBand=RipenessBand.OVERRIPE,
            visibleSignals=[],
        )


def test_recipe_candidate_minimal():
    candidate = RecipeCandidate(id=1, title="Banana Bread")
    assert candidate.summary is None


def test_recipe_response_enforces_max_3_recipes():
    with pytest.raises(ValidationError):
        RecipeResponse(
            fruitName=SupportedSku.BANANA,
            reasoning="test",
            recipes=[
                RecipeRecommendation(id=i, title=f"Recipe {i}", reason="good", ripenessFit=RipenessBand.OVERRIPE)
                for i in range(4)
            ],
            ripenessBand=RipenessBand.OVERRIPE,
            ripenessScore=9,
        )


def test_fruit_image_request_valid():
    req = FruitImageRequest(fruitName="banana", imageBase64="abc", mimeType="image/jpeg")
    assert req.fruitName == SupportedSku.BANANA


def test_probe_status():
    status = ProbeStatus(configured=True, ok=True, provider="test")
    assert status.ok is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_models.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'models'`

- [ ] **Step 3: Implement models**

`apps/api-python/models.py`:

```python
from enum import StrEnum

from pydantic import BaseModel, Field


class SupportedSku(StrEnum):
    BANANA = "banana"
    APPLE = "apple"
    TOMATO = "tomato"


class ConfidenceLevel(StrEnum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RipenessBand(StrEnum):
    UNDERRIPE = "underripe"
    FIRM_RIPE = "firm_ripe"
    RIPE = "ripe"
    VERY_RIPE = "very_ripe"
    OVERRIPE = "overripe"


def get_ripeness_band(score: int) -> RipenessBand:
    if score <= 2:
        return RipenessBand.UNDERRIPE
    if score <= 4:
        return RipenessBand.FIRM_RIPE
    if score <= 6:
        return RipenessBand.RIPE
    if score <= 8:
        return RipenessBand.VERY_RIPE
    return RipenessBand.OVERRIPE


class RipenessAnalysis(BaseModel):
    confidence: ConfidenceLevel
    fruitName: SupportedSku
    reasoning: str = Field(min_length=1)
    ripenessScore: int = Field(ge=1, le=10)
    ripenessBand: RipenessBand
    visibleSignals: list[str] = Field(default_factory=list)


class RecipeCandidate(BaseModel):
    id: int
    title: str = Field(min_length=1)
    summary: str | None = None
    imageUrl: str | None = None
    sourceUrl: str | None = None
    sourceName: str | None = None


class RecipeRecommendation(RecipeCandidate):
    reason: str = Field(min_length=1)
    ripenessFit: RipenessBand


class RecipeResponse(BaseModel):
    fruitName: SupportedSku
    reasoning: str = Field(min_length=1)
    recipes: list[RecipeRecommendation] = Field(min_length=1, max_length=3)
    ripenessBand: RipenessBand
    ripenessScore: int = Field(ge=1, le=10)


class FruitImageRequest(BaseModel):
    fruitName: SupportedSku
    imageBase64: str = Field(min_length=1)
    mimeType: str = Field(min_length=1)


class ProbeStatus(BaseModel):
    configured: bool
    ok: bool
    provider: str = Field(min_length=1)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_models.py -v`
Expected: all 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-python/models.py apps/api-python/tests/test_models.py
git commit -m "feat: add Pydantic models for railtracks API"
```

---

### Task 3: Railtracks tools

**Files:**
- Create: `apps/api-python/tools.py`
- Create: `apps/api-python/tests/test_tools.py`

- [ ] **Step 1: Write failing tests for tools**

`apps/api-python/tests/test_tools.py`:

```python
import json
from unittest.mock import AsyncMock, patch

import pytest

from models import RipenessBand
from tools import (
    KEYWORDS_BY_BAND,
    analyze_ripeness,
    search_recipes,
    select_recipes_heuristic,
)


def test_select_recipes_heuristic_ranks_overripe():
    result = select_recipes_heuristic(
        ripeness_band="overripe",
        candidates_json=json.dumps([
            {"id": 1, "title": "Banana Chips"},
            {"id": 2, "title": "Banana Bread"},
            {"id": 3, "title": "Banana Smoothie"},
        ]),
    )
    parsed = json.loads(result)
    titles = [r["title"] for r in parsed]
    assert titles[0] == "Banana Bread"
    assert titles[1] == "Banana Smoothie"


def test_select_recipes_heuristic_returns_max_3():
    candidates = [{"id": i, "title": f"Banana Bread {i}"} for i in range(10)]
    result = select_recipes_heuristic(
        ripeness_band="overripe",
        candidates_json=json.dumps(candidates),
    )
    parsed = json.loads(result)
    assert len(parsed) == 3


def test_select_recipes_heuristic_falls_back_when_no_keywords_match():
    result = select_recipes_heuristic(
        ripeness_band="overripe",
        candidates_json=json.dumps([
            {"id": 1, "title": "Mystery Dish"},
            {"id": 2, "title": "Unknown Recipe"},
        ]),
    )
    parsed = json.loads(result)
    assert len(parsed) == 2


def test_keywords_by_band_covers_all_bands():
    for band in RipenessBand:
        assert band.value in KEYWORDS_BY_BAND


@pytest.mark.asyncio
async def test_search_recipes_calls_spoonacular():
    mock_response = AsyncMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "results": [
            {"id": 1, "title": "Banana Bread", "summary": "Delicious"},
        ]
    }
    mock_response.raise_for_status = lambda: None

    with patch("tools.httpx.AsyncClient") as MockClient:
        mock_client = AsyncMock()
        mock_client.get.return_value = mock_response
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=False)
        MockClient.return_value = mock_client

        result = await search_recipes(fruit_name="banana", limit=8)

    parsed = json.loads(result)
    assert len(parsed) == 1
    assert parsed[0]["title"] == "Banana Bread"


@pytest.mark.asyncio
async def test_analyze_ripeness_calls_gemini():
    mock_response_text = json.dumps({
        "fruitName": "banana",
        "ripenessScore": 9,
        "confidence": "high",
        "visibleSignals": ["brown peel"],
        "reasoning": "Very spotted.",
    })

    with patch("tools.GenAI") as MockGenAI:
        mock_ai = MockGenAI.return_value
        mock_result = AsyncMock()
        mock_result.text = mock_response_text
        mock_ai.models.generate_content = AsyncMock(return_value=mock_result)

        result = await analyze_ripeness(
            fruit_name="banana",
            image_base64="fakedata",
            mime_type="image/jpeg",
        )

    parsed = json.loads(result)
    assert parsed["fruitName"] == "banana"
    assert parsed["ripenessScore"] == 9
    assert parsed["ripenessBand"] == "overripe"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_tools.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'tools'`

- [ ] **Step 3: Implement tools**

`apps/api-python/tools.py`:

```python
import json
import os
import re

import httpx
import railtracks as rt
from google.genai import GoogleGenAI as GenAI

from models import RecipeCandidate, RipenessAnalysis, get_ripeness_band

KEYWORDS_BY_BAND: dict[str, list[str]] = {
    "firm_ripe": ["chips", "grilled", "roasted", "baked", "slaw"],
    "overripe": ["bread", "muffin", "smoothie", "cake", "pancake", "pudding"],
    "ripe": ["salad", "salsa", "tart", "pie", "toast"],
    "underripe": ["pickled", "green", "savory", "chips"],
    "very_ripe": ["smoothie", "bread", "fritter", "compote", "jam"],
}


def _extract_json(raw: str) -> dict:
    trimmed = raw.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", trimmed, re.IGNORECASE)
    candidate = match.group(1) if match else trimmed
    return json.loads(candidate)


@rt.function_node
def select_recipes_heuristic(ripeness_band: str, candidates_json: str) -> str:
    """Select the best recipes for a ripeness band using keyword scoring.

    Args:
        ripeness_band: The ripeness band (underripe, firm_ripe, ripe, very_ripe, overripe).
        candidates_json: JSON array of recipe candidates, each with id, title, and optional summary.

    Returns:
        JSON array of the top 3 recipe candidates ranked by keyword relevance.
    """
    candidates = json.loads(candidates_json)
    keywords = KEYWORDS_BY_BAND.get(ripeness_band, [])

    def score(recipe: dict) -> int:
        haystack = f"{recipe.get('title', '')} {recipe.get('summary', '')}".lower()
        return sum(2 for kw in keywords if kw in haystack)

    ranked = sorted(candidates, key=score, reverse=True)[:3]
    if not ranked:
        ranked = candidates[:3]
    return json.dumps(ranked)


@rt.function_node
async def search_recipes(fruit_name: str, limit: int = 8) -> str:
    """Search for recipes by fruit name using the Spoonacular API.

    Args:
        fruit_name: The fruit to search recipes for (banana, apple, tomato).
        limit: Maximum number of results to return.

    Returns:
        JSON array of recipe candidates with id, title, summary, imageUrl, sourceUrl, sourceName.
    """
    api_key = os.environ["SPOONACULAR_API_KEY"]
    params = {
        "query": fruit_name,
        "number": str(limit),
        "sort": "popularity",
        "addRecipeInformation": "true",
        "apiKey": api_key,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.spoonacular.com/recipes/complexSearch",
            params=params,
        )
        response.raise_for_status()

    data = response.json()
    results = []
    for r in data.get("results", []):
        candidate = RecipeCandidate(
            id=r["id"],
            title=r["title"],
            summary=r.get("summary"),
            imageUrl=r.get("image"),
            sourceUrl=r.get("sourceUrl"),
            sourceName=r.get("sourceName"),
        )
        results.append(candidate.model_dump())
    return json.dumps(results)


@rt.function_node
async def analyze_ripeness(fruit_name: str, image_base64: str, mime_type: str) -> str:
    """Analyze fruit ripeness from an image using Google Gemini.

    Args:
        fruit_name: The fruit being analyzed (banana, apple, tomato).
        image_base64: Base64-encoded image data.
        mime_type: MIME type of the image (e.g. image/jpeg).

    Returns:
        JSON object with fruitName, ripenessScore, ripenessBand, confidence, visibleSignals, reasoning.
    """
    api_key = os.environ["GOOGLE_GENERATIVE_AI_API_KEY"]
    ai = GenAI(api_key=api_key)

    prompt = (
        "You are analyzing a controlled store photo of a single fruit item. "
        f"The selected fruit is {fruit_name}. "
        "Return only JSON with the keys fruitName, ripenessScore, confidence, visibleSignals, and reasoning. "
        "ripenessScore must be an integer from 1 to 10 where 1 is underripe and 10 is overripe. "
        "confidence must be one of high, medium, or low. "
        "visibleSignals must be an array of short strings about what you can see. "
        "Do not suggest a recipe. Do not include pricing advice."
    )

    response = await ai.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            {
                "parts": [
                    {"text": prompt},
                    {"inline_data": {"data": image_base64, "mime_type": mime_type}},
                ],
            }
        ],
    )

    if not response.text:
        raise ValueError("Gemini returned an empty response.")

    parsed = _extract_json(response.text)
    analysis = RipenessAnalysis(
        confidence=parsed["confidence"],
        fruitName=parsed["fruitName"],
        reasoning=parsed["reasoning"],
        ripenessScore=parsed["ripenessScore"],
        ripenessBand=get_ripeness_band(parsed["ripenessScore"]),
        visibleSignals=parsed.get("visibleSignals", []),
    )
    return json.dumps(analysis.model_dump())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_tools.py -v`
Expected: all 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-python/tools.py apps/api-python/tests/test_tools.py
git commit -m "feat: add railtracks function_node tools for ripeness, recipes, and heuristic"
```

---

### Task 4: Agent, flow, and fallback pipeline

**Files:**
- Create: `apps/api-python/agent.py`
- Create: `apps/api-python/tests/test_agent.py`

- [ ] **Step 1: Write failing tests for agent**

`apps/api-python/tests/test_agent.py`:

```python
import json
from unittest.mock import AsyncMock, patch

import pytest

from agent import build_fallback_response, create_flow, run_fallback_pipeline
from models import RipenessBand, SupportedSku


def test_build_fallback_response():
    analysis_json = json.dumps({
        "confidence": "high",
        "fruitName": "banana",
        "reasoning": "Very spotted.",
        "ripenessScore": 9,
        "ripenessBand": "overripe",
        "visibleSignals": ["brown peel"],
    })
    candidates_json = json.dumps([
        {"id": 1, "title": "Banana Chips"},
        {"id": 2, "title": "Banana Bread"},
        {"id": 3, "title": "Banana Smoothie"},
    ])

    response = build_fallback_response(analysis_json, candidates_json)
    assert response.fruitName == SupportedSku.BANANA
    assert response.ripenessBand == RipenessBand.OVERRIPE
    assert len(response.recipes) <= 3
    assert response.recipes[0].title == "Banana Bread"


@pytest.mark.asyncio
async def test_run_fallback_pipeline():
    analysis_json = json.dumps({
        "confidence": "high",
        "fruitName": "banana",
        "reasoning": "Very spotted.",
        "ripenessScore": 9,
        "ripenessBand": "overripe",
        "visibleSignals": ["brown peel"],
    })
    candidates_json = json.dumps([
        {"id": 2, "title": "Banana Bread"},
    ])

    with (
        patch("agent.analyze_ripeness", new_callable=AsyncMock, return_value=analysis_json) as mock_analyze,
        patch("agent.search_recipes", new_callable=AsyncMock, return_value=candidates_json) as mock_search,
    ):
        response = await run_fallback_pipeline("banana", "fakedata", "image/jpeg")

    mock_analyze.assert_called_once_with("banana", "fakedata", "image/jpeg")
    mock_search.assert_called_once_with("banana", 8)
    assert response.fruitName == SupportedSku.BANANA
    assert len(response.recipes) >= 1


def test_create_flow_without_gradient_key():
    flow = create_flow(gradient_key=None)
    assert flow is None


def test_create_flow_with_gradient_key():
    flow = create_flow(gradient_key="test-key", model_id="llama3.3-70b-instruct")
    assert flow is not None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_agent.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'agent'`

- [ ] **Step 3: Implement agent**

`apps/api-python/agent.py`:

```python
import json
import os

import railtracks as rt

from models import (
    RecipeRecommendation,
    RecipeResponse,
    RipenessAnalysis,
)
from tools import analyze_ripeness, search_recipes, select_recipes_heuristic


def create_flow(
    gradient_key: str | None = None,
    model_id: str = "llama3.3-70b-instruct",
) -> rt.Flow | None:
    """Create the railtracks Flow with Gradient LLM. Returns None if no key."""
    if not gradient_key:
        return None

    llm = rt.llm.OpenAICompatibleProvider(
        model_id,
        api_base="https://inference.do-ai.run/v1",
        api_key=gradient_key,
    )

    RecipeAgent = rt.agent_node(
        "Recipe Agent",
        tool_nodes=[analyze_ripeness, search_recipes, select_recipes_heuristic],
        llm=llm,
        system_message=(
            "You analyze fruit ripeness and recommend recipes. "
            "Step 1: Call analyze_ripeness with the fruit name, base64 image, and mime type. "
            "Step 2: Call search_recipes with the fruit name. "
            "Step 3: Review the ripeness analysis and recipe candidates, then select the best 3 recipes. "
            "You may call select_recipes_heuristic as a helper, or reason about the selection yourself. "
            "Return your final answer as JSON with keys: fruitName, reasoning, recipes (array of "
            "{id, title, summary, imageUrl, sourceUrl, sourceName, reason, ripenessFit}), "
            "ripenessBand, ripenessScore."
        ),
    )

    return rt.Flow(name="Recipe Flow", entry_point=RecipeAgent)


def build_fallback_response(analysis_json: str, candidates_json: str) -> RecipeResponse:
    """Build a RecipeResponse using heuristic selection."""
    analysis = RipenessAnalysis.model_validate_json(analysis_json)
    heuristic_json = select_recipes_heuristic.__wrapped__(
        ripeness_band=analysis.ripenessBand.value,
        candidates_json=candidates_json,
    )
    selected = json.loads(heuristic_json)

    recipes = [
        RecipeRecommendation(
            **candidate,
            reason=f'Picked "{candidate["title"]}" because a {analysis.ripenessBand.value.replace("_", " ")} {analysis.fruitName.value} works well for this kind of recipe.',
            ripenessFit=analysis.ripenessBand,
        )
        for candidate in selected
    ]

    return RecipeResponse(
        fruitName=analysis.fruitName,
        reasoning=analysis.reasoning,
        recipes=recipes,
        ripenessBand=analysis.ripenessBand,
        ripenessScore=analysis.ripenessScore,
    )


async def run_fallback_pipeline(
    fruit_name: str,
    image_base64: str,
    mime_type: str,
) -> RecipeResponse:
    """Run the degraded pipeline without LLM: analyze, search, heuristic select."""
    analysis_json = await analyze_ripeness(fruit_name, image_base64, mime_type)
    candidates_json = await search_recipes(fruit_name, 8)
    return build_fallback_response(analysis_json, candidates_json)
```

Note: `select_recipes_heuristic.__wrapped__` accesses the original function before the `@rt.function_node` decorator. If railtracks doesn't expose `__wrapped__`, call it directly — `select_recipes_heuristic(...)` should also work as a regular function call. Test this during implementation and adjust if needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_agent.py -v`
Expected: all 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-python/agent.py apps/api-python/tests/test_agent.py
git commit -m "feat: add railtracks agent flow with Gradient LLM and fallback pipeline"
```

---

### Task 5: FastAPI application and routes

**Files:**
- Create: `apps/api-python/main.py`
- Create: `apps/api-python/tests/test_main.py`

- [ ] **Step 1: Write failing tests for API routes**

`apps/api-python/tests/test_main.py`:

```python
import json
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_health(client):
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True, "service": "api"}


@pytest.mark.asyncio
async def test_probe_gemini_not_configured(client):
    with patch.dict("os.environ", {}, clear=True):
        response = await client.get("/probe/gemini")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "gemini"
    assert data["configured"] is False


@pytest.mark.asyncio
async def test_probe_spoonacular_not_configured(client):
    with patch.dict("os.environ", {}, clear=True):
        response = await client.get("/probe/spoonacular")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "spoonacular"
    assert data["configured"] is False


@pytest.mark.asyncio
async def test_probe_gradient_not_configured(client):
    with patch.dict("os.environ", {}, clear=True):
        response = await client.get("/probe/gradient")
    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "digitalocean-gradient"
    assert data["configured"] is False


@pytest.mark.asyncio
async def test_post_recipes_invalid_body(client):
    response = await client.post("/api/recipes", json={"bad": "data"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_post_recipes_fallback(client):
    analysis_json = json.dumps({
        "confidence": "high",
        "fruitName": "banana",
        "reasoning": "Spotted peel.",
        "ripenessScore": 9,
        "ripenessBand": "overripe",
        "visibleSignals": ["brown peel"],
    })
    candidates_json = json.dumps([
        {"id": 2, "title": "Banana Bread"},
    ])

    with (
        patch("main.run_fallback_pipeline", new_callable=AsyncMock) as mock_fallback,
        patch("main.recipe_flow", None),
    ):
        from models import RecipeRecommendation, RecipeResponse, RipenessBand, SupportedSku

        mock_fallback.return_value = RecipeResponse(
            fruitName=SupportedSku.BANANA,
            reasoning="Spotted peel.",
            recipes=[
                RecipeRecommendation(
                    id=2, title="Banana Bread", reason="Great for overripe", ripenessFit=RipenessBand.OVERRIPE,
                )
            ],
            ripenessBand=RipenessBand.OVERRIPE,
            ripenessScore=9,
        )

        response = await client.post("/api/recipes", json={
            "fruitName": "banana",
            "imageBase64": "fakedata",
            "mimeType": "image/jpeg",
        })

    assert response.status_code == 200
    data = response.json()
    assert data["fruitName"] == "banana"
    assert len(data["recipes"]) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `py -3.13 -m pytest tests/test_main.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'main'`

- [ ] **Step 3: Implement FastAPI application**

`apps/api-python/main.py`:

```python
import os

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from agent import create_flow, run_fallback_pipeline
from models import FruitImageRequest, ProbeStatus, RipenessAnalysis
from tools import analyze_ripeness

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

recipe_flow = create_flow(
    gradient_key=os.environ.get("DO_MODEL_ACCESS_KEY"),
    model_id=os.environ.get("DO_GRADIENT_MODEL_ID", "llama3.3-70b-instruct"),
)


@app.exception_handler(ValidationError)
async def validation_error_handler(request: Request, exc: ValidationError):
    return JSONResponse(status_code=422, content={"error": "invalid_request", "issues": exc.errors()})


@app.get("/health")
async def health():
    return {"ok": True, "service": "api"}


@app.get("/probe/gemini")
async def probe_gemini():
    api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    if not api_key:
        return ProbeStatus(configured=False, ok=False, provider="gemini").model_dump()
    try:
        from google.genai import GoogleGenAI

        ai = GoogleGenAI(api_key=api_key)
        await ai.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[{"parts": [{"text": "Reply with the single word banana."}]}],
        )
        return ProbeStatus(configured=True, ok=True, provider="gemini").model_dump()
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@app.get("/probe/spoonacular")
async def probe_spoonacular():
    api_key = os.environ.get("SPOONACULAR_API_KEY")
    if not api_key:
        return ProbeStatus(configured=False, ok=False, provider="spoonacular").model_dump()
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.spoonacular.com/recipes/complexSearch",
                params={"query": "banana", "number": "1", "apiKey": api_key},
            )
            response.raise_for_status()
        return ProbeStatus(configured=True, ok=True, provider="spoonacular").model_dump()
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@app.get("/probe/gradient")
async def probe_gradient():
    gradient_key = os.environ.get("DO_MODEL_ACCESS_KEY")
    if not gradient_key:
        return ProbeStatus(configured=False, ok=False, provider="digitalocean-gradient").model_dump()
    try:
        import httpx

        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://inference.do-ai.run/v1/models",
                headers={"Authorization": f"Bearer {gradient_key}"},
            )
            response.raise_for_status()
        return ProbeStatus(configured=True, ok=True, provider="digitalocean-gradient").model_dump()
    except Exception as exc:
        return JSONResponse(status_code=500, content={"error": str(exc)})


@app.post("/api/ripeness")
async def post_ripeness(body: FruitImageRequest):
    result_json = await analyze_ripeness(body.fruitName.value, body.imageBase64, body.mimeType)
    return RipenessAnalysis.model_validate_json(result_json).model_dump()


@app.post("/api/recipes")
async def post_recipes(body: FruitImageRequest):
    if recipe_flow:
        try:
            prompt = (
                f"Analyze the ripeness of this {body.fruitName.value} and recommend recipes. "
                f"Image (base64): {body.imageBase64[:50]}... "
                f"Mime type: {body.mimeType}. "
                f"Fruit name: {body.fruitName.value}."
            )
            result = recipe_flow.invoke(prompt)
            return result
        except Exception:
            pass

    response = await run_fallback_pipeline(body.fruitName.value, body.imageBase64, body.mimeType)
    return response.model_dump()


if __name__ == "__main__":
    import uvicorn

    port = int(os.environ.get("API_PORT", "4000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `py -3.13 -m pytest tests/test_main.py -v`
Expected: all 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/api-python/main.py apps/api-python/tests/test_main.py
git commit -m "feat: add FastAPI app with railtracks agent and fallback routes"
```

---

### Task 6: Run full test suite and verify

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

Run: `cd apps/api-python && py -3.13 -m pytest tests/ -v`
Expected: all tests PASS (approximately 26 tests)

- [ ] **Step 2: Verify the server starts**

Run: `cd apps/api-python && py -3.13 -m uvicorn main:app --port 4000 &`
Then: `curl http://localhost:4000/health`
Expected: `{"ok":true,"service":"api"}`

Kill the server after verifying.

- [ ] **Step 3: Commit any fixes**

If any adjustments were needed, commit them:
```bash
git add -u apps/api-python/
git commit -m "fix: address test/startup issues from integration verification"
```
