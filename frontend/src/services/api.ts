import axios from 'axios';
import type { DatabaseType, DatabaseInstance, CreateDatabaseRequest } from '../types/database';

export interface AnalyticsResponse {
  metrics: {
    totalDatabases: number;
    runningDatabases: number;
    stoppedDatabases: number;
    totalStorage: number;
    uptime: number;
  };
  databasesByType: {
    labels: string[];
    values: number[];
  };
  databasesByStatus: {
    labels: string[];
    values: number[];
  };
  recentActivity: Array<{
    id: number;
    databaseName: string;
    databaseType: string;
    action: string;
    status: string;
    timestamp: string;
  }>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const databaseApi = {
  // Get available database types
  getTypes: async (): Promise<DatabaseType[]> => {
    const response = await api.get('/databases/types');
    return response.data;
  },

  // Get all user databases
  getDatabases: async (): Promise<DatabaseInstance[]> => {
    const response = await api.get('/databases');
    return response.data;
  },

  // Get single database
  getDatabase: async (id: number): Promise<DatabaseInstance> => {
    const response = await api.get(`/databases/${id}`);
    return response.data;
  },

  // Create new database
  createDatabase: async (request: CreateDatabaseRequest): Promise<DatabaseInstance> => {
    const response = await api.post('/databases', request);
    return response.data;
  },

  // Start database
  startDatabase: async (id: number): Promise<void> => {
    await api.post(`/databases/${id}/start`);
  },

  // Stop database
  stopDatabase: async (id: number): Promise<void> => {
    await api.post(`/databases/${id}/stop`);
  },

  // Delete database
  deleteDatabase: async (id: number): Promise<void> => {
    await api.delete(`/databases/${id}`);
  },

  // Generate API token for a database instance
  generateApiToken: async (id: number): Promise<string> => {
    const response = await api.post(`/databases/${id}/token`);
    return response.data.apiToken;
  },

  // Execute query on database
  executeQuery: async (id: number, query: string, limit?: number, timeout?: number) => {
    const response = await api.post(`/databases/${id}/query`, {
      query,
      limit,
      timeout,
    });
    return response.data;
  },

  // Get database schema
  getSchema: async (id: number) => {
    const response = await api.get(`/databases/${id}/schema`);
    return response.data;
  },
};

export const analyticsApi = {
  // Get analytics data
  getAnalytics: async (): Promise<AnalyticsResponse> => {
    const response = await api.get('/analytics');
    return response.data;
  },
};

