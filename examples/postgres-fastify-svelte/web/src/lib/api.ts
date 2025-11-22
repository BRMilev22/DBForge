export type Task = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
};

export const fetchTasks = () => request<{ tasks: Task[] }>("/tasks");

export const createTask = (title: string) =>
  request<{ task: Task | null }>("/tasks", {
    method: "POST",
    body: JSON.stringify({ title }),
  });

export const toggleTask = (id: number, completed: boolean) =>
  request<{ task: Task | null }>(`/tasks/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ completed }),
  });

export const clearCompleted = () =>
  request<{ tasks: Task[] }>("/tasks/completed", {
    method: "DELETE",
  });
