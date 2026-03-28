import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import { FallbackRecipeDecisionAgent, GradientRecipeDecisionAgent, HeuristicRecipeDecisionAgent } from "./index";

describe("HeuristicRecipeDecisionAgent", () => {
  it("prefers overripe banana recipes such as bread and smoothies", async () => {
    const agent = new HeuristicRecipeDecisionAgent();

    const result = await agent.selectRecommendations({
      analysis: {
        confidence: "high",
        fruitName: "banana",
        reasoning: "Very spotted peel and collapsing structure.",
        ripenessBand: "overripe",
        ripenessScore: 9,
        visibleSignals: ["brown peel", "soft shape"],
      },
      candidates: [
        { id: 1, title: "Banana Chips" },
        { id: 2, title: "Banana Bread" },
        { id: 3, title: "Banana Smoothie" },
      ],
    });

    expect(result.recipes[0]?.title).toBe("Banana Bread");
    expect(result.recipes[1]?.title).toBe("Banana Smoothie");
  });

  it("prefers savory or starchy candidates for underripe bananas", async () => {
    const agent = new HeuristicRecipeDecisionAgent();

    const result = await agent.selectRecommendations({
      analysis: {
        confidence: "high",
        fruitName: "banana",
        reasoning: "Bright green peel and very firm texture.",
        ripenessBand: "underripe",
        ripenessScore: 2,
        visibleSignals: ["green peel", "firm shape"],
      },
      candidates: [
        { id: 1, title: "Banana Bread" },
        { id: 2, title: "Garlic & Spice Plantain Chips" },
        { id: 3, title: "Buttered Plantain Fries and Seasoned Avocado" },
        { id: 4, title: "Banana Smoothie" },
      ],
    });

    expect(result.recipes[0]?.title).toBe("Garlic & Spice Plantain Chips");
    expect(result.recipes[1]?.title).toBe("Buttered Plantain Fries and Seasoned Avocado");
  });
});

describe("GradientRecipeDecisionAgent", () => {
  it("probes the chat completions endpoint instead of only listing models", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: "{\"ok\":true}" } }] }), { status: 200 }));
    const agent = new GradientRecipeDecisionAgent("do-key", "llama3.3-70b-instruct", fetcher);

    await expect(agent.probe()).resolves.toEqual({
      configured: true,
      ok: true,
      provider: "digitalocean-gradient",
    });

    expect(fetcher).toHaveBeenCalledWith(
      "https://inference.do-ai.run/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("maps Gradient selections back to recipe candidates", async () => {
    const agent = new GradientRecipeDecisionAgent(
      "do-key",
      "llama3.3-70b-instruct",
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    picks: [{ id: 2, reason: "Banana bread uses overripe bananas well." }],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );

    await expect(
      agent.selectRecommendations({
        analysis: {
          confidence: "high",
          fruitName: "banana",
          reasoning: "Very spotted peel and collapsing structure.",
          ripenessBand: "overripe",
          ripenessScore: 9,
          visibleSignals: ["brown peel", "soft shape"],
        },
        candidates: [
          { id: 1, title: "Banana Chips" },
          { id: 2, title: "Banana Bread" },
        ],
      }),
    ).resolves.toMatchObject({
      recipes: [{ reason: "Banana bread uses overripe bananas well.", title: "Banana Bread" }],
    });
  });
});

describe("FallbackRecipeDecisionAgent", () => {
  it("falls back to the heuristic agent when the primary agent fails", async () => {
    const primary = new GradientRecipeDecisionAgent(
      "do-key",
      "llama3.3-70b-instruct",
      async () => new Response("boom", { status: 500 }),
    );
    const fallback = new HeuristicRecipeDecisionAgent();
    const agent = new FallbackRecipeDecisionAgent(primary, fallback);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      const result = await agent.selectRecommendations({
        analysis: {
          confidence: "high",
          fruitName: "banana",
          reasoning: "Very spotted peel and collapsing structure.",
          ripenessBand: "overripe",
          ripenessScore: 9,
          visibleSignals: ["brown peel", "soft shape"],
        },
        candidates: [
          { id: 1, title: "Banana Chips" },
          { id: 2, title: "Banana Bread" },
        ],
      });

      expect(result.recipes[0]?.title).toBe("Banana Bread");
      expect(warnSpy).toHaveBeenCalledWith(
        "Primary recipe decision agent failed. Falling back to the heuristic agent.",
        expect.stringContaining("DigitalOcean Gradient selection failed with status 500"),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });
});
