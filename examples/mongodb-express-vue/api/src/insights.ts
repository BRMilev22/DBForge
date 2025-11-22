import { z } from "zod";
import { ObjectId } from "mongodb";

import { getMongoClient } from "./db";

const collectionName = "dbforge_insights";

const insightSchema = z.object({
  _id: z.instanceof(ObjectId),
  title: z.string(),
  summary: z.string(),
  category: z.string(),
  tags: z.array(z.string()).default([]),
  votes: z.number().default(0),
  createdAt: z.coerce.date(),
});

export type Insight = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  votes: number;
  createdAt: string;
};

const mapInsight = (document: Record<string, unknown>): Insight | null => {
  const parsed = insightSchema.safeParse(document);
  if (!parsed.success) return null;
  return {
    id: parsed.data._id.toHexString(),
    title: parsed.data.title,
    summary: parsed.data.summary,
    category: parsed.data.category,
    tags: parsed.data.tags,
    votes: parsed.data.votes,
    createdAt: parsed.data.createdAt.toISOString(),
  };
};

export const listInsights = async (tag?: string) => {
  const client = await getMongoClient();
  const filter = tag ? { tags: tag } : {};
  const result = await client.query({
    collection: collectionName,
    action: "find",
    filter,
    options: { sort: { votes: -1, createdAt: -1 }, limit: 25 },
  });

  const rows = (result.rows as Array<Record<string, unknown>>) ?? [];
  return rows.map(mapInsight).filter((item): item is Insight => Boolean(item));
};

export const createInsight = async (payload: {
  title: string;
  summary: string;
  category: string;
  tags: string[];
}) => {
  const client = await getMongoClient();
  const now = new Date();
  await client.insert(collectionName, {
    title: payload.title,
    summary: payload.summary,
    category: payload.category,
    tags: payload.tags,
    votes: 0,
    createdAt: now,
  });
  return listInsights();
};

export const voteForInsight = async (id: string) => {
  const client = await getMongoClient();
  const _id = new ObjectId(id);
  const current = await client.query({
    collection: collectionName,
    action: "find",
    filter: { _id },
    options: { limit: 1 },
  });
  const [existing] = ((current.rows as Array<Record<string, unknown>>) ?? [])
    .map(mapInsight)
    .filter((item): item is Insight => Boolean(item));
  if (!existing) {
    return null;
  }
  await client.update(
    collectionName,
    { votes: existing.votes + 1 },
    { _id },
  );
  return { ...existing, votes: existing.votes + 1 };
};
