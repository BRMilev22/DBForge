# DBForge Frontend

Modern dark-themed frontend for DBForge database management platform.

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## API Configuration

By default, the frontend proxies API requests to `http://localhost:8080`. To change this, update the `vite.config.ts` file.

For production deployment, set the `VITE_API_URL` environment variable or update the API base URL in `src/services/api.ts`.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide React (icons)
