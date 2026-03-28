import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { createApiApp } from "./app";

describe("api app", () => {
  it("returns a health response", async () => {
    const app = createApiApp({
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
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "heuristic-agent" })), selectRecommendations: vi.fn() },
      gemini: {
        analyzeRipeness: vi.fn(async () => ({
          confidence: "high",
          fruitName: "banana",
          reasoning: "Strong spotting across the peel.",
          ripenessBand: "overripe",
          ripenessScore: 9,
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
    });
  });

  it("returns combined recipe recommendations", async () => {
    const app = createApiApp({
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
        })),
      },
      gemini: {
        analyzeRipeness: vi.fn(async () => ({
          confidence: "high",
          fruitName: "banana",
          reasoning: "Peel is mostly brown.",
          ripenessBand: "overripe",
          ripenessScore: 9,
          visibleSignals: ["brown peel"],
        })),
        probe: vi.fn(),
      },
      recipes: {
        probe: vi.fn(),
        searchRecipes: vi.fn(async () => [{ id: 1, title: "Banana Bread" }]),
      },
    });

    const response = await request(app).post("/api/recipes").send({
      fruitName: "banana",
      imageBase64: "abc123",
      mimeType: "image/jpeg",
    });

    expect(response.status).toBe(200);
    expect(response.body.recipes[0].title).toBe("Banana Bread");
  });

  it("rejects invalid requests", async () => {
    const app = createApiApp({
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
      agent: { probe: vi.fn(async () => ({ configured: true, ok: true, provider: "digitalocean-gradient" })), selectRecommendations: vi.fn() },
      gemini: { analyzeRipeness: vi.fn(), probe: vi.fn() },
      recipes: { probe: vi.fn(), searchRecipes: vi.fn() },
    });

    const response = await request(app).get("/probe/gradient");

    expect(response.status).toBe(200);
    expect(response.body.provider).toBe("digitalocean-gradient");
  });
});
