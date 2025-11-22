import { config } from "dotenv";
import { DbForgeClient } from "dbforge-framework";

config();
config({ path: ".env.local", override: true });

const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing env var: ${key}`);
  return value;
};

const connection =
  process.env.DBFORGE_REDIS_URI ||
  `redis://${encodeURIComponent(required("DBFORGE_REDIS_USERNAME"))}:${encodeURIComponent(
    required("DBFORGE_REDIS_PASSWORD"),
  )}@${required("DBFORGE_REDIS_HOST")}:${required("DBFORGE_REDIS_PORT")}`;

const client = DbForgeClient.fromConnectionString(connection);
const STREAM_KEY = "dbforge:checkins";
const USER_KEY = "dbforge:users";

const sample = [
  { user: "Marin", message: "Provisioned a new Redis cache for chat presence." },
  { user: "Tina", message: "Shipped Lua scripts for atomic leaderboard updates." },
  { user: "Alex", message: "Paired DBForge API token with Redis CLI for quick dashboards." },
];

async function main() {
  await client.connect();
  console.log("Connected to Redis via DbForge client.");
  await client.query(["DEL", STREAM_KEY, USER_KEY]);
  for (const entry of sample) {
    const timestamp = Date.now();
    await client.query([
      "XADD",
      STREAM_KEY,
      "*",
      "user",
      entry.user,
      "message",
      entry.message,
      "timestamp",
      String(timestamp),
    ]);
    await client.query(["HSET", USER_KEY, entry.user, String(timestamp)]);
  }
  await client.disconnect();
  console.log("Seeded stream + user hash.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
