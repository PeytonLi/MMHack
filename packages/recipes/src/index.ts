import { probeStatusSchema, recipeCandidateSchema, type ProbeStatus, type RecipeCandidate, type SupportedSku } from "@mmhack/shared";

export type RecipeSearchInput = {
  fruitName: SupportedSku;
  limit?: number;
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
    sourceName?: string;
    sourceUrl?: string;
    summary?: string;
    title: string;
  }>;
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

    const searchParams = new URLSearchParams({
      addRecipeInformation: "true",
      apiKey: this.apiKey,
      number: String(input.limit ?? 8),
      query: input.fruitName,
      sort: "popularity",
    });

    const response = await this.fetcher(`${this.baseUrl}/recipes/complexSearch?${searchParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Spoonacular request failed with status ${response.status}.`);
    }

    const payload = (await response.json()) as SpoonacularSearchResponse;

    return (payload.results ?? []).map((recipe) =>
      recipeCandidateSchema.parse({
        id: recipe.id,
        imageUrl: recipe.image,
        sourceName: recipe.sourceName,
        sourceUrl: recipe.sourceUrl,
        summary: recipe.summary,
        title: recipe.title,
      }),
    );
  }
}
