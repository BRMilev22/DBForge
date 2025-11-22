export type Checkin = {
  id: string;
  user: string;
  message: string;
  timestamp: number;
};

export type ActiveUser = {
  name: string;
  lastSeen: number;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4200";

const request = async <T>(path: string, init?: RequestInit) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || `Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export const fetchCheckins = () =>
  request<{ checkins: Checkin[]; users: ActiveUser[] }>("/checkins");

export const submitCheckin = (payload: { user: string; message: string }) =>
  request<{ checkins: Checkin[]; users: ActiveUser[] }>("/checkins", {
    method: "POST",
    body: JSON.stringify(payload),
  });
