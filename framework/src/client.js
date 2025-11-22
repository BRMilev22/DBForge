const DEFAULT_API_URL = 'http://localhost:8080/api';
const SUPPORTED_SQL_DBS = ['mysql', 'mariadb', 'postgresql', 'postgres'];
const SUPPORTED_NOSQL_DBS = ['mongodb', 'mongo'];
const SUPPORTED_KV_DBS = ['redis'];
const ALL_SUPPORTED_DBS = [...SUPPORTED_SQL_DBS, ...SUPPORTED_NOSQL_DBS, ...SUPPORTED_KV_DBS];

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
let mongoModule = null;
let redisModule = null;

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

const loadMongoClient = async () => {
  if (!mongoModule) {
    mongoModule = await import('mongodb');
  }
  return mongoModule.MongoClient;
};

const loadRedisClient = async () => {
  if (!redisModule) {
    redisModule = await import('redis');
  }
  return redisModule.createClient;
};

export class DbForgeClient {
  constructor(config) {
    this.config = config;
    this.mode = config.mode; // api | direct
    this.driver = config.driver || null; // mysql | postgres | mongodb | redis
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

    if (!ALL_SUPPORTED_DBS.includes(protocol)) {
      throw new Error(`Unsupported database type: ${protocol}`);
    }

    let driver = 'mysql';
    let port = 3306;

    if (protocol.startsWith('post')) {
      driver = 'postgres';
      port = 5432;
    } else if (protocol.startsWith('mongo')) {
      driver = 'mongodb';
      port = 27017;
    } else if (protocol === 'redis') {
      driver = 'redis';
      port = 6379;
    }

    if (parsed.port) {
      port = Number(parsed.port);
    }

    return new DbForgeClient({
      mode: 'direct',
      driver,
      host: parsed.hostname,
      port,
      username: decodeURIComponent(parsed.username || ''),
      password: decodeURIComponent(parsed.password || ''),
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
    // Redis might not have user/pass/db in some simple setups, but we'll enforce at least host/port
    if (dbType !== 'redis' && (!username || !password || !database)) {
      // Mongo might not strictly need all if local/no-auth, but for this framework we expect credentials usually
    }
    
    const normalized = dbType.toLowerCase();
    if (!ALL_SUPPORTED_DBS.includes(normalized)) {
      throw new Error(`Unsupported database type: ${dbType}`);
    }

    let driver = 'mysql';
    let defaultPort = 3306;

    if (normalized.startsWith('post')) {
      driver = 'postgres';
      defaultPort = 5432;
    } else if (normalized.startsWith('mongo')) {
      driver = 'mongodb';
      defaultPort = 27017;
    } else if (normalized === 'redis') {
      driver = 'redis';
      defaultPort = 6379;
    }

    return new DbForgeClient({
      mode: 'direct',
      driver,
      host,
      port: port || defaultPort,
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
    } else if (driver === 'mongodb') {
      const MongoClient = await loadMongoClient();
      let auth = '';
      if (username && password) {
        auth = `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`;
      }
      const uri = `mongodb://${auth}${host}:${port}/${database}?authSource=admin`;
      this.connection = new MongoClient(uri);
      await this.connection.connect();
    } else if (driver === 'redis') {
      const createClient = await loadRedisClient();
      let url = `redis://${host}:${port}`;
      if (password) {
        // Redis 6+ supports user:pass, older just pass
        if (username) {
            url = `redis://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}:${port}`;
        } else {
            url = `redis://:${encodeURIComponent(password)}@${host}:${port}`;
        }
      }
      this.connection = createClient({ url });
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
      if (this.driver === 'mysql') {
        await this.connection.end();
      } else if (this.driver === 'postgres') {
        await this.connection.end();
      } else if (this.driver === 'mongodb') {
        await this.connection.close();
      } else if (this.driver === 'redis') {
        await this.connection.disconnect();
      }
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

  async executeDirectQuery(query) {
    if (this.driver === 'mysql') {
      const [rows] = await this.connection.execute(query);
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
      const result = await this.connection.query(query);
      return {
        success: true,
        rows: result.rows || [],
        rowCount: result.rowCount || 0,
        columns: result.fields ? result.fields.map((field) => field.name) : [],
      };
    }

    if (this.driver === 'mongodb') {
      // Expect query to be an object: { collection: 'name', action: 'find', ...args }
      if (typeof query !== 'object') {
         throw new Error('Direct MongoDB query requires an object: { collection, action, filter, data, options }');
      }
      const db = this.connection.db(this.config.database);
      const col = db.collection(query.collection);
      
      let result;
      if (query.action === 'find') {
        result = await col.find(query.filter || {}, query.options).toArray();
        return { success: true, rows: result, rowCount: result.length };
      } else if (query.action === 'insertOne') {
        result = await col.insertOne(query.data);
        return { success: true, insertedId: result.insertedId, rowCount: 1 };
      } else if (query.action === 'updateOne') {
        result = await col.updateOne(query.filter, { $set: query.data });
        return { success: true, modifiedCount: result.modifiedCount, rowCount: result.modifiedCount };
      } else if (query.action === 'deleteOne') {
        result = await col.deleteOne(query.filter);
        return { success: true, deletedCount: result.deletedCount, rowCount: result.deletedCount };
      } else if (query.action === 'count') {
        result = await col.countDocuments(query.filter || {});
        return { success: true, count: result };
      } else {
         throw new Error(`Unsupported MongoDB action: ${query.action}`);
      }
    }

    if (this.driver === 'redis') {
      // Expect query to be a command string "SET key val" or array ["SET", "key", "val"]
      let command, args;
      if (Array.isArray(query)) {
        [command, ...args] = query;
      } else if (typeof query === 'string') {
        [command, ...args] = query.split(' ');
      } else {
        throw new Error('Redis query must be a string or array');
      }
      
      // Redis client v4+ uses .sendCommand or specific methods
      try {
         const result = await this.connection.sendCommand([command, ...args]);
         return { success: true, result };
      } catch(e) {
         return { success: false, error: e.message };
      }
    }

    throw new Error('Direct query called with unknown driver');
  }

  async select(table, { columns = ['*'], where, limit, orderBy } = {}) {
    if (this.driver === 'mongodb') {
       return this.query({ 
         collection: table, 
         action: 'find', 
         filter: where, 
         options: { limit: limit || 0, sort: orderBy } // simplified sort
       });
    }
    if (this.driver === 'redis') {
       // Basic key fetch wrapper
       return this.query(['GET', table]); // Treat 'table' as key for simple select
    }

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
    if (this.driver === 'mongodb') {
        return this.query({ collection: table, action: 'insertOne', data });
    }
    if (this.driver === 'redis') {
        // data = { key: value } or just value if table is key?
        // Let's assume table is key, data is value for simple SET
        // Or table is hash key, data is fields
        if (typeof data === 'object') {
           // HSET
           const args = ['HSET', table];
           Object.entries(data).forEach(([k,v]) => args.push(k, String(v)));
           return this.query(args);
        }
        return this.query(['SET', table, String(data)]);
    }

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
    if (this.driver === 'mongodb') {
        return this.query({ collection: table, action: 'updateOne', filter: where, data });
    }
    
    // Redis doesn't really have update vs insert in same way
    if (this.driver === 'redis') {
        return this.insert(table, data);
    }

    const entries = Object.entries(data || {}).filter(([, value]) => value !== undefined);
    if (!entries.length) {
      throw new Error('Update requires at least one column assignment');
    }
    const setClause = entries.map(([column, value]) => `${column} = ${escapeLiteral(value)}`).join(', ');
    const sql = `UPDATE ${table} SET ${setClause}${buildWhereClause(where)};`;
    return this.query(sql);
  }

  async delete(table, where) {
    if (this.driver === 'mongodb') {
        return this.query({ collection: table, action: 'deleteOne', filter: where });
    }
    if (this.driver === 'redis') {
        return this.query(['DEL', table]);
    }

    const whereClause = buildWhereClause(where);
    if (!whereClause) {
      throw new Error('Delete requires a WHERE clause to avoid accidental truncation');
    }
    const sql = `DELETE FROM ${table}${whereClause};`;
    return this.query(sql);
  }
}

export default DbForgeClient;
