import { GoogleGenAI } from "@google/genai";
import {
  fruitMismatchAnalysisSchema,
  fruitMismatchModelPayloadSchema,
  getRipenessBand,
  probeStatusSchema,
  ripenessAnalysisResultSchema,
  ripenessModelPayloadSchema,
  type ProbeStatus,
  type FruitMismatchAnalysis,
  type RipenessAnalysisResult,
  type SupportedSku,
} from "@mmhack/shared";

export type AnalyzeRipenessInput = {
  fruitName: SupportedSku;
  imageBase64: string;
  mimeType: string;
};

export type GeminiContentModel = {
  generateContent(request: {
    contents: Array<{
      parts: Array<
        | { text: string }
        | {
            inlineData: {
              data: string;
              mimeType: string;
            };
          }
      >;
    }>;
    model: string;
  }): Promise<{ text?: string | null }>;
};

type GeminiErrorPayload = {
  error?: {
    code?: number;
    details?: Array<{
      "@type"?: string;
      retryDelay?: string;
    }>;
    message?: string;
    status?: string;
  };
};

export class GeminiQuotaError extends Error {
  readonly error = "quota_exhausted";
  readonly provider = "gemini";
  readonly statusCode = 429;

  constructor(
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "GeminiQuotaError";
  }
}

export function isGeminiQuotaError(error: unknown): error is GeminiQuotaError {
  return error instanceof GeminiQuotaError;
}

function parseGeminiErrorPayload(error: unknown): GeminiErrorPayload | null {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  if ("error" in error) {
    return error as GeminiErrorPayload;
  }

  if ("message" in error && typeof error.message === "string") {
    try {
      return JSON.parse(error.message) as GeminiErrorPayload;
    } catch {
      return null;
    }
  }

  return null;
}

function parseRetryAfterSeconds(retryDelay: string | undefined): number | undefined {
  if (!retryDelay) {
    return undefined;
  }

  const parsed = Number.parseFloat(retryDelay.replace(/s$/, ""));
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : undefined;
}

function normalizeGeminiError(error: unknown): Error {
  const payload = parseGeminiErrorPayload(error);
  const providerError = payload?.error;
  const retryAfterSeconds = parseRetryAfterSeconds(
    providerError?.details?.find((detail) => detail["@type"] === "type.googleapis.com/google.rpc.RetryInfo")?.retryDelay,
  );

  if (
    providerError?.code === 429 ||
    providerError?.status === "RESOURCE_EXHAUSTED"
  ) {
    return new GeminiQuotaError(
      retryAfterSeconds
        ? `Gemini is out of requests right now. Try again in ${retryAfterSeconds} seconds.`
        : "Gemini is out of requests right now. Please try again later.",
      retryAfterSeconds,
    );
  }

  return error instanceof Error ? error : new Error("Gemini request failed.");
}

export function buildRipenessPrompt(fruitName: SupportedSku): string {
  return [
    "You are analyzing a controlled store photo of a single fruit item.",
    `The selected fruit is ${fruitName}.`,
    `First decide whether the image actually shows a ${fruitName}.`,
    `If the fruit matches, Return only JSON with keys status, fruitName, ripenessScore, confidence, visibleSignals, and reasoning. Set status to ok.`,
    "ripenessScore must be an integer from 1 to 10 where 1 is underripe and 10 is overripe.",
    `If the fruit does not match, Return only JSON with keys status, selectedFruit, detectedFruit, confidence, visibleSignals, and reasoning. Set status to fruit_mismatch, selectedFruit to the chosen fruit, and detectedFruit to banana, apple, tomato, or null.`,
    "When status is fruit_mismatch, do not include fruitName, ripenessScore, or ripenessBand.",
    "confidence must be one of high, medium, or low.",
    "visibleSignals must be an array of short strings about what you can see.",
    "Do not suggest a recipe. Do not include pricing advice.",
  ].join(" ");
}

function parseFruitMismatchAnalysis(payload: unknown): FruitMismatchAnalysis {
  const parsed = fruitMismatchModelPayloadSchema.parse(payload);
  return fruitMismatchAnalysisSchema.parse({
    ...parsed,
    status: "fruit_mismatch",
  });
}

export function parseRipenessAnalysis(payload: unknown): RipenessAnalysisResult {
  if (
    typeof payload === "object" &&
    payload !== null &&
    "status" in payload &&
    payload.status === "fruit_mismatch"
  ) {
    return parseFruitMismatchAnalysis(payload);
  }

  const parsed = ripenessModelPayloadSchema.parse(payload);
  return ripenessAnalysisResultSchema.parse({
    ...parsed,
    ripenessBand: getRipenessBand(parsed.ripenessScore),
    status: "ok",
  });
}

export function extractJsonObject(rawText: string): unknown {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1] : trimmed;
  return JSON.parse(candidate);
}

export class GeminiRipenessClient {
  private readonly model: GeminiContentModel;

  constructor(
    private readonly apiKey: string | undefined,
    model?: GeminiContentModel,
  ) {
    this.model =
      model ??
      ({
        generateContent: async (request) => {
          const ai = new GoogleGenAI({ apiKey: this.apiKey });
          const response = await ai.models.generateContent(request);
          return { text: response.text };
        },
      } satisfies GeminiContentModel);
  }

  async probe(): Promise<ProbeStatus> {
    if (!this.apiKey) {
      return probeStatusSchema.parse({
        configured: false,
        ok: false,
        provider: "gemini",
      });
    }

    try {
      await this.model.generateContent({
        contents: [
          {
            parts: [{ text: "Reply with the single word banana." }],
          },
        ],
        model: "gemini-3-flash-preview",
      });
    } catch (error) {
      throw normalizeGeminiError(error);
    }

    return probeStatusSchema.parse({
      configured: true,
      ok: true,
      provider: "gemini",
    });
  }

  async analyzeRipeness(input: AnalyzeRipenessInput): Promise<RipenessAnalysisResult> {
    if (!this.apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required before live Gemini calls can be implemented.");
    }

    let response: { text?: string | null };

    try {
      response = await this.model.generateContent({
        contents: [
          {
            parts: [
              { text: buildRipenessPrompt(input.fruitName) },
              {
                inlineData: {
                  data: input.imageBase64,
                  mimeType: input.mimeType,
                },
              },
            ],
          },
        ],
        model: "gemini-3-flash-preview",
      });
    } catch (error) {
      throw normalizeGeminiError(error);
    }

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsed = extractJsonObject(response.text);
    return parseRipenessAnalysis(parsed);
  }
}
