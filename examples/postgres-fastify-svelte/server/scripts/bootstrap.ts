import { config as loadEnv } from "dotenv";
import { DbForgeClient } from "dbforge-framework";

loadEnv();
loadEnv({ path: ".env.local", override: true });

const required = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const client = DbForgeClient.fromCredentials({
  dbType: "postgresql",
  host: required("DBFORGE_PG_HOST"),
  port: Number(required("DBFORGE_PG_PORT")),
  username: required("DBFORGE_PG_USERNAME"),
  password: required("DBFORGE_PG_PASSWORD"),
  database: required("DBFORGE_PG_DATABASE"),
});

const TABLE_NAME = "dbforge_tasks";

const seedTasks = [
  "Wire up DBForge client",
  "Test Fastify endpoints",
  "Build the Svelte dashboard",
];

async function main() {
  await client.connect();
  console.log("Ensuring table exists...");
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const existing = await client.select(TABLE_NAME, { limit: 1 });
  if (!existing.rows || existing.rows.length === 0) {
    console.log("Seeding starter tasks...");
    for (const title of seedTasks) {
      await client.insert(TABLE_NAME, { title, completed: false });
    }
  } else {
    console.log("Tasks already exist, skipping seed.");
  }

  await client.disconnect();
  console.log("Bootstrap completed.");
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
