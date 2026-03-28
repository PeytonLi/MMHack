import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { AssistantUnavailableError } from "@mmhack/agent";
import { GeminiQuotaError } from "@mmhack/ai";
import { createApiApp } from "./app";

describe("api app", () => {
  it("returns a health response", async () => {
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: { analyzeRipeness: vi.fn(), probe: vi.fn() },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn() },
    });

    await request(app).get("/health").expect(200, {
      ok: true,
      service: "api",
    });
  });

  it("returns a foundational ripeness result", async () => {
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: {
        analyzeRipeness: vi.fn(async () => ({
          confidence: "high",
          fruitName: "banana",
          reasoning: "Strong spotting across the peel.",
          ripenessBand: "overripe",
          ripenessScore: 9,
          status: "ok",
          visibleSignals: ["dark spots"],
        })),
        probe: vi.fn(),
      },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn() },
    });

    const response = await request(app).post("/api/ripeness").send({
      fruitName: "banana",
      imageBase64: "abc123",
      mimeType: "image/jpeg",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      fruitName: "banana",
      ripenessBand: "overripe",
      ripenessScore: 9,
      status: "ok",
    });
  });

  it("returns combined recipe recommendations", async () => {
    const analyzeRipeness = vi.fn();
    const searchRecipes = vi.fn(async () => [{ id: 1, title: "Banana Bread" }]);
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: {
        probe: vi.fn(async () => ({ configured: true, ok: true, provider: "digitalocean-gradient" })),
        selectRecommendations: vi.fn(async () => ({
          fruitName: "banana",
          reasoning: "Very ripe bananas fit baking and smoothies.",
          recipes: [
            {
              id: 1,
              reason: "Overripe bananas are ideal for banana bread.",
              ripenessFit: "overripe",
              title: "Banana Bread",
            },
          ],
          ripenessBand: "overripe",
          ripenessScore: 9,
          status: "ok",
        })),
      },
      gemini: {
        analyzeRipeness,
        probe: vi.fn(),
      },
      recipes: {
        probe: vi.fn(),
        searchRecipes,
      },
    });

    const response = await request(app).post("/api/recipes").send({
      analysis: {
        confidence: "high",
        fruitName: "banana",
        reasoning: "Peel is mostly brown.",
        ripenessBand: "overripe",
        ripenessScore: 9,
        status: "ok",
        visibleSignals: ["brown peel"],
      },
      fruitName: "banana",
    });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("ok");
    expect(response.body.recipes[0].title).toBe("Banana Bread");
    expect(analyzeRipeness).not.toHaveBeenCalled();
    expect(searchRecipes).toHaveBeenCalledWith({
      fruitName: "banana",
      limit: 8,
      ripenessBand: "overripe",
    });
  });

  it("returns a mismatch result without fetching recipes", async () => {
    const searchRecipes = vi.fn();
    const selectRecommendations = vi.fn();
    const analyzeRipeness = vi.fn();
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations },
      gemini: {
        analyzeRipeness,
        probe: vi.fn(),
      },
      recipes: { probe: vi.fn(), searchRecipes },
    });

    const response = await request(app).post("/api/recipes").send({
      analysis: {
        confidence: "high",
        detectedFruit: "tomato",
        reasoning: "The selected fruit was banana, but the image looks like a green tomato.",
        selectedFruit: "banana",
        status: "fruit_mismatch",
        visibleSignals: ["round shape", "green tomato skin"],
      },
      fruitName: "banana",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      detectedFruit: "tomato",
      selectedFruit: "banana",
      status: "fruit_mismatch",
    });
    expect(analyzeRipeness).not.toHaveBeenCalled();
    expect(searchRecipes).not.toHaveBeenCalled();
    expect(selectRecommendations).not.toHaveBeenCalled();
  });

  it("returns a structured Gemini quota error", async () => {
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: {
        analyzeRipeness: vi.fn(async () => {
          throw new GeminiQuotaError("Gemini is out of requests right now. Try again in 38 seconds.", 38);
        }),
        probe: vi.fn(),
      },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn() },
    });

    const response = await request(app).post("/api/ripeness").send({
      fruitName: "banana",
      imageBase64: "abc123",
      mimeType: "image/jpeg",
    });

    expect(response.status).toBe(429);
    expect(response.body).toEqual({
      error: "quota_exhausted",
      message: "Gemini is out of requests right now. Try again in 38 seconds.",
      provider: "gemini",
      retryAfterSeconds: 38,
    });
  });

  it("rejects invalid requests", async () => {
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: { analyzeRipeness: vi.fn(), probe: vi.fn() },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn() },
    });

    const response = await request(app).post("/api/ripeness").send({
      fruitName: "banana",
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("invalid_request");
  });

  it("exposes a Gradient probe route", async () => {
    const app = createApiApp({
      assistant: { respond: vi.fn() },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "digitalocean-gradient" })), selectRecommendations: vi.fn() },
      gemini: { analyzeRipeness: vi.fn(), probe: vi.fn() },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn() },
    });

    const response = await request(app).get("/probe/gradient");

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("digitalocean-gradient");
  });

  it("returns assistant-guided recipe updates", async () => {
    const respond = vi.fn(async () => ({
      appliedConstraints: ["high protein", "under 30 minutes"],
      recipes: [
        {
          id: 2,
          reason: "This is the best grounded match for a higher-protein quick banana recipe.",
          ripenessFit: "ripe",
          title: "Banana Oat Protein Pancakes",
        },
      ],
      reply: "I found a quicker, higher-protein option for this banana.",
      status: "ok",
    }));
    const searchRecipes = vi.fn(async () => [{ id: 2, title: "Banana Oat Protein Pancakes" }]);
    const app = createApiApp({
      assistant: { respond },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: { analyzeRipeness: vi.fn(), probe: vi.fn() },
      recipes: { probe: vi.fn(), searchRecipes },
    });

    const response = await request(app).post("/api/recipe-assistant").send({
      analysis: {
        confidence: "high",
        fruitName: "banana",
        reasoning: "Mostly yellow peel with a few freckles.",
        ripenessBand: "ripe",
        ripenessScore: 6,
        status: "ok",
        visibleSignals: ["yellow peel"],
      },
      fruitName: "banana",
      history: [{ content: "Can you make it high protein?", role: "user" }],
      message: "Make it high protein and under 30 minutes.",
    });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      appliedConstraints: ["high protein", "under 30 minutes"],
      reply: "I found a quicker, higher-protein option for this banana.",
      status: "ok",
    });
    expect(searchRecipes).toHaveBeenCalledWith(
      expect.objectContaining({
        fruitName: "banana",
        maxReadyTime: 30,
        minProtein: 15,
        ripenessBand: "ripe",
      }),
    );
    expect(respond).toHaveBeenCalledWith(
      expect.objectContaining({
        appliedConstraints: ["under 30 minutes", "high protein"],
        message: "Make it high protein and under 30 minutes.",
      }),
    );
  });

  it("returns assistant_unavailable instead of a 500 when chat is down", async () => {
    const app = createApiApp({
      assistant: {
        respond: vi.fn(async () => {
          throw new AssistantUnavailableError("Recipe assistant is temporarily unavailable. Try again in a bit.");
        }),
      },
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: { analyzeRipeness: vi.fn(), probe: vi.fn() },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn(async () => [{ id: 2, title: "Banana Oat Protein Pancakes" }]) },
    });

    const response = await request(app).post("/api/recipe-assistant").send({
      analysis: {
        confidence: "high",
        fruitName: "banana",
        reasoning: "Mostly yellow peel with a few freckles.",
        ripenessBand: "ripe",
        ripenessScore: 6,
        status: "ok",
        visibleSignals: ["yellow peel"],
      },
      fruitName: "banana",
      history: [],
      message: "Make it vegan.",
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Recipe assistant is temporarily unavailable. Try again in a bit.",
      status: "assistant_unavailable",
    });
  });
});
