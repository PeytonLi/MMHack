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


@app.get("/health")
async def health():
    return {"ok": True, "service": "api"}


@app.get("/probe/gemini")
async def probe_gemini():
    api_key = os.environ.get("GOOGLE_GENERATIVE_AI_API_KEY")
    if not api_key:
        return ProbeStatus(configured=False, ok=False, provider="gemini").model_dump()
    try:
        from google import genai
        ai = genai.Client(api_key=api_key)
        await ai.aio.models.generate_content(
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
