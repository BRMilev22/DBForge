# DBForge MongoDB Showcase (Express + Vue)

This example demonstrates how the **DbForge Framework** can power a MongoDB experience end-to-end:

- **API (`api/`)** – Express + TypeScript server that stores "innovation insights" in a DBForge-managed MongoDB cluster.
- **Web (`web/`)** – Vue SPA that lists, filters, creates, and upvotes insights through the API.

## Backend setup

```bash
cd api
cp .env.example .env.local      # fill in your Mongo connection info
npm install
npm run db:bootstrap            # seeds the dbforge_insights collection
npm run dev                     # starts http://localhost:4100
```

Environment variables support either a full Mongo connection URI (`DBFORGE_MONGO_URI`) or discrete host/user/password/database values.

## Frontend setup

```bash
cd web
cp .env.example .env            # optional, defaults to http://localhost:4100
npm install
npm run dev -- --host           # Vite dev server on http://localhost:5173
```

The UI provides a small "innovation radar" surface where you can add insights and upvote ideas. Each interaction hits the Express API, which uses `DbForgeClient` to talk directly to MongoDB—no ODM required.

Swap the database credentials to point at another DBForge-managed Mongo cluster (or the API token proxy) and the same code works without changes.
