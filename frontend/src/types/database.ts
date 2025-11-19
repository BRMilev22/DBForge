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
  containerId?: string;
  createdAt: string;
  startedAt?: string;
}

export interface CreateDatabaseRequest {
  databaseType: string;
  instanceName: string;
  dbUsername: string;
  dbPassword: string;
}
