<div align="center">
  <img src="frontend/public/dbforge-logo.png" alt="DBForge Logo" width="120"/>
  <h1>DBForge</h1>
  <p>Database as a Service platform for deploying and managing containerized database instances with a modern web interface and client framework support.</p>
</div>

## Overview

DBForge is a complete DBaaS solution that enables developers to provision, manage, and connect to PostgreSQL, MySQL, MariaDB, MongoDB, and Redis databases through Docker containers. The platform includes a Spring Boot backend API, React frontend dashboard, and client frameworks for both JavaScript and Python.

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="demo-pics/landing-page-top.png" alt="Landing Page Top" width="100%"/>
        <br/>
        <sub><b>Landing Page - Hero Section</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="demo-pics/landing-page-down.png" alt="Landing Page Bottom" width="100%"/>
        <br/>
        <sub><b>Landing Page - Features</b></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <img src="demo-pics/logged-in-overview-tab.png" alt="Dashboard Overview" width="100%"/>
        <br/>
        <sub><b>Dashboard Overview</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="demo-pics/create-new-database.png" alt="Create Database" width="100%"/>
        <br/>
        <sub><b>Create Database</b></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <img src="demo-pics/query-interface.png" alt="Query Interface" width="100%"/>
        <br/>
        <sub><b>Query Interface</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="demo-pics/sdk-doc-page.png" alt="SDK Documentation" width="100%"/>
        <br/>
        <sub><b>SDK Documentation</b></sub>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <img src="demo-pics/DBForge_brochure.png" alt="Project Brochure Front" width="100%"/>
        <br/>
        <sub><b>Project Brochure - Front</b></sub>
      </td>
      <td align="center" width="50%">
        <img src="demo-pics/DBForge_brochure_2.png" alt="Project Brochure Back" width="100%"/>
        <br/>
        <sub><b>Project Brochure - Back</b></sub>
      </td>
    </tr>
  </table>
</div>

<br/>

