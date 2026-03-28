import { z } from "zod";

const apiEnvSchema = z.object({
  API_PORT: z.coerce.number().int().positive().default(4000),
  DO_GRADIENT_MODEL_ID: z.string().default("llama3.3-70b-instruct"),
  DO_MODEL_ACCESS_KEY: z.string().optional(),
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional(),
  SPOONACULAR_API_KEY: z.string().optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function getApiEnv(): ApiEnv {
  return apiEnvSchema.parse({
    API_PORT: process.env.API_PORT,
    DO_GRADIENT_MODEL_ID: process.env.DO_GRADIENT_MODEL_ID,
    DO_MODEL_ACCESS_KEY: process.env.DO_MODEL_ACCESS_KEY,
    GOOGLE_GENERATIVE_AI_API_KEY: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    SPOONACULAR_API_KEY: process.env.SPOONACULAR_API_KEY,
  });
}
