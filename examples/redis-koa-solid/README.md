# DBForge Redis Showcase (Koa + SolidJS)

This example highlights how the DBForge Framework makes Redis approachable from Node and the browser:

- **API (`api/`)** – Koa server that logs team check-ins into a Redis Stream (`dbforge:checkins`) and tracks active teammates in a hash (`dbforge:users`).
- **Web (`web/`)** – SolidJS SPA that submits updates and renders the live feed via the API.

## Backend setup

```bash
cd api
cp .env.example .env.local      # update with your Redis instance
npm install
npm run db:bootstrap            # seeds sample check-ins
npm run dev                     # http://localhost:4200
```

You can provide either a connection URI (`DBFORGE_REDIS_URI`) or explicit host/port/username/password fields pulled from the DBForge dashboard.

## Frontend setup

```bash
cd web
cp .env.example .env            # optional override (defaults to http://localhost:4200)
npm install
npm run dev -- --host           # http://localhost:5173
```

The UI displays the Redis stream in reverse chronological order and shows the “active teammates” hash on the right. Each submission writes to Redis via the DbForge client, so swapping to another DBForge Redis instance is as simple as updating the `.env.local` file.
