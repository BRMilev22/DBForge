## Redis pulse UI

This SolidJS app consumes the Koa API in `../api` to manage Redis-backed team check-ins.

### Getting started

```bash
cd web
cp .env.example .env        # optional, defaults to http://localhost:4200
npm install
npm run dev -- --host       # start Vite on http://localhost:5173
```

### Scripts

- `npm run dev` – Vite dev server with HMR.
- `npm run build` – Production build.
- `npm run preview` – Preview the production bundle.

Ensure the API is running so the UI can fetch `/checkins`. Update `VITE_API_URL` if you expose the backend elsewhere.
