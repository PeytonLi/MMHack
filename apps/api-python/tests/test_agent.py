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
