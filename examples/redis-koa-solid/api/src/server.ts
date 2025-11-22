import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { z } from "zod";

import { closeRedisClient } from "./db";
import { env } from "./env";
import { createCheckin, listActiveUsers, listCheckins } from "./checkins";

const app = new Koa();
const router = new Router();

app.use(cors());
app.use(bodyParser());

router.get("/health", (ctx) => {
  ctx.body = { status: "ok" };
});

router.get("/checkins", async (ctx) => {
  const checkins = await listCheckins();
  const users = await listActiveUsers();
  ctx.body = { checkins, users };
});

const schema = z.object({
  user: z.string().min(2),
  message: z.string().min(2),
});

router.post("/checkins", async (ctx) => {
  const parsed = schema.safeParse(ctx.request.body);
  if (!parsed.success) {
    ctx.status = 400;
    ctx.body = { error: parsed.error.flatten().fieldErrors };
    return;
  }
  const checkins = await createCheckin(parsed.data);
  const users = await listActiveUsers();
  ctx.body = { checkins, users };
});

app.use(router.routes());
app.use(router.allowedMethods());

const server = app.listen(env.PORT, () => {
  console.log(`Redis pulse API listening on http://localhost:${env.PORT}`);
});

const shutdown = async () => {
  server.close();
  await closeRedisClient();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
