/**
 * DigitalOcean Gradient health check
 * Usage: node scripts/check-gradient.mjs
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
console.log("Loading .env from:", envPath);
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split(/\r?\n/)) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;
    const eqIndex = trimmedLine.indexOf("=");
    if (eqIndex === -1) continue;
    const k = trimmedLine.slice(0, eqIndex).trim();
    const v = trimmedLine.slice(eqIndex + 1).trim();
    process.env[k] = v;
  }
  console.log("Loaded .env successfully");
} catch (e) {
  console.log("Failed to load .env:", e.message);
}

const key = process.env.DO_MODEL_ACCESS_KEY;
if (!key) {
  console.error("❌ DO_MODEL_ACCESS_KEY is not set in .env");
  process.exit(1);
}

const BASE = "https://inference.do-ai.run/v1";
const models = ["llama3.3-70b-instruct", "anthropic-claude-4.6-sonnet", "openai-gpt-4o"];

async function main() {
  console.log("\n=== 1. Models endpoint ===");
  const modelsRes = await fetch(`${BASE}/models`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  if (modelsRes.ok) {
    console.log(`✅ Key is valid (HTTP ${modelsRes.status})`);
  } else {
    const body = await modelsRes.text();
    console.log(`❌ FAIL (HTTP ${modelsRes.status})`);
    console.log(body);
    process.exit(1);
  }

  console.log("\n=== 2. Chat completions ===");
  for (const model of models) {
    console.log(`\nTesting: ${model}`);
    const res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with the single word hello." }],
        max_completion_tokens: 10,
        temperature: 0,
      }),
    });

    const body = await res.json();

    if (res.ok) {
      const content = body.choices?.[0]?.message?.content;
      console.log(`  ✅ OK (HTTP ${res.status}) - Response: ${content}`);
    } else {
      console.log(`  ❌ FAIL (HTTP ${res.status})`);
      console.log(`  ${JSON.stringify(body, null, 2)}`);
    }
  }

  console.log("\n=== Done ===");
}

main();
