# DBForge Development Guide

## Production Deployment

The production site is now deployed at **https://dbforge.dev** and points to `/home/dbforge/new/DBForge`.

### Production Setup

- **Frontend**: Built files served from `/var/www/dbforge.dev/`
- **Backend**: Proxied through nginx from `http://localhost:8080/api/`
- **SSL**: Let's Encrypt certificates at `/etc/letsencrypt/live/dbforge.dev/`

### Deploying Updates

When you make changes, deploy them with:

```bash
# Build frontend
cd /home/dbforge/new/DBForge/frontend
npm run build

# Deploy to nginx
sudo rm -rf /var/www/dbforge.dev/*
sudo cp -r dist/* /var/www/dbforge.dev/

# Reload nginx (only if config changed)
sudo nginx -t
sudo systemctl reload nginx
```

## Development Mode

You can develop locally and the changes will work on both localhost and the domain.

### Start Development Servers

**Terminal 1 - Backend:**
```bash
cd /home/dbforge/new/DBForge/backend
mvn spring-boot:run
```

**Terminal 2 - Frontend:**
```bash
cd /home/dbforge/new/DBForge/frontend
npm run dev
```

### Access Points During Development

- **Dev Server (with HMR)**: http://localhost:3000 or http://79.100.101.80:3000
- **Production Site**: https://dbforge.dev (uses latest build)

### Configuration

- **Frontend Vite Config** (`frontend/vite.config.ts`):
  - Proxies `/api` requests to `http://localhost:8080`
  - Listens on `0.0.0.0:3000` for external access
  
- **Backend Config** (`backend/src/main/resources/application.properties`):
  - Runs on port `8080`
  - Database host: `dbforge.dev` (for user-facing connection details)
  - Internal connections use `localhost`

### Making the Dev Server Accessible on Domain

If you want to access the dev server through the domain (e.g., https://dbforge.dev:3000), you would need to:

1. Open port 3000 in your router (forward 3000 → 3000)
2. Access via: http://dbforge.dev:3000

**Note**: This isn't necessary for normal development since you can use `localhost:3000` locally or `<your-ip>:3000` from other devices.

## Database Connections

Users can connect to databases using:
- **Host**: `dbforge.dev`
- **Ports**: 
  - PostgreSQL: 10000-10009
  - MySQL: 10010-10019
  - MariaDB: 10020-10029
  - MongoDB: 10030-10039
  - Redis: 10040-10049

## Tips

- Always test in dev mode before deploying to production
- Use `npm run dev` for hot module replacement during development
- Production builds are optimized and minified
- Backend always runs on localhost:8080, nginx handles the proxying
