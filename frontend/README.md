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

## Local Development (Backend + DB)

Follow these steps to run the full stack locally:

- Start a local MySQL for development (Docker):

```bash
docker run --name dbforge-mysql -e MYSQL_ROOT_PASSWORD='DBForge1312?' -e MYSQL_DATABASE=dbforge -p 3306:3306 -d mysql:8
```

- Start the backend (from the repo root or `backend` folder):

```bash
cd backend
mvn spring-boot:run
```

The backend listens on port `8080` by default (see `backend/src/main/resources/application.properties`). The frontend dev server proxies `/api` calls to `http://localhost:8080` by default.

- Start the frontend dev server (from `frontend`):

```bash
cd frontend
npm install    # if you haven't already
npm run dev
```

If your backend runs on a different host or IP, set the proxy target before starting Vite:

```bash
export VITE_BACKEND_URL='http://192.168.0.107:8080'
npm run dev
```

Verify `http://localhost:3000` and check the terminal where Vite runs for proxy errors. If you still see `ECONNREFUSED`, ensure the backend is running and reachable at the configured address and port.

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Axios
- Lucide React (icons)
