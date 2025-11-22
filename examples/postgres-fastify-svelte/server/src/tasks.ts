import { z } from "zod";

import { getClient } from "./db";

const TABLE_NAME = "dbforge_tasks";

const taskSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  completed: z.coerce.boolean().default(false),
  created_at: z.union([z.string(), z.date()]),
});

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

const normalizeDate = (value: string | Date) =>
  value instanceof Date ? value.toISOString() : new Date(value).toISOString();

const mapRows = (rows: Array<Record<string, unknown>> = []) =>
  rows
    .map((row) => {
      const result = taskSchema.safeParse(row);
      if (!result.success) return null;
      return {
        id: result.data.id,
        title: result.data.title,
        completed: Boolean(result.data.completed),
        createdAt: normalizeDate(result.data.created_at),
      } satisfies Task;
    })
    .filter((task): task is Task => Boolean(task));

export const listTasks = async () => {
  const client = await getClient();
  const response = await client.select(TABLE_NAME, {
    orderBy: "created_at DESC",
  });
  return mapRows(response.rows as Array<Record<string, unknown>> | undefined);
};

export const createTask = async (title: string) => {
  const client = await getClient();
  await client.insert(TABLE_NAME, { title, completed: false });
  const rows = await listTasks();
  return rows[0] ?? null;
};

export const toggleTask = async (id: number, completed: boolean) => {
  const client = await getClient();
  await client.update(TABLE_NAME, { completed }, { id });
  const tasks = await listTasks();
  return tasks.find((task) => task.id === id) ?? null;
};

export const clearCompleted = async () => {
  const client = await getClient();
  await client.delete(TABLE_NAME, { completed: true });
  return listTasks();
};
