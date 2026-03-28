import { describe, expect, it, vi } from "vitest";

import { SpoonacularRecipeProvider } from "./index";

describe("SpoonacularRecipeProvider", () => {
  it("returns a not-configured probe result without an API key", async () => {
    const provider = new SpoonacularRecipeProvider(undefined, vi.fn());

    await expect(provider.probe()).resolves.toEqual({
      configured: false,
      ok: false,
      provider: "spoonacular",
    });
  });

  it("maps recipe search results into internal candidates", async () => {
    const provider = new SpoonacularRecipeProvider(
      "test-key",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                id: 12,
                image: "https://example.com/banana-bread.jpg",
                nutrition: {
                  nutrients: [
                    { amount: 245.4, name: "Calories" },
                    { amount: 4.2, name: "Protein" },
                    { amount: 39.1, name: "Carbohydrates" },
                    { amount: 8.6, name: "Fat" },
                    { amount: 3.3, name: "Fiber" },
                  ],
                },
                readyInMinutes: 55,
                servings: 8,
                sourceName: "Example Kitchen",
                sourceUrl: "https://example.com/banana-bread",
                summary: "A sweet loaf for overripe bananas.",
                title: "Banana Bread",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    await expect(provider.searchRecipes({ fruitName: "banana", limit: 1 })).resolves.toEqual([
      {
        id: 12,
        imageUrl: "https://example.com/banana-bread.jpg",
        nutrition: {
          calories: 245,
          protein: 4,
          carbs: 39,
          fat: 9,
          fiber: 3,
        },
        readyInMinutes: 55,
        servings: 8,
        sourceName: "Example Kitchen",
        sourceUrl: "https://example.com/banana-bread",
        summary: "A sweet loaf for overripe bananas.",
        title: "Banana Bread",
      },
    ]);
  });

  it("uses ripeness-aware query fallbacks for underripe bananas", async () => {
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = String(input);

      if (url.includes("query=savory+plantain")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 41,
                nutrition: {
                  nutrients: [{ amount: 190.4, name: "Calories" }],
                },
                readyInMinutes: 25,
                servings: 4,
                title: "Buttered Plantain Fries and Seasoned Avocado",
              },
            ],
          }),
          { status: 200 },
        );
      }

      if (url.includes("query=plantain")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 42,
                nutrition: {
                  nutrients: [{ amount: 170.2, name: "Calories" }],
                },
                readyInMinutes: 30,
                servings: 6,
                title: "Garlic & Spice Plantain Chips",
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(
        JSON.stringify({
          results: [
            {
              id: 43,
              nutrition: {
                nutrients: [{ amount: 260.8, name: "Calories" }],
              },
              readyInMinutes: 60,
              servings: 8,
              title: "Chocolate Coconut Banana Bread",
            },
          ],
        }),
        { status: 200 },
      );
    });

    const provider = new SpoonacularRecipeProvider("test-key", fetcher);

    await expect(provider.searchRecipes({ fruitName: "banana", limit: 3, ripenessBand: "underripe" })).resolves.toEqual([
      {
        id: 41,
        nutrition: { calories: 190, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        readyInMinutes: 25,
        servings: 4,
        title: "Buttered Plantain Fries and Seasoned Avocado",
      },
      {
        id: 42,
        nutrition: { calories: 170, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        readyInMinutes: 30,
        servings: 6,
        title: "Garlic & Spice Plantain Chips",
      },
      {
        id: 43,
        nutrition: { calories: 261, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        readyInMinutes: 60,
        servings: 8,
        title: "Chocolate Coconut Banana Bread",
      },
    ]);

    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("maps assistant search filters into Spoonacular query params", async () => {
    const seenQueries: string[] = [];
    const fetcher = vi.fn(async (input: URL | RequestInfo) => {
      const url = new URL(String(input));
      seenQueries.push(url.searchParams.get("query") ?? "");

      expect(url.searchParams.get("diet")).toBe("vegan");
      expect(url.searchParams.get("includeIngredients")).toBe("oats");
      expect(url.searchParams.get("excludeIngredients")).toBe("peanut");
      expect(url.searchParams.get("maxReadyTime")).toBe("30");
      expect(url.searchParams.get("minProtein")).toBe("15");

      return new Response(
        JSON.stringify({
          results: [],
        }),
        { status: 200 },
      );
    });

    const provider = new SpoonacularRecipeProvider("test-key", fetcher);

    await expect(
      provider.searchRecipes({
        diets: ["vegan"],
        excludeIngredients: ["peanut"],
        fruitName: "banana",
        includeIngredients: ["oats"],
        limit: 1,
        maxReadyTime: 30,
        minProtein: 15,
        queryTerms: ["protein"],
      }),
    ).resolves.toEqual([]);

    expect(seenQueries[0]).toBe("banana protein");
  });
});
