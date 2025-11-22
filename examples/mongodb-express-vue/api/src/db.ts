import { DbForgeClient } from "dbforge-framework";

import { env } from "./env";

let clientPromise: Promise<DbForgeClient> | null = null;

const createMongoClient = () => {
  if (env.DBFORGE_MONGO_URI) {
    return DbForgeClient.fromConnectionString(env.DBFORGE_MONGO_URI);
  }

  if (
    env.DBFORGE_MONGO_HOST &&
    env.DBFORGE_MONGO_USERNAME &&
    env.DBFORGE_MONGO_PASSWORD &&
    env.DBFORGE_MONGO_DATABASE
  ) {
    return DbForgeClient.fromCredentials({
      dbType: "mongodb",
      host: env.DBFORGE_MONGO_HOST,
      port: env.DBFORGE_MONGO_PORT || 27017,
      username: env.DBFORGE_MONGO_USERNAME,
      password: env.DBFORGE_MONGO_PASSWORD,
      database: env.DBFORGE_MONGO_DATABASE,
    });
  }

  throw new Error(
    "Missing MongoDB configuration. Provide DBFORGE_MONGO_URI or explicit host/username/password/database.",
  );
};

export const getMongoClient = async () => {
  if (!clientPromise) {
    const client = createMongoClient();
    clientPromise = (async () => {
      await client.connect();
      return client;
    })();
  }
  return clientPromise;
};

export const closeMongoClient = async () => {
  if (clientPromise) {
    const client = await clientPromise;
    await client.disconnect();
    clientPromise = null;
  }
};
