export type Insight = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  votes: number;
  createdAt: string;
};

export type CreateInsightInput = {
  title: string;
  summary: string;
  category: string;
  tags: string[];
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export const fetchInsights = (tag?: string) => {
  const query = tag ? `?tag=${encodeURIComponent(tag)}` : "";
  return request<{ insights: Insight[] }>(`/insights${query}`);
};

export const createInsight = (data: CreateInsightInput) =>
  request<{ insights: Insight[] }>("/insights", {
    method: "POST",
    body: JSON.stringify(data),
  });

export const voteInsight = (id: string) =>
  request<{ insight: Insight }>(`/insights/${id}/vote`, {
    method: "POST",
  });
