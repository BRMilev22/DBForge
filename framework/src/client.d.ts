import { QueryResult } from "./types";

export interface QueryOptions {
  limit?: number;
  timeout?: number;
}

export interface DbForgeConfig {
  apiUrl?: string;
  apiToken: string;
}

export default class DbForgeClient {
  constructor(config: DbForgeConfig);

  static fromApiToken(config: DbForgeConfig): DbForgeClient;

  connect(): Promise<any>;

  query(sql: string, options?: QueryOptions): Promise<QueryResult>;

  select(
    table: string,
    options?: {
      columns?: string[];
      where?: Record<string, any>;
      limit?: number;
      orderBy?: string;
    }
  ): Promise<QueryResult>;

  insert(table: string, data: Record<string, any>): Promise<QueryResult>;

  update(
    table: string,
    data: Record<string, any>,
    where: Record<string, any>
  ): Promise<QueryResult>;

  delete(table: string, where: Record<string, any>): Promise<QueryResult>;
}
