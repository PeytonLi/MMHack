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
    heuristic_json = select_recipes_heuristic(
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
