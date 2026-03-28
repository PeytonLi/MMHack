import { z } from "zod";

export const SUPPORTED_SKUS = ["banana", "apple", "tomato"] as const;
export const CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;
export const ACTION_TYPES = ["keep", "markdown", "discard", "manual_review"] as const;
export const VORI_OPERATIONS = [
  "none",
  "update_price",
  "mark_unavailable",
  "manual_review",
] as const;

export const pricingBands = [
  { label: "keep", minScore: 9, maxScore: 10, markdownPercent: 0 },
  { label: "light_markdown", minScore: 6, maxScore: 8, markdownPercent: 15 },
  { label: "deep_markdown", minScore: 3, maxScore: 5, markdownPercent: 35 },
  { label: "discard", minScore: 1, maxScore: 2, markdownPercent: 100 },
] as const;
export const RIPENESS_BANDS = ["underripe", "firm_ripe", "ripe", "very_ripe", "overripe"] as const;
export const ANALYSIS_STATUSES = ["ok", "fruit_mismatch"] as const;

export const supportedSkuSchema = z.enum(SUPPORTED_SKUS);
export const confidenceSchema = z.enum(CONFIDENCE_LEVELS);
export const actionTypeSchema = z.enum(ACTION_TYPES);
export const voriOperationSchema = z.enum(VORI_OPERATIONS);
export const ripenessBandSchema = z.enum(RIPENESS_BANDS);
export const analysisStatusSchema = z.enum(ANALYSIS_STATUSES);

export const freshnessAnalysisSchema = z.object({
  confidence: confidenceSchema,
  rationale: z.string().min(1),
  score: z.number().int().min(1).max(10),
  sku: supportedSkuSchema,
  visibleIssues: z.array(z.string()).default([]),
});

export const pricingActionSchema = z.object({
  markdownPercent: z.union([z.literal(15), z.literal(35)]).optional(),
  type: actionTypeSchema,
  voriOperation: voriOperationSchema,
});

export const fruitImageRequestSchema = z.object({
  fruitName: supportedSkuSchema,
  imageBase64: z.string().min(1),
  mimeType: z.string().min(1),
});

export const ripenessModelPayloadSchema = z.object({
  confidence: confidenceSchema,
  fruitName: supportedSkuSchema,
  reasoning: z.string().min(1),
  ripenessScore: z.number().int().min(1).max(10),
  visibleSignals: z.array(z.string()).default([]),
});

export const fruitMismatchModelPayloadSchema = z.object({
  confidence: confidenceSchema,
  detectedFruit: supportedSkuSchema.nullable(),
  reasoning: z.string().min(1),
  selectedFruit: supportedSkuSchema,
  visibleSignals: z.array(z.string()).default([]),
});

export const ripenessAnalysisSchema = ripenessModelPayloadSchema.extend({
  ripenessBand: ripenessBandSchema,
  status: z.literal("ok"),
});

export const fruitMismatchAnalysisSchema = fruitMismatchModelPayloadSchema.extend({
  status: z.literal("fruit_mismatch"),
});

export const ripenessAnalysisResultSchema = z.discriminatedUnion("status", [
  ripenessAnalysisSchema,
  fruitMismatchAnalysisSchema,
]);

export const recipeRequestSchema = z.object({
  analysis: ripenessAnalysisResultSchema,
  fruitName: supportedSkuSchema,
});

export const recipeCandidateSchema = z.object({
  id: z.number().int(),
  imageUrl: z.string().min(1).optional(),
  sourceName: z.string().min(1).optional(),
  sourceUrl: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  title: z.string().min(1),
});

export const recipeRecommendationSchema = recipeCandidateSchema.extend({
  reason: z.string().min(1),
  ripenessFit: ripenessBandSchema,
});

export const recipeResponseSchema = z.object({
  status: z.literal("ok"),
  fruitName: supportedSkuSchema,
  reasoning: z.string().min(1),
  recipes: z.array(recipeRecommendationSchema).min(1).max(3),
  ripenessBand: ripenessBandSchema,
  ripenessScore: z.number().int().min(1).max(10),
});

export const recipeApiResponseSchema = z.discriminatedUnion("status", [
  recipeResponseSchema,
  fruitMismatchAnalysisSchema,
]);

export const probeStatusSchema = z.object({
  configured: z.boolean(),
  ok: z.boolean(),
  provider: z.string().min(1),
});

export const quotaErrorResponseSchema = z.object({
  error: z.literal("quota_exhausted"),
  message: z.string().min(1),
  provider: z.literal("gemini"),
  retryAfterSeconds: z.number().int().positive().optional(),
});

export const auditRecordSchema = z.object({
  actionType: actionTypeSchema,
  confidence: confidenceSchema,
  createdAt: z.date(),
  id: z.string().min(1),
  imagePath: z.string().min(1),
  markdownPercent: z.number().int().optional(),
  rationale: z.string().min(1),
  score: z.number().int().min(1).max(10),
  sku: supportedSkuSchema,
  visibleIssues: z.array(z.string()),
  voriItemId: z.string().min(1),
  voriOperation: voriOperationSchema,
  voriResult: z.string().nullable(),
});

export type SupportedSku = z.infer<typeof supportedSkuSchema>;
export type ConfidenceLevel = z.infer<typeof confidenceSchema>;
export type ActionType = z.infer<typeof actionTypeSchema>;
export type VoriOperation = z.infer<typeof voriOperationSchema>;
export type FreshnessAnalysis = z.infer<typeof freshnessAnalysisSchema>;
export type PricingAction = z.infer<typeof pricingActionSchema>;
export type AuditRecord = z.infer<typeof auditRecordSchema>;
export type RipenessBand = z.infer<typeof ripenessBandSchema>;
export type AnalysisStatus = z.infer<typeof analysisStatusSchema>;
export type FruitImageRequest = z.infer<typeof fruitImageRequestSchema>;
export type RecipeRequest = z.infer<typeof recipeRequestSchema>;
export type RipenessModelPayload = z.infer<typeof ripenessModelPayloadSchema>;
export type FruitMismatchModelPayload = z.infer<typeof fruitMismatchModelPayloadSchema>;
export type RipenessAnalysis = z.infer<typeof ripenessAnalysisSchema>;
export type FruitMismatchAnalysis = z.infer<typeof fruitMismatchAnalysisSchema>;
export type RipenessAnalysisResult = z.infer<typeof ripenessAnalysisResultSchema>;
export type RecipeCandidate = z.infer<typeof recipeCandidateSchema>;
export type RecipeRecommendation = z.infer<typeof recipeRecommendationSchema>;
export type RecipeResponse = z.infer<typeof recipeResponseSchema>;
export type RecipeApiResponse = z.infer<typeof recipeApiResponseSchema>;
export type ProbeStatus = z.infer<typeof probeStatusSchema>;
export type QuotaErrorResponse = z.infer<typeof quotaErrorResponseSchema>;

export function isLowConfidence(confidence: ConfidenceLevel): boolean {
  return confidence === "low";
}

export function getRipenessBand(ripenessScore: number): RipenessBand {
  if (ripenessScore <= 2) {
    return "underripe";
  }

  if (ripenessScore <= 4) {
    return "firm_ripe";
  }

  if (ripenessScore <= 6) {
    return "ripe";
  }

  if (ripenessScore <= 8) {
    return "very_ripe";
  }

  return "overripe";
}
