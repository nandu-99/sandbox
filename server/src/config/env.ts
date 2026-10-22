import "dotenv/config";

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  FRONTEND_URL: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().trim().min(1).default("file:./data/bootstrapper.db"),
  GEMINI_API_KEY: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    z.string().trim().min(1).optional(),
  ),
  GEMINI_MODEL: z.string().trim().min(1).default("gemini-flash-latest"),
});

export const env = envSchema.parse(process.env);
