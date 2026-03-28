import { describe, expect, it } from "vitest";

import { buildFreshnessPrompt, parseFreshnessAnalysis } from "./index";

describe("parseFreshnessAnalysis", () => {
  it("accepts valid structured payloads", () => {
    const result = parseFreshnessAnalysis({
      confidence: "high",
      rationale: "bright peel with no major defects",
      score: 9,
      sku: "banana",
      visibleIssues: [],
    });

    expect(result.score).toBe(9);
  });

  it("rejects scores outside the allowed range", () => {
    expect(() =>
      parseFreshnessAnalysis({
        confidence: "high",
        rationale: "invalid score",
        score: 11,
        sku: "banana",
        visibleIssues: [],
      }),
    ).toThrow();
  });
});

describe("buildFreshnessPrompt", () => {
  it("anchors the response to the selected sku and JSON-only output", () => {
    const prompt = buildFreshnessPrompt("apple");

    expect(prompt).toContain("apple");
    expect(prompt).toContain("Return only JSON");
  });
});
