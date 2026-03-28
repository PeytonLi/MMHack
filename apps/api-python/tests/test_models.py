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
