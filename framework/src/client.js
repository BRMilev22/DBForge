const DEFAULT_API_URL = 'http://localhost:8080/api';
const SUPPORTED_SQL_DBS = ['mysql', 'mariadb', 'postgresql', 'postgres'];

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

let mysqlModule = null;
let pgModule = null;

const loadMysql = async () => {
  if (!mysqlModule) {
    mysqlModule = await import('mysql2/promise');
  }
  return mysqlModule.default || mysqlModule;
};

const loadPgClient = async () => {
  if (!pgModule) {
    pgModule = await import('pg');
  }
  return pgModule.Client || pgModule;
};

export class DbForgeClient {
  constructor(config) {
    this.config = config;
    this.mode = config.mode; // api | direct
    this.driver = config.driver || null; // mysql | postgres
    this.connection = null;
    this.connected = false;
    this.apiMode = 'public';
    this.instanceId = null;
    this.databaseMetadata = null;
  }

  static fromApiToken({ apiUrl = DEFAULT_API_URL, apiToken }) {
    if (!apiToken) {
      throw new Error('apiToken is required to create a DbForgeClient via token');
    }
    return new DbForgeClient({ mode: 'api', apiUrl, apiToken });
  }

  static fromConnectionString(connectionString, overrides = {}) {
    if (!connectionString) {
      throw new Error('connectionString is required');
    }

    const parsed = new URL(connectionString);
    const protocol = parsed.protocol.replace(':', '').toLowerCase();

    if (!SUPPORTED_SQL_DBS.includes(protocol)) {
      throw new Error(`Unsupported database type: ${protocol}`);
    }

    const driver = protocol.startsWith('post') ? 'postgres' : 'mysql';
    const port = parsed.port
      ? Number(parsed.port)
      : driver === 'postgres'
      ? 5432
      : 3306;

    return new DbForgeClient({
      mode: 'direct',
      driver,
      host: parsed.hostname,
      port,
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      ...overrides,
    });
  }

  static fromCredentials({
    dbType = 'mysql',
    host = 'localhost',
    port,
    username,
    password,
    database,
  }) {
    if (!username || !password || !database) {
      throw new Error('username, password, and database are required for credential connections');
    }
    const normalized = dbType.toLowerCase();
    if (!SUPPORTED_SQL_DBS.includes(normalized)) {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    const driver = normalized.startsWith('post') ? 'postgres' : 'mysql';

    return new DbForgeClient({
      mode: 'direct',
      driver,
      host,
      port: port || (driver === 'postgres' ? 5432 : 3306),
      username,
      password,
      database,
    });
  }

  async connect() {
    if (this.connected) return this.databaseMetadata || true;

    if (this.mode === 'api') {
      await this.initializeApiMetadata();
      this.connected = true;
      return this.databaseMetadata;
    }

    await this.initializeDirectConnection();
    this.connected = true;
    return true;
  }

  async initializeApiMetadata() {
    const apiUrl = this.config.apiUrl || DEFAULT_API_URL;
    const token = this.config.apiToken;
    const publicUrl = `${apiUrl}/public/databases/${encodeURIComponent(token)}`;

    const response = await fetch(publicUrl);
    if (response.ok) {
      this.databaseMetadata = await response.json();
      this.instanceId = this.databaseMetadata.id;
      this.apiMode = 'public';
      return;
    }

    const fallbackResponse = await fetch(`${apiUrl}/databases`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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

    const exactMatch = databases.find((db) => db.apiToken === token);
    this.databaseMetadata = exactMatch || databases[0];
    this.instanceId = this.databaseMetadata.id;
    this.apiMode = 'authorized';
  }

  async initializeDirectConnection() {
    const { driver, host, port, username, password, database } = this.config;

    if (driver === 'mysql') {
      const mysql = await loadMysql();
      this.connection = await mysql.createConnection({
        host,
        port,
        user: username,
        password,
        database,
      });
    } else if (driver === 'postgres') {
      const PgClient = await loadPgClient();
      this.connection = new PgClient({ host, port, user: username, password, database });
      await this.connection.connect();
    } else {
      throw new Error(`Unsupported driver: ${driver}`);
    }
  }

  async disconnect() {
    if (!this.connected) return;
    if (this.mode === 'api') {
      this.connected = false;
      return;
    }

    if (this.connection) {
      await this.connection.end();
      this.connection = null;
    }
    this.connected = false;
  }

  async query(sql, options = {}) {
    await this.connect();
    if (this.mode === 'api') {
      return this.executeApiQuery(sql, options);
    }
    return this.executeDirectQuery(sql);
  }

  async executeApiQuery(sql, options = {}) {
    const apiUrl = this.config.apiUrl || DEFAULT_API_URL;
    const token = this.config.apiToken;
    const payload = { query: sql };
    if (options.limit !== undefined) payload.limit = options.limit;
    if (options.timeout !== undefined) payload.timeout = options.timeout;

    let endpoint = '';
    const headers = { 'Content-Type': 'application/json' };

    if (this.apiMode === 'public') {
      endpoint = `${apiUrl}/public/databases/${encodeURIComponent(token)}/query`;
    } else {
      endpoint = `${apiUrl}/databases/${this.instanceId}/query`;
      headers.Authorization = `Bearer ${token}`;
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

    try {
      return JSON.parse(body);
    } catch (error) {
      return { success: false, error: 'Invalid JSON returned from API', raw: body };
    }
  }

  async executeDirectQuery(sql) {
    if (this.driver === 'mysql') {
      const [rows] = await this.connection.execute(sql);
      if (Array.isArray(rows)) {
        return {
          success: true,
          rows,
          rowCount: rows.length,
          columns: rows.length ? Object.keys(rows[0]) : [],
        };
      }
      return {
        success: true,
        rows: [],
        rowCount: rows.affectedRows || 0,
        message: `${rows.affectedRows || 0} row(s) affected`,
      };
    }

    if (this.driver === 'postgres') {
      const result = await this.connection.query(sql);
      return {
        success: true,
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        columns: result.fields ? result.fields.map((field) => field.name) : [],
      };
    }

    throw new Error('Direct query called with unknown driver');
  }

  async select(table, { columns = ['*'], where, limit, orderBy } = {}) {
    const cols = Array.isArray(columns) ? columns.join(', ') : columns;
    let sql = `SELECT ${cols} FROM ${table}`;
    sql += buildWhereClause(where);
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }
    if (limit !== undefined) {
      sql += ` LIMIT ${limit}`;
    }
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
