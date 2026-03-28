import { GoogleGenAI } from "@google/genai";
import {
  getRipenessBand,
  probeStatusSchema,
  ripenessModelPayloadSchema,
  ripenessAnalysisSchema,
  type ProbeStatus,
  type RipenessAnalysis,
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

export function buildRipenessPrompt(fruitName: SupportedSku): string {
  return [
    "You are analyzing a controlled store photo of a single fruit item.",
    `The selected fruit is ${fruitName}.`,
    "Return only JSON with the keys fruitName, ripenessScore, confidence, visibleSignals, and reasoning.",
    "ripenessScore must be an integer from 1 to 10 where 1 is underripe and 10 is overripe.",
    "confidence must be one of high, medium, or low.",
    "visibleSignals must be an array of short strings about what you can see.",
    "Do not suggest a recipe. Do not include pricing advice.",
  ].join(" ");
}

export function parseRipenessAnalysis(payload: unknown): RipenessAnalysis {
  const parsed = ripenessModelPayloadSchema.parse(payload);
  return ripenessAnalysisSchema.parse({
    ...parsed,
    ripenessBand: getRipenessBand(parsed.ripenessScore),
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

    await this.model.generateContent({
      contents: [
        {
          parts: [{ text: "Reply with the single word banana." }],
        },
      ],
      model: "gemini-3-flash-preview",
    });

    return probeStatusSchema.parse({
      configured: true,
      ok: true,
      provider: "gemini",
    });
  }

  async analyzeRipeness(input: AnalyzeRipenessInput): Promise<RipenessAnalysis> {
    if (!this.apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required before live Gemini calls can be implemented.");
    }

    const response = await this.model.generateContent({
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

    if (!response.text) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsed = extractJsonObject(response.text);
    return parseRipenessAnalysis(parsed);
  }
}
