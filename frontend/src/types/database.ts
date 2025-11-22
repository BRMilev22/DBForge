export interface DatabaseType {
  id: number;
  name: string;
  displayName: string;
  defaultVersion: string;
  availableVersions: string[];
}

export interface ConnectionInfo {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  connectionString: string;
}

export interface DatabaseInstance {
  id: number;
  instanceName: string;
  databaseType: string;
  status: 'RUNNING' | 'STOPPED' | 'CREATING' | 'ERROR';
  connectionInfo: ConnectionInfo;
  apiToken?: string;
  containerId?: string;
  storage: number;  // Disk storage in MB
  memoryUsage: number;  // RAM usage in MB
  createdAt: string;
  startedAt?: string;
}

export interface CreateDatabaseRequest {
  databaseType: string;
  instanceName: string;
  dbUsername: string;
  dbPassword: string;
}

export interface ExportRequestPayload {
  format: 'csv' | 'json' | 'sql';
  tables?: string[];
  includeSchema?: boolean;
  includeHeaders?: boolean;
  limit?: number;
}
