import { z } from "zod";

import { getRedisClient } from "./db";

const STREAM_KEY = "dbforge:checkins";
const USER_KEY = "dbforge:users";

const checkinSchema = z.object({
  id: z.string(),
  user: z.string(),
  message: z.string(),
  timestamp: z.number(),
});

export type Checkin = z.infer<typeof checkinSchema>;

export const listCheckins = async (count = 20) => {
  const client = await getRedisClient();
  const response = await client.query(["XREVRANGE", STREAM_KEY, "+", "-", "COUNT", String(count)]);
  const entries =
    ((response?.rows as Array<[string, unknown]>) ||
      (response?.result as Array<[string, unknown]>) ||
      []) ?? [];

  const normalizeFields = (fields: unknown) => {
    if (fields && typeof fields === "object" && !Array.isArray(fields)) {
      return fields as Record<string, string>;
    }
    if (Array.isArray(fields)) {
      const mapped: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        mapped[String(fields[i])] = String(fields[i + 1] ?? "");
      }
      return mapped;
    }
    return {};
  };

  return entries
    .map(([id, fields]) => {
      const normalized = normalizeFields(fields);
      const data = {
        id,
        user: normalized.user || "Unknown",
        message: normalized.message || "",
        timestamp: Number(normalized.timestamp),
      };
      const parsed = checkinSchema.safeParse(data);
      return parsed.success ? parsed.data : null;
    })
    .filter((item): item is Checkin => Boolean(item));
};

export const createCheckin = async (payload: { user: string; message: string }) => {
  const client = await getRedisClient();
  const timestamp = Date.now();
  await client.query([
    "XADD",
    STREAM_KEY,
    "*",
    "user",
    payload.user,
    "message",
    payload.message,
    "timestamp",
    String(timestamp),
  ]);
  await client.query(["HSET", USER_KEY, payload.user, String(timestamp)]);
  return listCheckins();
};

export const listActiveUsers = async () => {
  const client = await getRedisClient();
  const response = await client.query(["HGETALL", USER_KEY]);
  const rows =
    ((response?.rows as Array<string>) || (response?.result as Array<string>) || []) ?? [];
  const users: Array<{ name: string; lastSeen: number }> = [];
  for (let i = 0; i < rows.length; i += 2) {
    const name = rows[i];
    const lastSeen = Number(rows[i + 1]);
    users.push({ name, lastSeen });
  }
  return users.sort((a, b) => b.lastSeen - a.lastSeen);
};
