import cors from "cors";
import express from "express";
import { ZodError } from "zod";

import {
  AssistantUnavailableError,
  FallbackRecipeDecisionAgent,
  GradientRecipeAssistantAgent,
  GradientRecipeDecisionAgent,
  HeuristicRecipeDecisionAgent,
  extractRecipeAssistantConstraints,
  isAssistantUnavailableError,
  type RecipeAssistantAgent,
  type RecipeDecisionAgent,
} from "@mmhack/agent";
import { GeminiRipenessClient, isGeminiQuotaError, type AnalyzeRipenessInput } from "@mmhack/ai";
import { SpoonacularRecipeProvider } from "@mmhack/recipes";
import {
  fruitImageRequestSchema,
  quotaErrorResponseSchema,
  recipeAssistantRequestSchema,
  recipeAssistantResponseSchema,
  recipeRequestSchema,
  type RipenessAnalysisResult,
} from "@mmhack/shared";

import { getApiEnv, type ApiEnv } from "./env";

export type ApiDependencies = {
  assistant: RecipeAssistantAgent;
  agent: RecipeDecisionAgent;
  gemini: {
    analyzeRipeness(input: AnalyzeRipenessInput): Promise<RipenessAnalysisResult>;
    probe: Pick<GeminiRipenessClient, "probe">["probe"];
  };
  recipes: Pick<SpoonacularRecipeProvider, "probe" | "searchRecipes">;
};

export function createLiveDependencies(env: ApiEnv = getApiEnv()): ApiDependencies {
  const fallbackAgent = new HeuristicRecipeDecisionAgent();
  const gradientAgent = new GradientRecipeDecisionAgent(env.DO_MODEL_ACCESS_KEY, env.DO_GRADIENT_MODEL_ID);

  return {
    assistant: new GradientRecipeAssistantAgent(env.DO_MODEL_ACCESS_KEY, env.DO_GRADIENT_MODEL_ID),
    agent: env.DO_MODEL_ACCESS_KEY ? new FallbackRecipeDecisionAgent(gradientAgent, fallbackAgent) : fallbackAgent,
    gemini: new GeminiRipenessClient(env.GOOGLE_GENERATIVE_AI_API_KEY),
    recipes: new SpoonacularRecipeProvider(env.SPOONACULAR_API_KEY),
  };
}

export function createApiApp(dependencies: ApiDependencies = createLiveDependencies()): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true, service: "api" });
  });

  app.get("/probe/gemini", async (_request, response, next) => {
    try {
      response.json(await dependencies.gemini.probe());
    } catch (error) {
      next(error);
    }
  });

  app.get("/probe/gradient", async (_request, response, next) => {
    try {
      response.json(await dependencies.agent.probe());
    } catch (error) {
      next(error);
    }
  });

  app.get("/probe/spoonacular", async (_request, response, next) => {
    try {
      response.json(await dependencies.recipes.probe());
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/ripeness", async (request, response, next) => {
    try {
      const body = fruitImageRequestSchema.parse(request.body);
      const analysis = await dependencies.gemini.analyzeRipeness(mapFruitRequest(body));
      response.json(analysis);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/recipes", async (request, response, next) => {
    try {
      const body = recipeRequestSchema.parse(request.body);
      const analysis = body.analysis;
      if (analysis.status === "fruit_mismatch") {
        response.json(analysis);
        return;
      }
      const candidates = await dependencies.recipes.searchRecipes({
        fruitName: body.fruitName,
        limit: 8,
        ripenessBand: analysis.ripenessBand,
      });
      response.json(
        await dependencies.agent.selectRecommendations({
          analysis,
          candidates,
        }),
      );
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/recipe-assistant", async (request, response, next) => {
    try {
      const body = recipeAssistantRequestSchema.parse(request.body);
      const hints = extractRecipeAssistantConstraints(body.message);
      const candidates = await dependencies.recipes.searchRecipes({
        diets: hints.diets,
        excludeIngredients: hints.excludeIngredients,
        fruitName: body.fruitName,
        includeIngredients: hints.includeIngredients,
        intolerances: hints.intolerances,
        limit: 8,
        maxCarbs: hints.maxCarbs,
        maxReadyTime: hints.maxReadyTime,
        minProtein: hints.minProtein,
        queryTerms: hints.queryTerms,
        ripenessBand: body.analysis.ripenessBand,
      });

      if (candidates.length === 0) {
        response.json(
          recipeAssistantResponseSchema.parse({
            appliedConstraints: hints.appliedConstraints,
            recipes: [],
            reply: "I couldn't find grounded matches for that request. Try relaxing one of the constraints and ask again.",
            status: "ok",
          }),
        );
        return;
      }

      response.json(
        recipeAssistantResponseSchema.parse(
          await dependencies.assistant.respond({
            analysis: body.analysis,
            appliedConstraints: hints.appliedConstraints,
            candidates,
            history: body.history,
            message: body.message,
          }),
        ),
      );
    } catch (error) {
      if (isAssistantUnavailableError(error)) {
        response.json(
          recipeAssistantResponseSchema.parse({
            message: error.message,
            status: "assistant_unavailable",
          }),
        );
        return;
      }

      next(error);
    }
  });

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "invalid_request",
        issues: error.issues,
      });
      return;
    }

    if (isGeminiQuotaError(error)) {
      response.status(error.statusCode).json(
        quotaErrorResponseSchema.parse({
          error: error.error,
          message: error.message,
          provider: error.provider,
          retryAfterSeconds: error.retryAfterSeconds,
        }),
      );
      return;
    }

    if (error instanceof AssistantUnavailableError) {
      response.json(
        recipeAssistantResponseSchema.parse({
          message: error.message,
          status: "assistant_unavailable",
        }),
      );
      return;
    }

    response.status(500).json({
      error: error instanceof Error ? error.message : "unknown_error",
    });
  });

  return app;
}

function mapFruitRequest(body: {
  fruitName: AnalyzeRipenessInput["fruitName"];
  imageBase64: string;
  mimeType: string;
}): AnalyzeRipenessInput {
  return {
    fruitName: body.fruitName,
    imageBase64: body.imageBase64,
    mimeType: body.mimeType,
  };
}
