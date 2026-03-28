import {
  freshnessAnalysisSchema,
  isLowConfidence,
  pricingActionSchema,
  type FreshnessAnalysis,
  type PricingAction,
} from "@mmhack/shared";

export function determinePricingAction(analysis: FreshnessAnalysis): PricingAction {
  const parsed = freshnessAnalysisSchema.parse(analysis);

  if (isLowConfidence(parsed.confidence)) {
    return pricingActionSchema.parse({
      type: "manual_review",
      voriOperation: "manual_review",
    });
  }

  if (parsed.score >= 9) {
    return pricingActionSchema.parse({
      type: "keep",
      voriOperation: "none",
    });
  }

  if (parsed.score >= 6) {
    return pricingActionSchema.parse({
      markdownPercent: 15,
      type: "markdown",
      voriOperation: "update_price",
    });
  }

  if (parsed.score >= 3) {
    return pricingActionSchema.parse({
      markdownPercent: 35,
      type: "markdown",
      voriOperation: "update_price",
    });
  }

  return pricingActionSchema.parse({
    type: "discard",
    voriOperation: "mark_unavailable",
  });
}
