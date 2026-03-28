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
