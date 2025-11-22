import { config } from "dotenv";
import { z } from "zod";

config();
config({ path: ".env.local", override: true });

const schema = z.object({
  PORT: z.coerce.number().default(4100),
  DBFORGE_MONGO_URI: z.string().optional(),
  DBFORGE_MONGO_HOST: z.string().optional(),
  DBFORGE_MONGO_PORT: z.coerce.number().int().positive().optional(),
  DBFORGE_MONGO_USERNAME: z.string().optional(),
  DBFORGE_MONGO_PASSWORD: z.string().optional(),
  DBFORGE_MONGO_DATABASE: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

export const env = parsed.data;
