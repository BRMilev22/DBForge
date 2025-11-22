import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();
loadEnv({ path: ".env.local", override: true });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  DBFORGE_PG_HOST: z.string().min(1),
  DBFORGE_PG_PORT: z.coerce.number().int().positive().default(10020),
  DBFORGE_PG_USERNAME: z.string().min(1),
  DBFORGE_PG_PASSWORD: z.string().min(1),
  DBFORGE_PG_DATABASE: z.string().min(1),
  DBFORGE_API_TOKEN: z.string().optional(),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:", result.error.flatten().fieldErrors);
  throw new Error("Fix environment variables and restart the server.");
}

export const env = result.data;