## Table of Contents
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Quick Start](#quick-start)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Configuration](#configuration)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Using Client Frameworks](#using-client-frameworks)
  - [JavaScript/Node.js](#javascriptnodejs)
  - [Python](#python)
- [Supported Databases](#supported-databases)
- [Technology Stack Summary](#technology-stack-summary)
- [License](#license)
- [Repository](#repository)

## Architecture

```
DBForge/
├── backend/              Spring Boot REST API (Java 17)
├── frontend/             React + TypeScript web dashboard
├── framework/            JavaScript client library (Node.js + Browser)
├── framework-py/         Python client library (PyPI package)
├── examples/             Full-stack JavaScript example applications
├── examples-py/          Full-stack Python example applications
├── database/             MySQL schema and migrations
├── tests/                Integration tests
├── docs/                 Documentation and presentation materials
└── nginx*.conf           Nginx configuration templates
```

## Core Components

### Backend API
- **Stack**: Spring Boot 3.5.7, Java 17, MySQL 8.0
- **Authentication**: JWT-based with Spring Security
- **Container Management**: Docker Java SDK for lifecycle operations
- **Database Drivers**: Native support for PostgreSQL, MySQL, MongoDB, Redis
- **Resource Control**: Configurable CPU, memory, and storage limits per instance

### Frontend Dashboard
- **Stack**: React 18, TypeScript, Vite 5
- **UI/UX**: Tailwind CSS, Framer Motion, Lucide icons
- **Features**: Real-time metrics, analytics visualization (Chart.js), AG Grid data tables, Monaco code editor
- **Capabilities**: Database provisioning, connection management, activity logging, credential copying

### Client Frameworks

**JavaScript Framework** (`framework/`)
- Node.js and browser support
- Three connection modes: API tokens, connection strings, direct credentials
- Built-in CRUD helpers for SQL databases
- Interactive browser playground for testing

**Python Framework** (`framework-py/`)
- Published to PyPI as `dbforge-framework`
- Unified API across all database types
- Full type hints support
- Context manager for connection lifecycle
- Optional extras for specific database drivers

### Example Applications

**JavaScript Examples** (`examples/`)
- MongoDB + Express + Vue
- PostgreSQL + Fastify + Svelte
- Redis + Koa + SolidJS

**Python Examples** (`examples-py/`)
- MongoDB + FastAPI catalog
- MySQL + FastAPI notes
- PostgreSQL + FastAPI tasks
- Redis + FastAPI queue

## Quick Start

### Prerequisites
- Java 17 or higher
- Node.js 18 or higher
- Docker Engine (latest stable)
- MySQL 8.0 or higher
- Maven 3.6+

### Local Development

**1. Database Setup**
```bash
mysql -u root -p
CREATE DATABASE dbforge;
SOURCE database/schema.sql;
```

**2. Backend Setup**
```bash
cd backend

# Configure application.properties
# Set spring.datasource.url, username, password
# Set app.database.host to localhost for local development

./mvnw clean install
./mvnw spring-boot:run
```

Backend starts on `http://localhost:8080`

**3. Frontend Setup**
```bash
cd frontend
npm install

# Create .env file
echo "VITE_API_URL=http://localhost:8080/api" > .env

npm run dev
```

Frontend starts on `http://localhost:5173`

<details>
<summary><h3>Configuration</h3></summary>

**Backend** (`backend/src/main/resources/application.properties`):
```properties
# MySQL connection for DBForge metadata
spring.datasource.url=jdbc:mysql://localhost:3306/dbforge
spring.datasource.username=root
spring.datasource.password=<your-password>

# Host where provisioned database containers are accessible
# Use public IP or domain for production, localhost for development
app.database.host=localhost

# Docker configuration
docker.host=unix:///var/run/docker.sock
docker.network=dbforge-network

# Port ranges for database instances (consolidated to 10000-10050)
port.postgres.start=10000
port.postgres.end=10009
port.mysql.start=10010
port.mysql.end=10019
port.mariadb.start=10020
port.mariadb.end=10029
port.mongodb.start=10030
port.mongodb.end=10039
port.redis.start=10040
port.redis.end=10049
```

**Frontend** (`.env`):
```env
VITE_API_URL=http://localhost:8080/api
```

</details>

<details>
<summary><h2>Deployment</h2></summary>

### Production VPS Deployment

**1. Transfer Project**
```bash
scp -r DBForge root@<vps-ip>:/opt/
```

**2. Backend Deployment**
```bash
cd /opt/DBForge/backend
./mvnw clean package
java -jar target/dbforge-0.0.1-SNAPSHOT.jar
```

For production, use a process manager like systemd or run with `nohup` and `&`.

**3. Frontend Deployment**
```bash
cd /opt/DBForge/frontend
npm install
npm run build

# Serve dist/ with Nginx
# Use provided nginx-production-optimized.conf as template
```

**4. Firewall Configuration**
```bash
# Allow database port ranges
ufw allow 10000:10049/tcp
# Allow HTTP/HTTPS for web interface
ufw allow 80/tcp
ufw allow 443/tcp
```

**5. Docker Network**
```bash
docker network create dbforge-network
```

</details>

<details>
<summary><h2>API Reference</h2></summary>

### Authentication
- `POST /api/auth/register` - Create new user account
- `POST /api/auth/login` - Authenticate and receive JWT token

### Database Management
- `GET /api/databases/types` - List supported database types
- `POST /api/databases` - Provision new database instance
- `GET /api/databases` - List user's database instances
- `GET /api/databases/{id}` - Get instance details and connection info
- `POST /api/databases/{id}/start` - Start stopped instance
- `POST /api/databases/{id}/stop` - Stop running instance
- `DELETE /api/databases/{id}` - Delete instance and cleanup resources

### Analytics
- `GET /api/analytics` - Retrieve usage metrics, activity logs, and statistics

### Public Query Endpoints (via API tokens)
- `POST /api/public/databases/{id}/query` - Execute SQL queries with API token
- `GET /api/public/databases/{id}/connection` - Get connection info with API token

</details>

<details>
<summary><h2>Using Client Frameworks</h2></summary>

### JavaScript/Node.js

**Installation**:
```bash
cd framework
npm install
```

**Usage**:
```javascript
import { DbForgeClient } from './src/client.js';

// API token mode
const client = DbForgeClient.fromApiToken({
  apiUrl: 'http://localhost:8080/api',
  apiToken: 'dfg_live_...',
});

// Connection string mode
const client = DbForgeClient.fromConnectionString(
  'mysql://user:pass@localhost:3306/mydb'
);

// Direct credentials mode
const client = DbForgeClient.fromCredentials({
  dbType: 'postgresql',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: 'secret',
  database: 'mydb'
});

await client.connect();
const users = await client.select('users', { limit: 10 });
await client.disconnect();
```

### Python

**Installation**:
```bash
# Base package
pip install dbforge-framework

# With specific database support
pip install dbforge-framework[postgresql]
pip install dbforge-framework[mysql]
pip install dbforge-framework[mongodb]
pip install dbforge-framework[redis]

# All databases
pip install dbforge-framework[all]
```

**Usage**:
```python
from dbforge_framework import DbForgeClient

# Connection string
client = DbForgeClient.from_connection_string(
    "postgresql://user:pass@localhost:5432/mydb"
)

# Direct credentials
client = DbForgeClient.from_credentials(
    db_type="postgresql",
    host="localhost",
    port=5432,
    username="user",
    password="pass",
    database="mydb"
)

# Context manager handles connection lifecycle
with client:
    users = client.select("users", limit=10)
    client.insert("users", {"name": "Alice", "email": "alice@example.com"})
```

</details>

## Supported Databases

| Database   | Port Range    | Versions Supported |
|------------|---------------|-------------------|
| PostgreSQL | 10000-10009   | 12, 13, 14, 15, 16|
| MySQL      | 10010-10019   | 8.0+              |
| MariaDB    | 10020-10029   | 10.6+             |
| MongoDB    | 10030-10039   | 5.0, 6.0, 7.0     |
| Redis      | 10040-10049   | 6.2, 7.0, 7.2     |

Each database type has 10 ports allocated (expandable as needed).

<details>
<summary><h2>Technology Stack Summary</h2></summary>

**Backend**
- Spring Boot 3.5.7
- Spring Security + JWT (jjwt 0.11.5)
- Spring Data JPA
- Docker Java 3.3.6
- MySQL Connector, PostgreSQL Driver, MongoDB Driver, Jedis (Redis)
- Lombok

**Frontend**
- React 18.2 + TypeScript 5.2
- Vite 5.0
- Tailwind CSS 3.3
- Framer Motion 12.0
- Chart.js 4.5 + react-chartjs-2
- AG Grid 34.3
- Monaco Editor 4.7
- Axios 1.6

**Client Frameworks**
- JavaScript: mysql2, pg, mongodb, redis
- Python: pymysql, psycopg2, pymongo, redis

</details>

## License

MIT License. See LICENSE file for details.

---

<div align="center">
  <p>Forged with ❤️ for builders</p>
  <p>
    <strong>Developed by</strong><br/>
    <a href="https://github.com/brmilev22">brmilev22 (Boris Milev)</a> • <a href="https://github.com/vbboyanov22">vbboyanov22 (Veselin Boyanov)</a>
  </p>
</div>
