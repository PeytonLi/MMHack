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
