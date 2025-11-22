# MongoDB Insights UI

This Vite-powered Vue app consumes the Express API in `../api` to render the DBForge-backed insights board.

## Getting started

```bash
cd web
cp .env.example .env        # optional. defaults to http://localhost:4100
npm install
npm run dev -- --host       # opens http://localhost:5173
```

Update `VITE_API_URL` if your API runs on a different domain/port.

## Scripts

- `npm run dev` – start Vite with HMR.
- `npm run build` – production build.
- `npm run preview` – preview the production build locally.
- `npm run test` – (none) add your own when needed.

Ensure the API is running before starting the UI or all requests will fail.
