import {
  probeStatusSchema,
  recipeResponseSchema,
  type ProbeStatus,
  type RecipeCandidate,
  type RecipeRecommendation,
  type RipenessAnalysis,
  type RecipeResponse,
} from "@mmhack/shared";

const KEYWORDS_BY_BAND = {
  firm_ripe: {
    include: ["chips", "grilled", "roasted", "baked", "slaw"],
  },
  overripe: {
    include: ["bread", "muffin", "smoothie", "cake", "pancake", "pudding"],
  },
  ripe: {
    include: ["salad", "salsa", "tart", "pie", "toast"],
  },
  underripe: {
    include: ["pickled", "green", "savory", "chips", "plantain", "fries", "fried", "roasted"],
    exclude: ["bread", "muffin", "smoothie", "cake", "cookie", "milkshake", "ice cream"],
  },
  very_ripe: {
    include: ["smoothie", "bread", "fritter", "compote", "jam"],
  },
} as const;

export type RecipeDecisionInput = {
  analysis: RipenessAnalysis;
  candidates: RecipeCandidate[];
};

export type RecipeDecisionAgent = {
  probe(): Promise<ProbeStatus>;
  selectRecommendations(input: RecipeDecisionInput): Promise<RecipeResponse>;
};

type GradientFetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

type GradientChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type GradientErrorPayload = {
  error?: {
    message?: string;
  };
  message?: string;
};

type GradientSelectionPayload = {
  picks: Array<{
    id: number;
    reason: string;
  }>;
};

function ensureCandidates(input: RecipeDecisionInput): void {
  if (input.candidates.length === 0) {
    throw new Error(`No recipe candidates were found for ${input.analysis.fruitName}.`);
  }
}

function scoreRecipeForBand(recipe: RecipeCandidate, band: RipenessAnalysis["ripenessBand"]): number {
  const haystack = `${recipe.title} ${recipe.summary ?? ""}`.toLowerCase();
  const keywords = KEYWORDS_BY_BAND[band];
  const includeScore = keywords.include.reduce((score, keyword) => score + (haystack.includes(keyword) ? 2 : 0), 0);
  const excludeScore = (keywords.exclude ?? []).reduce((score, keyword) => score + (haystack.includes(keyword) ? 3 : 0), 0);
  return includeScore - excludeScore;
}

function buildReason(recipe: RecipeCandidate, analysis: RipenessAnalysis): string {
  return `Picked "${recipe.title}" because a ${analysis.ripenessBand.replace("_", " ")} ${analysis.fruitName} works well for this kind of recipe.`;
}

function buildGradientPrompt(input: RecipeDecisionInput): string {
  const recipes = input.candidates
    .map((recipe) => `- id=${recipe.id}; title=${recipe.title}; summary=${recipe.summary ?? "n/a"}`)
    .join("\n");

  return [
    `Fruit: ${input.analysis.fruitName}`,
    `Ripeness score: ${input.analysis.ripenessScore}/10`,
    `Ripeness band: ${input.analysis.ripenessBand}`,
    `Reasoning: ${input.analysis.reasoning}`,
    input.analysis.ripenessBand === "underripe"
      ? "Prefer savory, chip, fry, roasted, or plantain-style uses. Avoid soft-dessert recipes unless the candidates are otherwise weak."
      : "Prefer recipes that naturally fit the current ripeness state.",
    "Choose the best three recipes for this ripeness state.",
    "Return only JSON in the format {\"picks\":[{\"id\":123,\"reason\":\"...\"}]}",
    "Candidate recipes:",
    recipes,
  ].join("\n");
}

function extractGradientSelections(rawText: string): GradientSelectionPayload {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  return JSON.parse(candidate) as GradientSelectionPayload;
}

async function getGradientErrorDetail(response: Response): Promise<string> {
  const rawBody = await response.text();

  if (!rawBody) {
    return "";
  }

  try {
    const parsed = JSON.parse(rawBody) as GradientErrorPayload;
    return parsed.error?.message ?? parsed.message ?? rawBody;
  } catch {
    return rawBody;
  }
}

function buildResponse(
  analysis: RipenessAnalysis,
  recipes: RecipeRecommendation[],
): RecipeResponse {
  return recipeResponseSchema.parse({
    status: "ok",
    fruitName: analysis.fruitName,
    reasoning: analysis.reasoning,
    recipes,
    ripenessBand: analysis.ripenessBand,
    ripenessScore: analysis.ripenessScore,
  });
}

export class HeuristicRecipeDecisionAgent implements RecipeDecisionAgent {
  async probe(): Promise<ProbeStatus> {
    return probeStatusSchema.parse({
      configured: true,
      ok: true,
      provider: "heuristic-agent",
    });
  }

