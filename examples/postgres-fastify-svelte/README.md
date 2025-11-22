# DBForge PostgreSQL Showcase (Fastify + Svelte)

This example pairs a minimal Fastify API with a Vite/Svelte frontend. Both layers use the **DBForge Framework** so you can talk to a DBForge-managed PostgreSQL instance with only a few helpers.

- **Backend:** Fastify (TypeScript) exposing `/tasks` endpoints powered by `DbForgeClient`.
- **Frontend:** Svelte single page app that calls the API to render and mutate the task list.

## Project structure

```
postgres-fastify-svelte/
├── server/    # Fastify API + DBForge integration
└── web/       # Svelte UI that consumes the API
```

## Backend setup

```bash
cd server
cp .env.example .env              # fill with your DBForge Postgres credentials
npm install
npm run db:bootstrap              # creates dbforge_tasks table + seeds starter rows
npm run dev                       # starts Fastify on http://localhost:4000
```

Environment variables:

| Name | Description |
| --- | --- |
| `PORT` | API port (defaults to `4000`). |
| `DBFORGE_PG_HOST/PORT/USERNAME/PASSWORD/DATABASE` | Direct credentials from your DBForge PostgreSQL instance. |
| `DBFORGE_API_TOKEN` | Optional, use when hitting the DBForge API proxy instead of direct drivers. |

The bootstrap script creates a `dbforge_tasks` table and inserts a few sample rows so the demo feels alive.

## Frontend setup

```bash
cd web
cp .env.example .env              # optional, overrides API URL
npm install
npm run dev -- --host             # serves http://localhost:5173
```

By default the UI points to `http://localhost:4000`. Update `VITE_API_URL` inside `.env` if your API is running elsewhere.

## Demo flow

1. Visit `http://localhost:5173` while the API is running.
2. Create a task, toggle it complete, and clear completed items — each call hits the Fastify server which runs SQL via the DBForge client.
3. Inspect the `dbforge_tasks` table inside the DBForge portal to validate the changes.

Because everything goes through the DBForge Framework, porting this example to another DBForge-managed database only requires tweaking the credential constructor and SQL dialect — the transport layer stays the same.
