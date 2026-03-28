/**
 * Vercel serverless function that wraps the Express API app.
 *
 * Vercel discovers this file at `api/index.ts` and exposes it as a
 * serverless function. The `vercel.json` rewrites route all `/api/*`
 * requests here so the Express router can handle them normally.
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createApiApp, createLiveDependencies } from "../apps/api/src/app";

const app = createApiApp(createLiveDependencies());

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
