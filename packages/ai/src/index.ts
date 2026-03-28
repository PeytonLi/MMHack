import { freshnessAnalysisSchema, type FreshnessAnalysis, type SupportedSku } from "@mmhack/shared";

export type AnalyzeFreshnessInput = {
  imageBase64: string;
  mimeType: string;
  sku: SupportedSku;
};

export function buildFreshnessPrompt(sku: SupportedSku): string {
  return [
    "You are analyzing a controlled store photo of a single produce item.",
    `The selected SKU is ${sku}.`,
    "Return only JSON with the keys sku, score, confidence, visibleIssues, and rationale.",
    "score must be an integer from 1 to 10 where 10 is freshest and 1 must be discarded.",
    "confidence must be one of high, medium, or low.",
    "visibleIssues must be an array of short strings.",
    "Do not suggest a price. Do not include markdown advice.",
  ].join(" ");
}

export function parseFreshnessAnalysis(payload: unknown): FreshnessAnalysis {
  return freshnessAnalysisSchema.parse(payload);
}

export class GeminiFreshnessClient {
  constructor(private readonly apiKey: string | undefined) {}

  async analyze(_input: AnalyzeFreshnessInput): Promise<FreshnessAnalysis> {
    if (!this.apiKey) {
      throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required before live Gemini calls can be implemented.");
    }

    throw new Error("Gemini analysis is scaffolded but not implemented yet.");
  }
}
