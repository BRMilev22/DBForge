import { DbForgeClient } from "dbforge-framework";

import { env } from "./env";

let client: DbForgeClient | null = null;

export const getClient = async () => {
  if (!client) {
    client = DbForgeClient.fromCredentials({
      dbType: "postgresql",
      host: env.DBFORGE_PG_HOST,
      port: env.DBFORGE_PG_PORT,
      username: env.DBFORGE_PG_USERNAME,
      password: env.DBFORGE_PG_PASSWORD,
      database: env.DBFORGE_PG_DATABASE,
    });
    await client.connect();
  }
  return client;
};

export const closeClient = async () => {
  if (client) {
    await client.disconnect();
    client = null;
  }
};
