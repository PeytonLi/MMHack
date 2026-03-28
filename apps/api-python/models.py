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
