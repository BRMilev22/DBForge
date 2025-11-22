import cors from "cors";
import express from "express";
import { z } from "zod";

import { closeMongoClient } from "./db";
import { env } from "./env";
import { createInsight, listInsights, voteForInsight } from "./insights";

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.get("/insights", async (req, res) => {
  const tag = typeof req.query.tag === "string" ? req.query.tag : undefined;
  const insights = await listInsights(tag);
  res.json({ insights });
});

const createSchema = z.object({
  title: z.string().min(2),
  summary: z.string().min(8),
  category: z.string().min(2),
  tags: z.array(z.string()).default([]),
});

app.post("/insights", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const insights = await createInsight({
    title: parsed.data.title,
    summary: parsed.data.summary,
    category: parsed.data.category,
    tags: parsed.data.tags,
  });

  res.status(201).json({ insights });
});

const voteSchema = z.object({
  id: z.string().length(24, "Invalid Mongo ObjectId"),
});

app.post("/insights/:id/vote", async (req, res) => {
  const parsed = voteSchema.safeParse({ id: req.params.id });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  const insight = await voteForInsight(parsed.data.id);
  if (!insight) {
    res.status(404).json({ error: "Insight not found" });
    return;
  }

  res.json({ insight });
});

const server = app.listen(env.PORT, () => {
  console.log(`Mongo inspiration API ready on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  server.close();
  await closeMongoClient();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
