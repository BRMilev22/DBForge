# DBForge Framework

Custom lightweight framework that lets you interact with DBForge-managed databases using:

1. **API tokens** (no DB credentials required) – uses the DBForge REST API (including the public token endpoints) to run SQL queries securely.
2. **Connection strings** – connect directly to MySQL/MariaDB or PostgreSQL using native drivers (`mysql2`, `pg`).
3. **Credentials** – specify host/port/username/password/database manually if you prefer explicit config.

On top of the connection helpers, the framework exposes simple CRUD helpers and ships with a small visualization playground so users can test API-token-based queries in the browser.

## Structure

```
framework/
├─ package.json
├─ README.md
├─ src/
│  ├─ client.js           # Node/CLI version (supports API token + direct SQL connections)
│  └─ browser-client.js   # Browser-friendly API-token client used by the playground
└─ ui/
   ├─ index.html          # interactive playground (API-token mode)
   ├─ app.js
   └─ styles.css
```

## Installation

```
cd framework
npm install
```

## Node Usage

```js
import { DbForgeClient } from './src/client.js';

// API token
const apiClient = DbForgeClient.fromApiToken({
  apiUrl: 'http://192.168.0.107:8080/api',
  apiToken: 'dfg_live_…',
});
await apiClient.connect();
const result = await apiClient.select('users', { limit: 5 });

// Connection string
const connClient = DbForgeClient.fromConnectionString(
  'mysql://user:pass@localhost:3306/example',
);
await connClient.connect();
await connClient.insert('users', { name: 'Jane', email: 'jane@example.com' });

// Credentials
const credClient = DbForgeClient.fromCredentials({
  dbType: 'postgresql',
  host: 'localhost',
  username: 'postgres',
  password: 'secret',
  database: 'sample',
});
await credClient.connect();
await credClient.delete('users', { email: 'jane@example.com' });
```

**CRUD Helpers**

- `select(table, { columns, where, limit, orderBy })`
- `insert(table, dataObject)`
- `update(table, dataObject, where)`
- `delete(table, where)` – requires a `where` to prevent accidental truncation.

## Browser Playground

Open `framework/ui/index.html` via any static server (or use Live Server in VSCode). It imports `src/browser-client.js`, so the UI currently supports API-token mode—ideal for quickly testing CRUD workflows with DBForge-managed instances. For direct connection strings or username/password flows, use the Node version (`src/client.js`).

## Notes

- Direct connections currently support MySQL/MariaDB and PostgreSQL via `mysql2` and `pg`.
- API-token mode uses the public endpoints whenever possible and transparently falls back to the authenticated `/databases/{id}/query` path when necessary.
- CRUD helpers string-build SQL. For untrusted user input, consider parameterized statements via `client.query()`.