  async selectRecommendations(input: RecipeDecisionInput): Promise<RecipeResponse> {
    ensureCandidates(input);

    const ranked = [...input.candidates]
      .sort((left, right) => scoreRecipeForBand(right, input.analysis.ripenessBand) - scoreRecipeForBand(left, input.analysis.ripenessBand))
      .slice(0, 3)
      .map<RecipeRecommendation>((recipe) => ({
        ...recipe,
        reason: buildReason(recipe, input.analysis),
        ripenessFit: input.analysis.ripenessBand,
      }));

    const fallbackRecipes = input.candidates.slice(0, 3).map<RecipeRecommendation>((recipe) => ({
      ...recipe,
      reason: buildReason(recipe, input.analysis),
      ripenessFit: input.analysis.ripenessBand,
    }));

    return buildResponse(input.analysis, ranked.length > 0 ? ranked : fallbackRecipes);
  }
}

export class GradientRecipeDecisionAgent implements RecipeDecisionAgent {
  constructor(
    private readonly modelAccessKey: string | undefined,
    private readonly modelId = "llama3.3-70b-instruct",
    private readonly fetcher: GradientFetchLike = fetch,
    private readonly baseUrl = "https://inference.do-ai.run/v1",
  ) {}

  async probe(): Promise<ProbeStatus> {
    if (!this.modelAccessKey) {
      return probeStatusSchema.parse({
        configured: false,
        ok: false,
        provider: "digitalocean-gradient",
      });
    }

    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        max_completion_tokens: 16,
        messages: [
          {
            content: "Reply with strict JSON only.",
            role: "system",
          },
          {
            content: "{\"ok\":true}",
            role: "user",
          },
        ],
        model: this.modelId,
        temperature: 0,
      }),
      headers: {
        Authorization: `Bearer ${this.modelAccessKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await getGradientErrorDetail(response);
      throw new Error(`DigitalOcean Gradient probe failed with status ${response.status}${detail ? `: ${detail}` : ""}.`);
    }

    return probeStatusSchema.parse({
      configured: true,
      ok: true,
      provider: "digitalocean-gradient",
    });
  }

  async selectRecommendations(input: RecipeDecisionInput): Promise<RecipeResponse> {
    ensureCandidates(input);

    if (!this.modelAccessKey) {
      throw new Error("DO_MODEL_ACCESS_KEY is required before using the DigitalOcean-hosted recipe selector.");
    }

    const response = await this.fetcher(`${this.baseUrl}/chat/completions`, {
      body: JSON.stringify({
        max_completion_tokens: 500,
        messages: [
          {
            content: "You rank fruit recipes by ripeness suitability and return strict JSON only.",
            role: "system",
          },
          {
            content: buildGradientPrompt(input),
            role: "user",
          },
        ],
        model: this.modelId,
        temperature: 0.2,
      }),
      headers: {
        Authorization: `Bearer ${this.modelAccessKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const detail = await getGradientErrorDetail(response);
      throw new Error(`DigitalOcean Gradient selection failed with status ${response.status}${detail ? `: ${detail}` : ""}.`);
    }

    const payload = (await response.json()) as GradientChatResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DigitalOcean Gradient returned no selection content.");
    }

    const selections = extractGradientSelections(content);
    const selectedRecipes = selections.picks
      .map((pick) => {
        const recipe = input.candidates.find((candidate) => candidate.id === pick.id);
        return recipe
          ? {
              ...recipe,
              reason: pick.reason,
              ripenessFit: input.analysis.ripenessBand,
            }
          : null;
      })
      .filter((recipe): recipe is RecipeRecommendation => recipe !== null)
      .slice(0, 3);

    if (selectedRecipes.length === 0) {
      throw new Error("DigitalOcean Gradient returned no valid recipe selections.");
    }

    return buildResponse(input.analysis, selectedRecipes);
  }
}

export class FallbackRecipeDecisionAgent implements RecipeDecisionAgent {
  constructor(
    private readonly primary: RecipeDecisionAgent,
    private readonly fallback: RecipeDecisionAgent,
  ) {}

  async probe(): Promise<ProbeStatus> {
    return this.primary.probe();
  }

  async selectRecommendations(input: RecipeDecisionInput): Promise<RecipeResponse> {
    try {
      return await this.primary.selectRecommendations(input);
    } catch (error) {
      console.warn(
        "Primary recipe decision agent failed. Falling back to the heuristic agent.",
        error instanceof Error ? error.message : error,
      );
      return this.fallback.selectRecommendations(input);
    }
  }
}
