import Fastify from "fastify";
import cors from "@fastify/cors";
import { z } from "zod";

import { closeClient } from "./db";
import { env } from "./env";
import { clearCompleted, createTask, listTasks, toggleTask } from "./tasks";

const fastify = Fastify({
  logger: true,
});

await fastify.register(cors, {
  origin: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});

fastify.get("/health", async () => ({ status: "ok" }));

fastify.get("/tasks", async () => {
  const tasks = await listTasks();
  return { tasks };
});

const createSchema = z.object({
  title: z.string().min(1, "Title is required"),
});

fastify.post("/tasks", async (request, reply) => {
  const parsed = createSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: parsed.error.flatten().fieldErrors };
  }
  const created = await createTask(parsed.data.title);
  return { task: created };
});

const toggleSchema = z.object({
  completed: z.boolean(),
});

fastify.patch("/tasks/:id", async (request, reply) => {
  const id = Number((request.params as { id: string }).id);
  if (Number.isNaN(id)) {
    reply.code(400);
    return { error: "Invalid id" };
  }
  const parsed = toggleSchema.safeParse(request.body);
  if (!parsed.success) {
    reply.code(400);
    return { error: parsed.error.flatten().fieldErrors };
  }
  const task = await toggleTask(id, parsed.data.completed);
  if (!task) {
    reply.code(404);
    return { error: "Task not found" };
  }
  return { task };
});

fastify.delete("/tasks/completed", async () => {
  const tasks = await clearCompleted();
  return { tasks };
});

const shutdown = async () => {
  fastify.log.info("Shutting down...");
  await fastify.close();
  await closeClient();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: "0.0.0.0" });
  } catch (error) {
    fastify.log.error(error);
    process.exit(1);
  }
};

start();
