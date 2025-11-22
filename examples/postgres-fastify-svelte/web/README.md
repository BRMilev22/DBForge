# Web client

This Vite/Svelte app talks to the Fastify API in `../server`. It renders the DBForge-backed task list and issues fetch requests for each CRUD action.

## Running the UI

```bash
cd web
cp .env.example .env         # optional, override API URL
npm install
npm run dev -- --host        # http://localhost:5173
```

`VITE_API_URL` defaults to `http://localhost:4000`, so you only need the `.env` file when pointing to a different API origin.

## Available scripts

- `npm run dev` – Vite dev server.
- `npm run build` – Production build.
- `npm run preview` – Preview the production bundle.

The UI expects the backend’s `/tasks` endpoints described in the root README. Update the fetch helpers in `src/lib/api.ts` if you need to change routes or payloads.
