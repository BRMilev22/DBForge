import { config } from "dotenv";
import { DbForgeClient } from "dbforge-framework";

config();
config({ path: ".env.local", override: true });

const required = (key: string) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
};

const getClient = () => {
  if (process.env.DBFORGE_MONGO_URI) {
    return DbForgeClient.fromConnectionString(process.env.DBFORGE_MONGO_URI);
  }

  return DbForgeClient.fromCredentials({
    dbType: "mongodb",
    host: required("DBFORGE_MONGO_HOST"),
    port: Number(process.env.DBFORGE_MONGO_PORT || 27017),
    username: required("DBFORGE_MONGO_USERNAME"),
    password: required("DBFORGE_MONGO_PASSWORD"),
    database: required("DBFORGE_MONGO_DATABASE"),
  });
};

const collection = "dbforge_insights";

const sampleInsights = [
  {
    title: "Faster BI dashboards",
    summary: "Stream data from MongoDB change streams into lightweight cubes.",
    category: "Analytics",
    tags: ["realtime", "dashboards", "mongo"],
  },
  {
    title: "Feature flags without downtime",
    summary: "Store rollout plans in MongoDB and drive toggles from an edge worker.",
    category: "Platform",
    tags: ["edge", "feature-flags"],
  },
  {
    title: "AI note summarizer",
    summary: "Queue research notes in MongoDB and process them with small LLMs overnight.",
    category: "Productivity",
    tags: ["ai", "automation"],
  },
];

async function main() {
  const client = getClient();
  await client.connect();
  console.log("Connected to MongoDB via DbForge client");

  const existing = await client.query({
    collection,
    action: "count",
  });

  const count = typeof existing.count === "number" ? existing.count : 0;

  if (count === 0) {
    console.log("Seeding starter insights...");
    for (const insight of sampleInsights) {
      await client.insert(collection, {
        ...insight,
        votes: 0,
        createdAt: new Date(),
      });
    }
  } else {
    console.log(`Collection already contains ${count} docs, skipping seed.`);
  }

  await client.disconnect();
  console.log("Bootstrap complete.");
}

main().catch((error) => {
  console.error("Bootstrap failed:", error);
  process.exit(1);
});
