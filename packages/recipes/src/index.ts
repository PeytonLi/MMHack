import { probeStatusSchema, recipeCandidateSchema, type ProbeStatus, type RecipeCandidate, type RipenessBand, type SupportedSku } from "@mmhack/shared";

export type RecipeSearchInput = {
  fruitName: SupportedSku;
  limit?: number;
  ripenessBand?: RipenessBand;
};

export type RecipeProvider = {
  probe(): Promise<ProbeStatus>;
  searchRecipes(input: RecipeSearchInput): Promise<RecipeCandidate[]>;
};

export type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

type SpoonacularSearchResponse = {
  results?: Array<{
    id: number;
    image?: string;
    nutrition?: {
      nutrients?: Array<{
        amount?: number;
        name?: string;
      }>;
    };
    readyInMinutes?: number;
    servings?: number;
    sourceName?: string;
    sourceUrl?: string;
    summary?: string;
    title: string;
  }>;
};

const QUERY_HINTS: Partial<Record<SupportedSku, Partial<Record<RipenessBand, string[]>>>> = {
  banana: {
    // Spoonacular's plain "banana" search heavily skews toward overripe desserts.
    underripe: ["savory plantain", "plantain", "banana"],
  },
};

export class SpoonacularRecipeProvider implements RecipeProvider {
  constructor(
    private readonly apiKey: string | undefined,
    private readonly fetcher: FetchLike = fetch,
    private readonly baseUrl = "https://api.spoonacular.com",
  ) {}

  async probe(): Promise<ProbeStatus> {
    if (!this.apiKey) {
      return probeStatusSchema.parse({
        configured: false,
        ok: false,
        provider: "spoonacular",
      });
    }

    await this.searchRecipes({ fruitName: "banana", limit: 1 });

    return probeStatusSchema.parse({
      configured: true,
      ok: true,
      provider: "spoonacular",
    });
  }

  async searchRecipes(input: RecipeSearchInput): Promise<RecipeCandidate[]> {
    if (!this.apiKey) {
      throw new Error("SPOONACULAR_API_KEY is required before live recipe lookup can be implemented.");
    }

    const limit = input.limit ?? 8;
    const queries = QUERY_HINTS[input.fruitName]?.[input.ripenessBand ?? "ripe"] ?? [input.fruitName];
    const dedupedRecipes = new Map<number, RecipeCandidate>();

    for (const query of queries) {
      const searchParams = new URLSearchParams({
        addRecipeInformation: "true",
        addRecipeNutrition: "true",
        apiKey: this.apiKey,
        number: String(limit),
        query,
        sort: "popularity",
      });

      const response = await this.fetcher(`${this.baseUrl}/recipes/complexSearch?${searchParams.toString()}`);

      if (!response.ok) {
        throw new Error(`Spoonacular request failed with status ${response.status}.`);
      }

      const payload = (await response.json()) as SpoonacularSearchResponse;

      for (const recipe of payload.results ?? []) {
        const nutrients = recipe.nutrition?.nutrients ?? [];
        const getAmount = (name: string) =>
          Math.round(nutrients.find((nutrient) => nutrient.name === name)?.amount ?? 0);

        const parsed = recipeCandidateSchema.parse({
          id: recipe.id,
          imageUrl: recipe.image,
          nutrition: recipe.nutrition
            ? {
                calories: getAmount("Calories"),
                protein: getAmount("Protein"),
                carbs: getAmount("Carbohydrates"),
                fat: getAmount("Fat"),
                fiber: getAmount("Fiber"),
              }
            : undefined,
          readyInMinutes: recipe.readyInMinutes ?? undefined,
          servings: recipe.servings ?? undefined,
          sourceName: recipe.sourceName,
          sourceUrl: recipe.sourceUrl,
          summary: recipe.summary,
          title: recipe.title,
        });

        if (!dedupedRecipes.has(parsed.id)) {
          dedupedRecipes.set(parsed.id, parsed);
        }
      }

      if (dedupedRecipes.size >= limit) {
        break;
      }
    }

    return Array.from(dedupedRecipes.values()).slice(0, limit);
  }
}
