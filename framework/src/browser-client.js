const DEFAULT_API_URL = 'http://localhost:8080/api';

const escapeLiteral = (value) => {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number' || typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return `'${String(value).replace(/'/g, "''")}'`;
};

const buildWhereClause = (where = {}) => {
  const entries = Object.entries(where || {}).filter(([, v]) => v !== undefined);
  if (!entries.length) return '';
  const clauses = entries.map(([column, value]) => {
    if (Array.isArray(value)) {
      const list = value.map((item) => escapeLiteral(item)).join(', ');
      return `${column} IN (${list})`;
    }
    return `${column} = ${escapeLiteral(value)}`;
  });
  return ` WHERE ${clauses.join(' AND ')}`;
};

export class DbForgeClient {
  constructor({ apiUrl = DEFAULT_API_URL, apiToken }) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
    this.connected = false;
    this.apiMode = 'public';
    this.instanceId = null;
    this.databaseMetadata = null;
  }

  static fromApiToken({ apiUrl = DEFAULT_API_URL, apiToken }) {
    if (!apiToken) {
      throw new Error('apiToken is required');
    }
    return new DbForgeClient({ apiUrl, apiToken });
  }

  async connect() {
    if (this.connected) return this.databaseMetadata;

    const publicUrl = `${this.apiUrl}/public/databases/${encodeURIComponent(this.apiToken)}`;
    const response = await fetch(publicUrl);
    if (response.ok) {
      this.databaseMetadata = await response.json();
      this.instanceId = this.databaseMetadata.id;
      this.apiMode = 'public';
      this.connected = true;
      return this.databaseMetadata;
    }

    const fallbackResponse = await fetch(`${this.apiUrl}/databases`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiToken}`,
      },
    });

    if (!fallbackResponse.ok) {
      const body = await fallbackResponse.text();
      throw new Error(`Failed to resolve database via API token (${fallbackResponse.status}): ${body}`);
    }

    const databases = await fallbackResponse.json();
    if (!Array.isArray(databases) || !databases.length) {
      throw new Error('API token is valid but no databases were returned.');
    }

    const exactMatch = databases.find((db) => db.apiToken === this.apiToken);
    this.databaseMetadata = exactMatch || databases[0];
    this.instanceId = this.databaseMetadata.id;
    this.apiMode = 'authorized';
    this.connected = true;
    return this.databaseMetadata;
  }

  async query(sql, options = {}) {
    await this.connect();
    const payload = { query: sql };
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.timeout !== undefined) payload.timeout = options.timeout;

    let endpoint = '';
    const headers = { 'Content-Type': 'application/json' };

    if (this.apiMode === 'public') {
      endpoint = `${this.apiUrl}/public/databases/${encodeURIComponent(this.apiToken)}/query`;
    } else {
      endpoint = `${this.apiUrl}/databases/${this.instanceId}/query`;
      headers.Authorization = `Bearer ${this.apiToken}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const body = await response.text();
    if (!response.ok) {
      throw new Error(`API query failed (${response.status}): ${body}`);
    }

    return JSON.parse(body);
  }

  async select(table, { columns = ['*'], where, limit, orderBy } = {}) {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    let sql = `SELECT ${cols} FROM ${table}`;
    sql += buildWhereClause(where);
    if (orderBy) sql += ` ORDER BY ${orderBy}`;
    if (limit !== undefined) sql += ` LIMIT ${limit}`;
    sql += ';';
    return this.query(sql);
  }

  async insert(table, data) {
    const entries = Object.entries(data || {}).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      throw new Error('Insert requires at least one column');
    }
    const columns = entries.map(([column]) => column).join(', ');
    const values = entries.map(([, value]) => escapeLiteral(value)).join(', ');
    const sql = `INSERT INTO ${table} (${columns}) VALUES (${values});`;
    return this.query(sql);
  }

  async update(table, data, where) {
    const entries = Object.entries(data || {}).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      throw new Error('Update requires at least one column assignment');
    }
    const setClause = entries.map(([column, value]) => `${column} = ${escapeLiteral(value)}`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause}${buildWhereClause(where)};`;
    return this.query(sql);
  }

  async delete(table, where) {
    const whereClause = buildWhereClause(where);
    if (!whereClause) {
      throw new Error('Delete requires a WHERE clause to avoid accidental truncation');
    }
    const sql = `DELETE FROM ${table}${whereClause};`;
    return this.query(sql);
  }
}

export default DbForgeClient;
