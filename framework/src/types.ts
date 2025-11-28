export interface QueryResult {
  success: boolean;
  rows?: any[];
  rowCount?: number;
  columns?: string[];
  error?: string;
}
