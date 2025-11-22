import { DbForgeClient } from "dbforge-framework";

import { env } from "./env";

let clientPromise: Promise<DbForgeClient> | null = null;

const createClient = () => {
  if (env.DBFORGE_REDIS_URI) {
    return DbForgeClient.fromConnectionString(env.DBFORGE_REDIS_URI);
  }

  if (!env.DBFORGE_REDIS_HOST) {
    throw new Error("Missing DBFORGE_REDIS_HOST or DBFORGE_REDIS_URI");
  }

  return DbForgeClient.fromCredentials({
    dbType: "redis",
    host: env.DBFORGE_REDIS_HOST,
    port: env.DBFORGE_REDIS_PORT || 6379,
    username: env.DBFORGE_REDIS_USERNAME,
    password: env.DBFORGE_REDIS_PASSWORD,
    database: String(env.DBFORGE_REDIS_DB),
  });
};

export const getRedisClient = async () => {
  if (!clientPromise) {
    const client = createClient();
    clientPromise = (async () => {
      await client.connect();
      return client;
    })();
  }
  return clientPromise;
};

export const closeRedisClient = async () => {
  if (clientPromise) {
    const client = await clientPromise;
    await client.disconnect();
    clientPromise = null;
  }
};
