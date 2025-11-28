import { encryptAES256 } from "./crypto.js";
import { validateSqlSafe } from "./sqlSafe.js";

const DEFAULT_API_URL = "http://localhost:8080/api";

export default class DbForgeClient {
  constructor({ apiUrl = DEFAULT_API_URL, apiToken }) {
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
    this.connected = false;
    this.databaseMetadata = null;
    this.instanceId = null;
    this.apiMode = "public";
    this.mode = "api";
  }

  static fromApiToken({ apiUrl = DEFAULT_API_URL, apiToken }) {
    return new DbForgeClient({ apiUrl, apiToken });
  }

  async connect() {
    if (this.connected) return this.databaseMetadata;

    const metadataUrl = `${this.apiUrl}/public/databases/${encodeURIComponent(
      this.apiToken
    )}`;

    const res = await fetch(metadataUrl);
    if (res.ok) {
      this.databaseMetadata = await res.json();
      this.instanceId = this.databaseMetadata.id;
      this.apiMode = "public";
      this.connected = true;
      return this.databaseMetadata;
    }

    const authRes = await fetch(`${this.apiUrl}/databases`, {
      headers: {
        Authorization: `Bearer ${this.apiToken}`,
        "Content-Type": "application/json"
      }
    });

    if (!authRes.ok) {
      const body = await authRes.text();
      throw new Error(
        `Failed to resolve database via API token (${authRes.status}): ${body}`
      );
    }

    const list = await authRes.json();
    const db = list.find((x) => x.apiToken === this.apiToken);
    if (!db) throw new Error("API token is valid but no matched database found.");

    this.databaseMetadata = db;
    this.instanceId = db.id;
    this.apiMode = "authorized";
    this.connected = true;
    return this.databaseMetadata;
  }

  async query(sql, options = {}) {
    await this.connect();

    validateSqlSafe(sql);

    const payload = { query: sql, ...options };

    let endpoint = "";
    let headers = { "Content-Type": "application/json" };

    if (this.apiMode === "public") {
      endpoint = `${this.apiUrl}/public/databases/${encodeURIComponent(
        this.apiToken
      )}/query`;
    } else {
      endpoint = `${this.apiUrl}/databases/${this.instanceId}/query`;
      headers.Authorization = `Bearer ${this.apiToken}`;
    }
    let body;

    if (this.mode === "api") {
      body = JSON.stringify(payload);
    } else {
      body = JSON.stringify(encryptAES256(payload, this.apiToken));
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body
    });

    const text = await res.text();

    if (!res.ok) {
      throw new Error(`API query failed (${res.status}): ${text}`);
    }

    return JSON.parse(text);
  }

  async select(table, opts = {}) {
    const cols = Array.isArray(opts.columns)
      ? opts.columns.join(", ")
      : "*";

    let sql = `SELECT ${cols} FROM ${table}`;
    if (opts.where)
      sql += this._buildWhere(opts.where);
    if (opts.orderBy)
      sql += ` ORDER BY ${opts.orderBy}`;
    if (opts.limit)
      sql += ` LIMIT ${opts.limit}`;
    sql += ";";

    return this.query(sql);
  }

  async insert(table, data) {
    const entries = Object.entries(data);
    const columns = entries.map(([c]) => c).join(", ");
    const values = entries.map(([_, v]) => this._escape(v)).join(", ");
    return this.query(`INSERT INTO ${table} (${columns}) VALUES (${values});`);
  }

  async update(table, data, where) {
    const entries = Object.entries(data);
    const set = entries
      .map(([c, v]) => `${c} = ${this._escape(v)}`)
      .join(", ");
    return this.query(
      `UPDATE ${table} SET ${set} ${this._buildWhere(where)};`
    );
  }

  async delete(table, where) {
    return this.query(
      `DELETE FROM ${table} ${this._buildWhere(where)};`
    );
  }

  async disconnect() {
    this.connected = false;
    return true;
  }

  _escape(v) {
    if (v === null || v === undefined) return "NULL";
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
    return `'${String(v).replace(/'/g, "''")}'`;
  }

  _buildWhere(where) {
    if (!where || Object.keys(where).length === 0) return "";
    const clauses = Object.entries(where).map(
      ([col, val]) => `${col} = ${this._escape(val)}`
    );
    return " WHERE " + clauses.join(" AND ");
  }
}
