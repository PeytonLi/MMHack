import json
import os
import re

import httpx
import railtracks as rt
from google import genai as GenAI

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
    ai = GenAI.Client(api_key=api_key)

    prompt = (
        "You are analyzing a controlled store photo of a single fruit item. "
        f"The selected fruit is {fruit_name}. "
        "Return only JSON with the keys fruitName, ripenessScore, confidence, visibleSignals, and reasoning. "
        "ripenessScore must be an integer from 1 to 10 where 1 is underripe and 10 is overripe. "
        "confidence must be one of high, medium, or low. "
        "visibleSignals must be an array of short strings about what you can see. "
        "Do not suggest a recipe. Do not include pricing advice."
    )

    response = await ai.aio.models.generate_content(
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
