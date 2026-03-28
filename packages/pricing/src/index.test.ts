import { describe, expect, it } from "vitest";

import { determinePricingAction } from "./index";

describe("determinePricingAction", () => {
  it("keeps price for scores 9 and 10", () => {
    expect(
      determinePricingAction({
        confidence: "high",
        rationale: "looks fresh",
        score: 9,
        sku: "banana",
        visibleIssues: [],
      }),
    ).toEqual({
      type: "keep",
      voriOperation: "none",
    });
  });

  it("applies a 15 percent markdown for scores 6 through 8", () => {
    expect(
      determinePricingAction({
        confidence: "medium",
        rationale: "minor browning",
        score: 8,
        sku: "apple",
        visibleIssues: ["minor bruise"],
      }),
    ).toEqual({
      markdownPercent: 15,
      type: "markdown",
      voriOperation: "update_price",
    });
  });

  it("applies a 35 percent markdown for scores 3 through 5", () => {
    expect(
      determinePricingAction({
        confidence: "high",
        rationale: "visible soft spots",
        score: 5,
        sku: "tomato",
        visibleIssues: ["softening"],
      }),
    ).toEqual({
      markdownPercent: 35,
      type: "markdown",
      voriOperation: "update_price",
    });
  });

  it("discards items at scores 1 and 2", () => {
    expect(
      determinePricingAction({
        confidence: "high",
        rationale: "severe decay",
        score: 2,
        sku: "banana",
        visibleIssues: ["mold"],
      }),
    ).toEqual({
      type: "discard",
      voriOperation: "mark_unavailable",
    });
  });

  it("fails safe on low confidence", () => {
    expect(
      determinePricingAction({
        confidence: "low",
        rationale: "blurry image",
        score: 7,
        sku: "apple",
        visibleIssues: [],
      }),
    ).toEqual({
      type: "manual_review",
      voriOperation: "manual_review",
    });
  });
});
