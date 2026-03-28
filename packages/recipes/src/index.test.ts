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
              title: "Chocolate Coconut Banana Bread",
            },
          ],
        }),
        { status: 200 },
      );
    });

    const provider = new SpoonacularRecipeProvider("test-key", fetcher);

    await expect(provider.searchRecipes({ fruitName: "banana", limit: 3, ripenessBand: "underripe" })).resolves.toEqual([
      { id: 41, title: "Buttered Plantain Fries and Seasoned Avocado" },
      { id: 42, title: "Garlic & Spice Plantain Chips" },
      { id: 43, title: "Chocolate Coconut Banana Bread" },
    ]);

    expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
