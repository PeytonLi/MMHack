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

export const supportedSkuSchema = z.enum(SUPPORTED_SKUS);
export const confidenceSchema = z.enum(CONFIDENCE_LEVELS);
export const actionTypeSchema = z.enum(ACTION_TYPES);
export const voriOperationSchema = z.enum(VORI_OPERATIONS);

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

export function isLowConfidence(confidence: ConfidenceLevel): boolean {
  return confidence === "low";
}
