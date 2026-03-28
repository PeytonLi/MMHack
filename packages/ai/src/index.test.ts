import { describe, expect, it } from "vitest";

import { buildRipenessPrompt, extractJsonObject, GeminiQuotaError, GeminiRipenessClient, parseRipenessAnalysis } from "./index";

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

    expect(result).toMatchObject({
      fruitName: "banana",
      ripenessBand: "overripe",
      ripenessScore: 9,
      status: "ok",
    });
  });

  it("accepts fruit mismatch payloads without ripeness fields", () => {
    const result = parseRipenessAnalysis({
      confidence: "high",
      detectedFruit: "tomato",
      reasoning: "The selected fruit is banana, but the image shows a green tomato.",
      selectedFruit: "banana",
      status: "fruit_mismatch",
      visibleSignals: ["round shape", "green skin"],
    });

    expect(result).toMatchObject({
      detectedFruit: "tomato",
      selectedFruit: "banana",
      status: "fruit_mismatch",
    });
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
    expect(prompt).toContain("fruit_mismatch");
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
      status: "ok",
    });
  });

  it("maps fruit mismatch model output into a mismatch analysis", async () => {
    const client = new GeminiRipenessClient("test-key", {
      generateContent: async () => ({
        text: JSON.stringify({
          confidence: "high",
          detectedFruit: "tomato",
          reasoning: "The image is a tomato, not a banana.",
          selectedFruit: "banana",
          status: "fruit_mismatch",
          visibleSignals: ["smooth tomato skin", "round body"],
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
      detectedFruit: "tomato",
      selectedFruit: "banana",
      status: "fruit_mismatch",
    });
  });

  it("normalizes Gemini quota exhaustion into a structured error", async () => {
    const client = new GeminiRipenessClient("test-key", {
      generateContent: async () => {
        throw new Error(
          JSON.stringify({
            error: {
              code: 429,
              details: [
                {
                  "@type": "type.googleapis.com/google.rpc.RetryInfo",
                  retryDelay: "38s",
                },
              ],
              message: "Quota exceeded.",
              status: "RESOURCE_EXHAUSTED",
            },
          }),
        );
      },
    });

    await expect(
      client.analyzeRipeness({
        fruitName: "banana",
        imageBase64: "abc123",
        mimeType: "image/jpeg",
      }),
    ).rejects.toEqual(new GeminiQuotaError("Gemini is out of requests right now. Try again in 38 seconds.", 38));
  });
});
