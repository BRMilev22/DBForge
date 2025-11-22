import { config } from "dotenv";
import { z } from "zod";

config();
config({ path: ".env.local", override: true });

const schema = z.object({
  PORT: z.coerce.number().default(4200),
  DBFORGE_REDIS_HOST: z.string().optional(),
  DBFORGE_REDIS_PORT: z.coerce.number().int().positive().optional(),
  DBFORGE_REDIS_USERNAME: z.string().optional(),
  DBFORGE_REDIS_PASSWORD: z.string().optional(),
  DBFORGE_REDIS_DB: z.coerce.number().int().nonnegative().default(0),
  DBFORGE_REDIS_URI: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
