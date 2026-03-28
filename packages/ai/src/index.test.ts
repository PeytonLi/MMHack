import { describe, expect, it } from "vitest";

import { buildRipenessPrompt, extractJsonObject, GeminiRipenessClient, parseRipenessAnalysis } from "./index";

describe("parseRipenessAnalysis", () => {
  it("accepts valid structured payloads", () => {
    const result = parseRipenessAnalysis({
      confidence: "high",
      fruitName: "banana",
      reasoning: "Mostly brown peel and soft texture indicate a highly ripe banana.",
      ripenessBand: "underripe",
      ripenessScore: 9,
      visibleSignals: ["brown peel"],
    });

    expect(result.ripenessScore).toBe(9);
    expect(result.ripenessBand).toBe("overripe");
  });

  it("rejects scores outside the allowed range", () => {
    expect(() =>
      parseRipenessAnalysis({
        confidence: "high",
        fruitName: "banana",
        reasoning: "invalid score",
        ripenessBand: "ripe",
        ripenessScore: 11,
        visibleSignals: [],
      }),
    ).toThrow();
  });
});

describe("buildRipenessPrompt", () => {
  it("anchors the response to the selected sku and JSON-only output", () => {
    const prompt = buildRipenessPrompt("apple");

    expect(prompt).toContain("apple");
    expect(prompt).toContain("Return only JSON");
  });
});

describe("extractJsonObject", () => {
  it("parses fenced JSON", () => {
    const parsed = extractJsonObject('```json\n{"fruitName":"banana","ripenessScore":9,"confidence":"high","visibleSignals":["brown peel"],"reasoning":"very ripe"}\n```');
    expect(parsed).toMatchObject({ fruitName: "banana", ripenessScore: 9 });
  });
});

describe("GeminiRipenessClient", () => {
  it("returns a not-configured probe result without an API key", async () => {
    const client = new GeminiRipenessClient(undefined, {
      generateContent: async () => ({ text: "banana" }),
    });

    await expect(client.probe()).resolves.toEqual({
      configured: false,
      ok: false,
      provider: "gemini",
    });
  });

  it("maps model JSON output into a ripeness analysis", async () => {
    const client = new GeminiRipenessClient("test-key", {
      generateContent: async () => ({
        text: JSON.stringify({
          confidence: "medium",
          fruitName: "banana",
          reasoning: "Peel is heavily freckled and slightly collapsed.",
          ripenessScore: 8,
          visibleSignals: ["freckles", "soft shape"],
        }),
      }),
    });

    await expect(
      client.analyzeRipeness({
        fruitName: "banana",
        imageBase64: "abc123",
        mimeType: "image/jpeg",
      }),
    ).resolves.toMatchObject({
      fruitName: "banana",
      ripenessBand: "very_ripe",
      ripenessScore: 8,
    });
  });
});
