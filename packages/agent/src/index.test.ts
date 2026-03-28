import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import {
  FallbackRecipeDecisionAgent,
  GradientRecipeAssistantAgent,
  GradientRecipeDecisionAgent,
  HeuristicRecipeDecisionAgent,
  extractRecipeAssistantConstraints,
  resolveRecipeAssistantConstraints,
} from "./index";

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

describe("GradientRecipeAssistantAgent", () => {
  it("extracts common assistant constraints from freeform text", () => {
    expect(extractRecipeAssistantConstraints("Make it vegan, high protein, under 20 minutes, and without nuts.")).toEqual({
      appliedConstraints: ["vegan", "under 20 minutes", "high protein", "exclude nuts"],
      diets: ["vegan"],
      excludeIngredients: ["nuts"],
      includeIngredients: [],
      intolerances: [],
      maxCarbs: undefined,
      maxReadyTime: 20,
      minProtein: 15,
      queryTerms: ["protein"],
    });
  });

  it("extracts exact macro targets and avoid directives from freeform text", () => {
    expect(extractRecipeAssistantConstraints("Find recipes with 20 grams of protein at least and avoid nuts.")).toEqual({
      appliedConstraints: ["at least 20g protein", "exclude nuts"],
      diets: [],
      excludeIngredients: ["nuts"],
      includeIngredients: [],
      intolerances: [],
      maxCarbs: undefined,
      maxReadyTime: undefined,
      minProtein: 20,
      queryTerms: ["protein"],
    });

    expect(extractRecipeAssistantConstraints("Find recipes with less than 32 grams of carbs.")).toEqual({
      appliedConstraints: ["under 32g carbs"],
      diets: [],
      excludeIngredients: [],
      includeIngredients: [],
      intolerances: [],
      maxCarbs: 32,
      maxReadyTime: undefined,
      minProtein: undefined,
      queryTerms: [],
    });
  });

  it("resolves active constraints across chat history with later numeric overrides", () => {
    expect(
      resolveRecipeAssistantConstraints(
        [
          { role: "user", content: "Can you find recipes that have 30 grams of protein or more?" },
          { role: "assistant", content: "None of the recipes meet the 30g protein requirement." },
          { role: "user", content: "Avoid nuts." },
          { role: "user", content: "Make it vegan." },
        ],
        "Find recipes with 20 grams of protein at least and less than 32 grams of carbs.",
      ),
    ).toEqual({
      appliedConstraints: ["exclude nuts", "vegan", "at least 20g protein", "under 32g carbs"],
      diets: ["vegan"],
      excludeIngredients: ["nuts"],
      includeIngredients: [],
      intolerances: [],
      maxCarbs: 32,
      maxReadyTime: undefined,
      minProtein: 20,
      queryTerms: ["protein"],
    });
  });

  it("maps grounded assistant replies back to recipe recommendations", async () => {
    const agent = new GradientRecipeAssistantAgent(
      "do-key",
      "llama3.3-70b-instruct",
      async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    reply: "This one is quicker and fits the high-protein request better.",
                    appliedConstraints: ["high protein", "under 30 minutes"],
                    picks: [{ id: 2, reason: "This candidate is quicker and higher in protein." }],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
    );

    await expect(
      agent.respond({
        analysis: {
          confidence: "high",
          fruitName: "banana",
          reasoning: "Mostly yellow peel with a few freckles.",
          ripenessBand: "ripe",
          ripenessScore: 6,
          visibleSignals: ["yellow peel"],
        },
        appliedConstraints: ["high protein", "under 30 minutes"],
        candidates: [
          { id: 1, title: "Banana Bread" },
          { id: 2, title: "Banana Oat Protein Pancakes" },
        ],
        history: [{ role: "assistant", content: "How should I refine these?" }],
        message: "Make it high protein and under 30 minutes.",
      }),
    ).resolves.toMatchObject({
      appliedConstraints: ["high protein", "under 30 minutes"],
      reply: "This one is quicker and fits the high-protein request better.",
      recipes: [{ title: "Banana Oat Protein Pancakes" }],
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
