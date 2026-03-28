import json
from unittest.mock import AsyncMock, MagicMock, patch

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
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "results": [
            {"id": 1, "title": "Banana Bread", "summary": "Delicious"},
        ]
    }
    mock_response.raise_for_status = MagicMock()

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
        mock_client = MagicMock()
        MockGenAI.Client.return_value = mock_client
        mock_result = MagicMock()
        mock_result.text = mock_response_text
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_result)

        result = await analyze_ripeness(
            fruit_name="banana",
            image_base64="fakedata",
            mime_type="image/jpeg",
        )

    parsed = json.loads(result)
    assert parsed["fruitName"] == "banana"
    assert parsed["ripenessScore"] == 9
    assert parsed["ripenessBand"] == "overripe"
