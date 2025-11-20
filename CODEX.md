# DBForge Project Codex

**Version**: 1.0  
**Last Updated**: November 20, 2025  
**Project**: DBForge - Cloud Database Management Platform  
**Domain**: https://dbforge.dev  
**Repository**: BRMilev22/DBForge

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Database Configuration](#database-configuration)
6. [Authentication & Security](#authentication--security)
7. [Core Features](#core-features)
8. [API Documentation](#api-documentation)
9. [Frontend Components](#frontend-components)
10. [Backend Services](#backend-services)
11. [Database-Specific Implementations](#database-specific-implementations)
12. [Deployment & Infrastructure](#deployment--infrastructure)
13. [Development Workflow](#development-workflow)
14. [Known Issues & Solutions](#known-issues--solutions)
15. [Code Conventions](#code-conventions)

---

## Project Overview

DBForge is a cloud-based database management platform that allows users to create, manage, and interact with multiple database instances through a web interface. It provides a unified workbench for PostgreSQL, MySQL, MariaDB, MongoDB, and Redis databases.

### Key Capabilities

- **Multi-Database Support**: PostgreSQL, MySQL, MariaDB, MongoDB, Redis
- **Docker-Based Provisioning**: Automatic container creation and management
- **Interactive Query Editor**: Monaco-based editor with syntax highlighting
- **Schema Explorer**: Visual database schema browsing
- **Table Operations**: View/edit data with AG Grid
- **Analytics Dashboard**: Database metrics and monitoring
- **API Token Management**: Programmatic database access
- **User Authentication**: JWT-based authentication system

### Business Context

- **Deployment**: Self-hosted on home server (Ubuntu Server 24.04)
- **Network**: Port forwarding range 10000-10050 for database access
- **Domain**: dbforge.dev (hides home IP 79.100.101.80)
- **SSL**: Let's Encrypt certificates

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Browser                           │
│                   https://dbforge.dev                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTPS (443)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Nginx (Reverse Proxy)                     │
│  - Serves static React app from /var/www/dbforge.dev/       │
│  - Proxies /api/* to localhost:8080                         │
│  - SSL termination                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ HTTP (8080)
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Spring Boot Backend (localhost:8080)            │
│  - REST API endpoints                                        │
│  - JWT authentication                                        │
│  - Docker container management                               │
│  - Query execution and schema introspection                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Docker API
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                    Docker Engine                             │
│  ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│  │  PostgreSQL  │    MySQL     │   MariaDB    │  MongoDB  │ │
│  │  10000-10009 │  10010-10019 │  10020-10029 │ 10030-... │ │
│  └──────────────┴──────────────┴──────────────┴───────────┘ │
│  ┌──────────────┐                                            │
│  │    Redis     │                                            │
│  │  10040-10049 │                                            │
│  └──────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User Access**: Browser → https://dbforge.dev
2. **Static Assets**: Nginx serves React SPA
3. **API Calls**: `/api/*` → Nginx → Spring Boot (localhost:8080)
4. **Database Operations**: Backend → Docker containers via Docker API
5. **External Connections**: Desktop tools → dbforge.dev:10000-10050 → Docker containers

### Port Allocation Strategy

| Database Type | Port Range   | Count | Purpose                          |
|---------------|-------------|-------|----------------------------------|
| PostgreSQL    | 10000-10009 | 10    | User database instances          |
| MySQL         | 10010-10019 | 10    | User database instances          |
| MariaDB       | 10020-10029 | 10    | User database instances          |
| MongoDB       | 10030-10039 | 10    | User database instances          |
| Redis         | 10040-10049 | 10    | User database instances          |
| **Total**     | 10000-10050 | 50    | Simplified port forwarding       |

---

## Technology Stack

### Frontend

- **Framework**: React 18.2.0 with TypeScript
- **Build Tool**: Vite 5.4.21
- **UI Components**: 
  - Lucide React (icons)
  - AG Grid Community (data tables)
  - Monaco Editor (code editor)
- **Styling**: Tailwind CSS 3.4.17
- **HTTP Client**: Axios 1.7.9
- **State Management**: React Context API

### Backend

- **Framework**: Spring Boot 3.5.7
- **Language**: Java 17
- **Build Tool**: Maven
- **Database Drivers**:
  - PostgreSQL Driver 42.7.4
  - MySQL Connector 9.0.0
  - MariaDB Connector 3.4.1
  - MongoDB Driver 4.11.1
  - Jedis (Redis) 5.2.0
- **Docker Integration**: Docker Java 3.4.1
- **Security**: JWT (jjwt 0.12.6)
- **JSON Processing**: Jackson, Gson

### Infrastructure

- **OS**: Ubuntu Server 24.04 LTS
- **Web Server**: Nginx (reverse proxy + static file serving)
- **Container Runtime**: Docker Engine
- **SSL**: Let's Encrypt (Certbot)
- **Domain**: dbforge.dev
- **Network**: TP-Link router with port forwarding

---

## Project Structure

```
/home/dbforge/new/DBForge/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/dbforge/dbforge/
│   │   │   │   ├── DbforgeApplication.java          # Main entry point
│   │   │   │   ├── config/
│   │   │   │   │   ├── CorsConfig.java              # CORS configuration
│   │   │   │   │   ├── SecurityConfig.java          # JWT security config
│   │   │   │   │   └── WebConfig.java               # Web MVC config
│   │   │   │   ├── controller/
│   │   │   │   │   ├── AnalyticsController.java     # Analytics endpoints
│   │   │   │   │   ├── AuthController.java          # Login/register
│   │   │   │   │   └── DatabaseController.java      # Database CRUD + query
│   │   │   │   ├── dto/
│   │   │   │   │   ├── CreateDatabaseRequest.java   # Database creation DTO
│   │   │   │   │   ├── LoginRequest.java            # Auth DTOs
│   │   │   │   │   └── QueryRequest.java            # Query execution DTO
│   │   │   │   ├── model/
│   │   │   │   │   ├── ApiToken.java                # API token entity
│   │   │   │   │   ├── DatabaseInstance.java        # Database instance entity
│   │   │   │   │   ├── DatabaseType.java            # Database type enum
│   │   │   │   │   └── User.java                    # User entity
│   │   │   │   ├── repository/
│   │   │   │   │   ├── ApiTokenRepository.java      # JPA repository
│   │   │   │   │   ├── DatabaseInstanceRepository.java
│   │   │   │   │   └── UserRepository.java
│   │   │   │   ├── service/
│   │   │   │   │   ├── AnalyticsService.java        # Analytics calculation
│   │   │   │   │   ├── AuthService.java             # Authentication logic
│   │   │   │   │   ├── DatabaseService.java         # Docker container mgmt
│   │   │   │   │   ├── DockerService.java           # Docker API wrapper
│   │   │   │   │   ├── MongoDBQueryService.java     # MongoDB query exec
│   │   │   │   │   ├── QueryExecutionService.java   # SQL query execution
│   │   │   │   │   ├── RedisQueryService.java       # Redis command exec
│   │   │   │   │   └── SchemaIntrospectionService.java # Schema discovery
│   │   │   │   └── util/
│   │   │   │       ├── JwtUtil.java                 # JWT token utilities
│   │   │   │       └── PasswordUtil.java            # Password hashing
│   │   │   └── resources/
│   │   │       ├── application.properties           # Main config
│   │   │       └── application-prod.properties      # Production overrides
│   │   └── test/                                    # Test files
│   ├── pom.xml                                      # Maven dependencies
│   └── deploy.sh                                    # Deployment script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AuthModal.tsx                        # Login/register modal
│   │   │   ├── ConfirmDialog.tsx                    # Custom confirmation
│   │   │   ├── CreateDatabaseModal.tsx              # DB creation wizard
│   │   │   ├── DatabaseDetailsModal.tsx             # DB info modal
│   │   │   ├── DatabaseLogos.tsx                    # Database icons
│   │   │   ├── DatabaseSelector.tsx                 # DB type selector
│   │   │   ├── DatabaseStatusChart.tsx              # Status pie chart
│   │   │   ├── DatabaseTypeChart.tsx                # Type distribution
│   │   │   ├── DatabaseWorkbench.tsx                # Main query interface
│   │   │   ├── ExportImportDialog.tsx               # Data export/import
│   │   │   ├── Landing.tsx                          # Landing page
│   │   │   ├── Logo.tsx                             # App logo
│   │   │   ├── QueryEditor.tsx                      # Monaco editor wrapper
│   │   │   ├── QueryHistory.tsx                     # Query history panel
│   │   │   ├── ResultsGrid.tsx                      # Query results display
│   │   │   ├── SchemaExplorer.tsx                   # Schema tree view
│   │   │   ├── TableContentView.tsx                 # Table data editor
│   │   │   └── TableStructureView.tsx               # Table schema viewer
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx                      # Auth state context
│   │   ├── services/
│   │   │   ├── api.ts                               # API client (Axios)
│   │   │   └── authApi.ts                           # Auth endpoints
│   │   ├── types/
│   │   │   ├── auth.ts                              # Auth type definitions
│   │   │   └── database.ts                          # Database types
│   │   ├── App.tsx                                  # Main app component
│   │   ├── index.css                                # Global styles
│   │   └── main.tsx                                 # React entry point
│   ├── public/                                      # Static assets
│   ├── dist/                                        # Production build
│   ├── package.json                                 # NPM dependencies
│   ├── tsconfig.json                                # TypeScript config
│   ├── tailwind.config.js                           # Tailwind config
│   └── vite.config.ts                               # Vite config
├── database/
│   └── schema.sql                                   # H2 database schema
├── docs/
│   └── DEPLOYMENT.md                                # Deployment guide
├── CODEX.md                                         # This file
├── DEVELOPMENT.md                                   # Dev guide
├── PLAN.md                                          # Project roadmap
└── README.md                                        # Project overview
```

---

## Database Configuration

### Connection Strategy

- **Internal Connections** (Backend → Docker): Always use `localhost` with mapped ports
- **External Connections** (Users → Databases): Use `dbforge.dev` with forwarded ports

### Backend Configuration (`application.properties`)

```properties
# Server
server.port=8080

# Database Host (for user-facing connection details)
app.database.host=dbforge.dev

# H2 Database (for users and database instances metadata)
spring.datasource.url=jdbc:h2:file:./data/dbforge
spring.datasource.driver-class-name=org.h2.Driver
spring.jpa.hibernate.ddl-auto=update

# JWT
jwt.secret=your-secret-key-here
jwt.expiration=86400000

# Port Ranges
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

# Docker Images
docker.image.postgres=postgres:16-alpine
docker.image.mysql=mysql:8.0
docker.image.mariadb=mariadb:11.2
docker.image.mongodb=mongo:4.4
docker.image.redis=redis:7.4-alpine

# Resource Limits
docker.cpu.limit=0.5
docker.memory.limit=536870912
```

### Database Instance Creation Flow

1. User submits `CreateDatabaseRequest` (type, name, username, password)
2. `DatabaseService.createDatabase()` validates and finds available port
3. `DockerService.createContainer()` creates Docker container with:
   - Database-specific image
   - Environment variables (credentials)
   - Port mapping (host port → container default port)
   - Resource limits (CPU, memory)
   - Network isolation
4. Container starts automatically
5. `DatabaseInstance` entity saved to H2 database
6. Connection details returned to user

### Port Management

Ports are allocated sequentially within ranges:
- On creation: Find first available port in range
- On deletion: Port becomes available for reuse
- Collision handling: Skip ports already in use

---

## Authentication & Security

### JWT Authentication Flow

1. **Registration**: `POST /api/auth/register`
   - Password hashed with BCrypt (strength 12)
   - User saved to H2 database
   - JWT token generated and returned

2. **Login**: `POST /api/auth/login`
   - Password verified with BCrypt
   - JWT token generated with username claim
   - Token expires in 24 hours (configurable)

3. **Protected Routes**: All `/api/*` except `/api/auth/*`
   - Frontend sends token in `Authorization: Bearer <token>` header
   - `JwtAuthenticationFilter` validates token
   - User principal extracted and injected into requests

### Security Configuration

- **CORS**: Configured in `CorsConfig.java` to allow frontend origin
- **CSRF**: Disabled (stateless JWT authentication)
- **Password Storage**: BCrypt hashing (12 rounds)
- **Token Storage**: Client-side in `localStorage`

### API Token System

Users can generate API tokens for programmatic access:
- **Endpoint**: `POST /api/databases/{id}/token`
- **Storage**: Tokens stored in `api_tokens` table
- **Usage**: Can be used in place of JWT for automation
- **Scope**: Token is specific to one database instance

---

## Core Features

### 1. Database Instance Management

**Create Database**
- User selects database type (PostgreSQL, MySQL, MariaDB, MongoDB, Redis)
- Provides instance name, username, password
- Backend creates Docker container and starts it
- Connection details displayed in UI

**Start/Stop Database**
- `POST /api/databases/{id}/start`
- `POST /api/databases/{id}/stop`
- Controls Docker container state

**Delete Database**
- `DELETE /api/databases/{id}`
- Stops and removes Docker container
- Deletes metadata from H2 database

### 2. Query Execution

**SQL Databases** (PostgreSQL, MySQL, MariaDB)
- Monaco editor with SQL syntax highlighting
- Query types detected: SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, TRUNCATE
- Results displayed in AG Grid
- Execution time tracking
- Row count and affected rows reporting

**MongoDB**
- Executes MongoDB shell commands: `db.collection.find()`, `insertOne()`, `updateOne()`, etc.
- Special handling for ObjectId: Converts `ObjectId("hex")` → `{"$oid": "hex"}` for BSON compatibility
- JSON result formatting

**Redis**
- Executes Redis commands: GET, SET, DEL, KEYS, HSET, etc.
- String response formatting
- Special handling for KEYS command (pattern matching)

### 3. Schema Exploration

**SQL Databases**
- Tree view of databases → tables → columns
- Column metadata: name, type, nullable, default, key constraints
- Index information
- Primary/foreign key relationships

**MongoDB**
- Collections listed as "tables"
- Field names and types inferred from sample documents
- Document count per collection

**Redis**
- Key pattern exploration
- No traditional schema (key-value store)

### 4. Context Menu Operations

**Right-click on tables/collections** generates database-specific queries:

**SQL** (PostgreSQL, MySQL, MariaDB):
- SELECT Statement
- INSERT Statement
- UPDATE Statement
- DELETE Statement
- TRUNCATE TABLE
- DROP TABLE

**MongoDB**:
- FIND Query: `db.collection.find({})`
- INSERT Command: `db.collection.insertOne({field: value})`
- UPDATE Command: `db.collection.updateOne({_id: ObjectId("?")}, {$set: {}})`
- DELETE Command: `db.collection.deleteOne({_id: ObjectId("?")})`
- DELETE ALL: `db.collection.deleteMany({})`
- DROP Collection: `db.collection.drop()`

**Redis**:
- KEYS Command: `KEYS pattern`
- SET Command: `SET key "value"`
- DELETE Command: `DEL key`
- (TRUNCATE/DROP shown as comments)

### 5. Table Data Editing

**AG Grid Integration**
- Inline cell editing
- Add/delete rows
- Bulk save operations
- Filter and search
- Export to CSV/JSON
- Import from CSV/JSON

### 6. Analytics Dashboard

**Metrics**:
- Total databases
- Running databases
- Stopped databases
- Total storage usage
- System uptime

**Charts**:
- Database type distribution (pie chart)
- Database status distribution (pie chart)

**Recent Activity**:
- Latest database operations
- Creation/start/stop events

---

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string"
}

Response: 200 OK
{
  "token": "jwt-token-string"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response: 200 OK
{
  "token": "jwt-token-string"
}
```

### Database Management Endpoints

#### Get Database Types
```http
GET /api/databases/types
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": 1,
    "name": "postgres",
    "displayName": "PostgreSQL",
    "defaultVersion": "16-alpine",
    "availableVersions": ["16-alpine", "15-alpine"]
  }
]
```

#### List User Databases
```http
GET /api/databases
Authorization: Bearer <token>

Response: 200 OK
[
  {
    "id": 1,
    "instanceName": "my-postgres",
    "databaseType": "postgres",
    "status": "RUNNING",
    "connectionInfo": {
      "host": "dbforge.dev",
      "port": 10000,
      "database": "my-postgres",
      "username": "dbuser",
      "password": "dbpass",
      "connectionString": "jdbc:postgresql://dbforge.dev:10000/my-postgres"
    },
    "containerId": "abc123...",
    "createdAt": "2025-11-20T10:30:00Z",
    "startedAt": "2025-11-20T10:30:05Z"
  }
]
```

#### Create Database
```http
POST /api/databases
Authorization: Bearer <token>
Content-Type: application/json

{
  "databaseType": "postgres",
  "instanceName": "my-database",
  "dbUsername": "dbuser",
  "dbPassword": "dbpass"
}

Response: 201 Created
{
  "id": 1,
  "instanceName": "my-database",
  "databaseType": "postgres",
  "status": "CREATING",
  "connectionInfo": { ... }
}
```

#### Start Database
```http
POST /api/databases/{id}/start
Authorization: Bearer <token>

Response: 200 OK
```

#### Stop Database
```http
POST /api/databases/{id}/stop
Authorization: Bearer <token>

Response: 200 OK
```

#### Delete Database
```http
DELETE /api/databases/{id}
Authorization: Bearer <token>

Response: 204 No Content
```

#### Get Database Schema
```http
GET /api/databases/{id}/schema
Authorization: Bearer <token>

Response: 200 OK
{
  "databaseName": "my-postgres",
  "tables": [
    {
      "name": "users",
      "type": "TABLE",
      "rowCount": 42,
      "columns": [
        {
          "name": "id",
          "dataType": "integer",
          "nullable": false,
          "defaultValue": "nextval(...)",
          "isPrimaryKey": true,
          "maxLength": 0
        }
      ],
      "indexes": [
        {
          "name": "users_pkey",
          "type": "PRIMARY",
          "columns": ["id"]
        }
      ]
    }
  ]
}
```

#### Execute Query
```http
POST /api/databases/{id}/query
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "SELECT * FROM users LIMIT 10",
  "limit": 1000,
  "timeout": 30
}

Response: 200 OK
{
  "success": true,
  "queryType": "SELECT",
  "columns": ["id", "username", "email"],
  "rows": [
    {"id": 1, "username": "john", "email": "john@example.com"}
  ],
  "rowCount": 1,
  "executionTimeMs": 45,
  "affectedRows": 0,
  "message": "Query executed successfully"
}
```

#### Generate API Token
```http
POST /api/databases/{id}/token
Authorization: Bearer <token>

Response: 200 OK
{
  "apiToken": "generated-token-string"
}
```

### Analytics Endpoints

#### Get Analytics
```http
GET /api/analytics
Authorization: Bearer <token>

Response: 200 OK
{
  "metrics": {
    "totalDatabases": 5,
    "runningDatabases": 3,
    "stoppedDatabases": 2,
    "totalStorage": 1073741824,
    "uptime": 86400000
  },
  "databasesByType": {
    "labels": ["PostgreSQL", "MySQL", "MongoDB"],
    "values": [2, 2, 1]
  },
  "databasesByStatus": {
    "labels": ["Running", "Stopped"],
    "values": [3, 2]
  },
  "recentActivity": [
    {
      "id": 1,
      "databaseName": "my-postgres",
      "databaseType": "postgres",
      "action": "created",
      "status": "success",
      "timestamp": "2025-11-20T10:30:00Z"
    }
  ]
}
```

---

## Frontend Components

### App.tsx
**Main application component**
- Manages global state (databases, analytics, auth)
- Tab navigation (overview, databases, activity)
- Toast notifications
- Database CRUD operations orchestration

### AuthModal.tsx
**Authentication modal**
- Login/register tabs
- Form validation
- JWT token storage in localStorage
- Error handling

### DatabaseWorkbench.tsx
**Main query interface**
- Tab system (query tabs, table views)
- Schema explorer integration
- Query editor integration
- Results display
- Automatic schema refresh after DDL/DML operations

**Key Features**:
- Multiple query tabs
- Table content viewing
- Generated query insertion
- Query history tracking

### SchemaExplorer.tsx
**Database schema tree view**
- Collapsible tree structure (database → tables → columns)
- Context menu on tables/collections
- Database-specific query generation
- Refresh capability
- Loading states

**Context Menu Actions**:
- Generate SELECT/FIND
- Generate INSERT
- Generate UPDATE
- Generate DELETE
- Truncate/Delete All
- Drop table/collection

**Special Handling**:
- MongoDB: Uses `db.collection` syntax
- Redis: Uses Redis commands
- SQL: Standard SQL statements

### QueryEditor.tsx
**Monaco editor wrapper**
- Syntax highlighting (SQL, MongoDB, Redis)
- Default query templates per database type
- Execute query button
- Clear editor button
- Query history button
- AI-powered query suggestions (future)

**Database-Specific Templates**:
- PostgreSQL: Sample SELECT with JOIN
- MySQL/MariaDB: Sample SELECT with WHERE
- MongoDB: Sample find() with projection
- Redis: Sample GET/SET commands

### ResultsGrid.tsx
**Query results display**
- AG Grid integration
- Column auto-sizing
- Row selection
- Export capability
- Error display
- Execution metrics (time, row count)

### TableContentView.tsx
**Table data editor**
- Full CRUD operations on table data
- Inline editing with AG Grid
- Add/delete rows
- Bulk save
- Filter/search
- Import/export CSV/JSON

### DatabaseDetailsModal.tsx
**Database information modal**
- Connection details display
- Copy to clipboard functionality
- Status information
- Container ID
- API token generation

### CreateDatabaseModal.tsx
**Database creation wizard**
- Database type selection
- Instance name input
- Credentials setup
- Validation
- Loading states during creation

---

## Backend Services

### DatabaseService.java
**Container lifecycle management**

**Key Methods**:
- `createDatabase()`: Creates Docker container, allocates port, saves instance
- `startDatabase()`: Starts stopped container
- `stopDatabase()`: Stops running container
- `deleteDatabase()`: Removes container and deletes instance
- `getDatabases()`: Lists user's database instances
- `getDatabase()`: Gets single database instance

**Port Allocation Logic**:
```java
private int findAvailablePort(String databaseType) {
    int start = getPortRangeStart(databaseType);
    int end = getPortRangeEnd(databaseType);
    
    for (int port = start; port <= end; port++) {
        if (!isPortInUse(port)) {
            return port;
        }
    }
    throw new RuntimeException("No available ports in range");
}
```

### DockerService.java
**Docker API wrapper**

**Key Methods**:
- `createContainer()`: Creates container with config (image, env vars, ports, limits)
- `startContainer()`: Starts container by ID
- `stopContainer()`: Stops container by ID
- `removeContainer()`: Removes container by ID
- `getContainerStatus()`: Gets container state
- `listContainers()`: Lists all containers

**Resource Limits**:
- CPU: 0.5 cores (50% of one CPU)
- Memory: 512MB
- Network: Bridge mode

### QueryExecutionService.java
**SQL query execution**

**Supported Databases**: PostgreSQL, MySQL, MariaDB

**Key Methods**:
- `executeQuery()`: Executes any SQL query
- `buildJdbcUrl()`: Constructs JDBC connection string (uses localhost for internal connections)
- `detectQueryType()`: Determines query type (SELECT, INSERT, UPDATE, etc.)
- `executeSelectQuery()`: Returns columns and rows
- `executeUpdateQuery()`: Returns affected row count

**Connection Strategy**:
- Always connects to `localhost` (backend is on same server as Docker)
- Uses port from database instance metadata
- Creates new connection per query (no pooling yet)

### MongoDBQueryService.java
**MongoDB query execution**

**Key Methods**:
- `executeQuery()`: Executes MongoDB commands
- `preprocessMongoQuery()`: Converts ObjectId syntax to BSON
- `executeSelectQuery()`: Executes find() operations
- `executeInsertQuery()`: Executes insertOne/insertMany
- `executeUpdateQuery()`: Executes updateOne/updateMany
- `executeDeleteQuery()`: Executes deleteOne/deleteMany
- `executeDropCollection()`: Drops collection
- `getCollectionsWithSchema()`: Returns collections with field info

**ObjectId Preprocessing**:
```java
private String preprocessMongoQuery(String query) {
    // Convert ObjectId("hex") to {"$oid": "hex"}
    return query.replaceAll(
        "ObjectId\\(\"([a-f0-9]{24})\"\\)",
        "{\"\\$oid\": \"$1\"}"
    );
}
```

### RedisQueryService.java
**Redis command execution**

**Key Methods**:
- `executeQuery()`: Executes Redis commands
- `executeGetCommand()`: GET key
- `executeSetCommand()`: SET key value
- `executeDelCommand()`: DEL key
- `executeKeysCommand()`: KEYS pattern
- `executeHashCommands()`: HSET, HGET, HDEL

**Connection**:
- Uses Jedis client
- Connects to localhost with mapped port

### SchemaIntrospectionService.java
**Database schema discovery**

**Key Methods**:
- `getDatabaseSchema()`: Main entry point, routes to DB-specific method
- `getPostgreSQLSchema()`: Uses information_schema views
- `getMySQLSchema()`: Uses information_schema views
- `getMariaDBSchema()`: Uses information_schema views
- `getMongoDBSchema()`: Uses listCollections + sample documents
- `getRedisSchema()`: Returns empty (no schema concept)

**Schema Information Gathered**:
- Table/collection names
- Column names and data types
- Nullability
- Default values
- Primary keys
- Indexes
- Row counts

---

## Database-Specific Implementations

### PostgreSQL

**Docker Image**: `postgres:16-alpine`

**Environment Variables**:
- `POSTGRES_USER`: Database username
- `POSTGRES_PASSWORD`: Database password
- `POSTGRES_DB`: Database name (same as instance name)

**Port Mapping**: `10000-10009` → `5432`

**JDBC URL**: `jdbc:postgresql://localhost:{port}/{dbname}`

**Schema Introspection**:
```sql
-- Tables
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public'

-- Columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = ?

-- Indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = ?
```

### MySQL

**Docker Image**: `mysql:8.0`

**Environment Variables**:
- `MYSQL_ROOT_PASSWORD`: Root password
- `MYSQL_USER`: Database username
- `MYSQL_PASSWORD`: Database password
- `MYSQL_DATABASE`: Database name

**Port Mapping**: `10010-10019` → `3306`

**JDBC URL**: `jdbc:mysql://localhost:{port}/{dbname}`

**Special Considerations**:
- Wait time after DDL/DML operations (500ms) for commit
- Default character set: utf8mb4

### MariaDB

**Docker Image**: `mariadb:11.2`

**Environment Variables**:
- `MARIADB_ROOT_PASSWORD`: Root password
- `MARIADB_USER`: Database username
- `MARIADB_PASSWORD`: Database password
- `MARIADB_DATABASE`: Database name

**Port Mapping**: `10020-10029` → `3306`

**JDBC URL**: `jdbc:mariadb://localhost:{port}/{dbname}`

**Compatibility**: Nearly identical to MySQL in query execution

### MongoDB

**Docker Image**: `mongo:4.4`

**Environment Variables**:
- `MONGO_INITDB_ROOT_USERNAME`: Admin username
- `MONGO_INITDB_ROOT_PASSWORD`: Admin password
- `MONGO_INITDB_DATABASE`: Database name

**Port Mapping**: `10030-10039` → `27017`

**Connection**: Uses MongoDB Java Driver

**Query Format**: MongoDB shell syntax
```javascript
db.collection.find({})
db.collection.insertOne({field: value})
db.collection.updateOne({_id: ObjectId("...")}, {$set: {...}})
db.collection.deleteOne({_id: ObjectId("...")})
```

**ObjectId Handling**:
- User writes: `ObjectId("507f1f77bcf86cd799439011")`
- Backend converts to: `{"$oid": "507f1f77bcf86cd799439011"}`
- Parsed as BSON ObjectId

**Schema Discovery**:
- Lists collections
- Samples first document to infer field types
- Returns field names and types

### Redis

**Docker Image**: `redis:7.4-alpine`

**Environment Variables**: None (no auth in current setup)

**Port Mapping**: `10040-10049` → `6379`

**Connection**: Uses Jedis client

**Command Format**: Redis CLI syntax
```
GET key
SET key "value"
DEL key
KEYS pattern
HSET hash field value
```

**No Schema**: Redis is schemaless (key-value store)

---

## Deployment & Infrastructure

### Production Deployment

**Server**: Ubuntu Server 24.04 LTS (Home server)

**Domain**: dbforge.dev (points to public IP 79.100.101.80)

**SSL Certificate**: Let's Encrypt (auto-renewal via Certbot)

**Nginx Configuration** (`/etc/nginx/sites-available/dbforge.dev`):
```nginx
server {
    listen 443 ssl http2;
    server_name dbforge.dev www.dbforge.dev;

    ssl_certificate /etc/letsencrypt/live/dbforge.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dbforge.dev/privkey.pem;
    
    root /var/www/dbforge.dev;
    index index.html;

    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Frontend SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Port Forwarding (Router)

**Router**: TP-Link (home network)

**Forwarded Ports**:
- `443` → Server:443 (HTTPS)
- `80` → Server:80 (HTTP redirect)
- `10000-10050` → Server:10000-10050 (Database instances)

### Deployment Process

**Backend Deployment**:
```bash
cd /home/dbforge/new/DBForge/backend
mvn clean package
pkill -9 java  # Stop old process
mvn spring-boot:run &  # Start new process
```

**Frontend Deployment**:
```bash
cd /home/dbforge/new/DBForge/frontend
npm run build
sudo rm -rf /var/www/dbforge.dev/*
sudo cp -r dist/* /var/www/dbforge.dev/
sudo systemctl reload nginx
```

### Monitoring

**Backend Logs**:
```bash
# Spring Boot logs (if using systemd)
journalctl -u dbforge-backend -f

# Or check terminal output if running mvn spring-boot:run
```

**Nginx Logs**:
```bash
tail -f /var/log/nginx/dbforge.dev.access.log
tail -f /var/log/nginx/dbforge.dev.error.log
```

**Docker Logs**:
```bash
docker logs <container-id>
docker logs -f <container-id>  # Follow
```

### Backup Strategy

**H2 Database** (user data):
```bash
cp /home/dbforge/new/DBForge/backend/data/dbforge.mv.db ~/backups/
```

**User Database Volumes**:
```bash
docker exec <container-id> pg_dump -U <user> <dbname> > backup.sql
```

---

## Development Workflow

### Local Development Setup

**Prerequisites**:
- Java 17+
- Node.js 18+
- Maven 3.8+
- Docker Engine

**Backend Development**:
```bash
cd /home/dbforge/new/DBForge/backend
mvn spring-boot:run
# Backend runs on http://localhost:8080
```

**Frontend Development**:
```bash
cd /home/dbforge/new/DBForge/frontend
npm install
npm run dev
# Frontend runs on http://localhost:3000
# API proxied to http://localhost:8080
```

**Vite Configuration** (`vite.config.ts`):
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
```

### Development URLs

- **Frontend Dev Server**: http://localhost:3000 (HMR enabled)
- **Backend API**: http://localhost:8080/api
- **Production Site**: https://dbforge.dev

### Hot Module Replacement

Vite provides instant HMR for:
- React components
- CSS/Tailwind classes
- TypeScript files

No server restart needed during frontend development.

### Testing Workflow

1. Make changes to frontend/backend
2. Test on `localhost:3000` (dev server)
3. Build frontend: `npm run build`
4. Test production build locally
5. Deploy to production

---

## Known Issues & Solutions

### Issue: MongoDB ObjectId in DELETE/UPDATE

**Problem**: MongoDB queries with `ObjectId("...")` fail with "Invalid JSON number"

**Solution**: Backend preprocesses query to convert ObjectId syntax to BSON format
```java
// MongoDBQueryService.java
query = query.replaceAll(
    "ObjectId\\(\"([a-f0-9]{24})\"\\)",
    "{\"\\$oid\": \"$1\"}"
);
```

### Issue: TypeError - n.filter is not a function

**Problem**: Old build served from different directory causing type mismatches

**Solution**: Rebuild frontend and deploy to correct directory
```bash
cd frontend && npm run build
sudo cp -r dist/* /var/www/dbforge.dev/
```

### Issue: CORS Errors

**Problem**: Frontend can't call backend API due to CORS policy

**Solution**: CORS configured in `CorsConfig.java`
```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000", "https://dbforge.dev")
                .allowedMethods("GET", "POST", "PUT", "DELETE")
                .allowCredentials(true);
    }
}
```

### Issue: Database Connection Timeout

**Problem**: Backend can't connect to database within timeout

**Solution**: 
- Increase timeout in `QueryRequest` (default 30s)
- Check Docker container is running
- Verify port mapping is correct

### Issue: Port Already in Use

**Problem**: Cannot allocate port for new database

**Solution**:
- Check existing database instances
- Manually free up ports if needed
- Increase port range if limits reached

---

## Code Conventions

### Java (Backend)

**Naming**:
- Classes: PascalCase (`DatabaseService`)
- Methods: camelCase (`createDatabase()`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_PORT`)
- Packages: lowercase (`com.dbforge.dbforge.service`)

**Structure**:
- DTOs in `dto` package
- Entities in `model` package
- Repositories in `repository` package
- Business logic in `service` package
- REST controllers in `controller` package

**Annotations**:
- `@Service` for service classes
- `@RestController` for API controllers
- `@RequestMapping("/api/...")` for route prefixes
- `@Transactional` for database operations

### TypeScript (Frontend)

**Naming**:
- Components: PascalCase (`DatabaseWorkbench.tsx`)
- Functions: camelCase (`handleExecuteQuery`)
- Types/Interfaces: PascalCase (`DatabaseInstance`)
- Constants: UPPER_SNAKE_CASE or camelCase

**Structure**:
- One component per file
- Co-locate types with components when specific
- Shared types in `types/` directory
- API calls in `services/` directory

**React Patterns**:
- Functional components with hooks
- Context for global state (AuthContext)
- Props destructuring
- TypeScript strict mode

### Git Workflow

**Branch**: `main` (primary development branch)

**Commit Messages**:
- Present tense ("Add feature" not "Added feature")
- Descriptive and concise
- Reference issue numbers if applicable

---

## Quick Reference

### Common Commands

```bash
# Start backend
cd /home/dbforge/new/DBForge/backend && mvn spring-boot:run

# Start frontend dev
cd /home/dbforge/new/DBForge/frontend && npm run dev

# Build frontend
cd /home/dbforge/new/DBForge/frontend && npm run build

# Deploy frontend
sudo cp -r /home/dbforge/new/DBForge/frontend/dist/* /var/www/dbforge.dev/
sudo systemctl reload nginx

# Check running containers
docker ps

# Check backend process
jps -l | grep DbforgeApplication

# Check nginx status
sudo systemctl status nginx

# View logs
tail -f /var/log/nginx/dbforge.dev.access.log
```

### Important File Paths

- **Frontend Build Output**: `/home/dbforge/new/DBForge/frontend/dist/`
- **Nginx Web Root**: `/var/www/dbforge.dev/`
- **Nginx Config**: `/etc/nginx/sites-available/dbforge.dev`
- **Backend Properties**: `/home/dbforge/new/DBForge/backend/src/main/resources/application.properties`
- **H2 Database**: `/home/dbforge/new/DBForge/backend/data/dbforge.mv.db`
- **SSL Certs**: `/etc/letsencrypt/live/dbforge.dev/`

### Key Endpoints

- **Production Site**: https://dbforge.dev
- **API Base**: https://dbforge.dev/api
- **Dev Frontend**: http://localhost:3000
- **Dev Backend**: http://localhost:8080

### Database Connection Examples

**PostgreSQL** (from DBeaver/pgAdmin):
```
Host: dbforge.dev
Port: 10000-10009 (instance-specific)
Database: <instance-name>
Username: <your-username>
Password: <your-password>
```

**MongoDB** (from Compass):
```
mongodb://<username>:<password>@dbforge.dev:10030-10039/<dbname>
```

**Redis** (from redis-cli):
```bash
redis-cli -h dbforge.dev -p 10040-10049
```

---

## Future Enhancements

### Planned Features

- [ ] Connection pooling for better performance
- [ ] Query execution history persistence
- [ ] Database backup/restore functionality
- [ ] User roles and permissions
- [ ] Database cloning
- [ ] Automated backups
- [ ] Resource usage monitoring per instance
- [ ] Query performance analyzer
- [ ] SQL query builder (visual)
- [ ] Database migration tools
- [ ] Scheduled query execution
- [ ] Webhooks for database events
- [ ] Multi-user collaboration on queries
- [ ] Database templates (pre-configured schemas)
- [ ] Import/export wizard improvements

### Technical Debt

- [ ] Add connection pooling (HikariCP)
- [ ] Implement proper error handling across all services
- [ ] Add comprehensive unit tests
- [ ] Add integration tests for Docker operations
- [ ] Optimize Docker image sizes
- [ ] Implement query result pagination
- [ ] Add request rate limiting
- [ ] Implement API versioning
- [ ] Add OpenAPI/Swagger documentation
- [ ] Containerize backend (Docker)
- [ ] Set up CI/CD pipeline
- [ ] Add database migration framework (Flyway/Liquibase)

---

## Troubleshooting Guide

### Backend Won't Start

**Check**:
1. Java version: `java -version` (should be 17+)
2. Port 8080 available: `lsof -i :8080`
3. H2 database file permissions
4. Docker daemon running: `docker ps`

### Frontend Build Fails

**Check**:
1. Node version: `node -v` (should be 18+)
2. Clean install: `rm -rf node_modules package-lock.json && npm install`
3. TypeScript errors in console
4. Disk space: `df -h`

### Database Won't Start

**Check**:
1. Docker container exists: `docker ps -a | grep <instance-name>`
2. Container logs: `docker logs <container-id>`
3. Port not already in use
4. Docker daemon healthy: `docker info`

### Can't Connect to Database Externally

**Check**:
1. Port forwarding configured on router
2. Database status is RUNNING
3. Correct port number (check instance details)
4. Firewall not blocking ports: `sudo ufw status`

### Nginx Returns 502 Bad Gateway

**Check**:
1. Backend is running: `curl http://localhost:8080/api/databases/types`
2. Nginx config syntax: `sudo nginx -t`
3. Nginx error logs: `tail -f /var/log/nginx/dbforge.dev.error.log`

---

## Contact & Support

**Repository**: https://github.com/BRMilev22/DBForge  
**Domain**: https://dbforge.dev  
**License**: MIT (or specify your license)

---

**End of Codex**

This document contains all architectural, technical, and operational knowledge about the DBForge project as of November 20, 2025. Use this as a comprehensive reference for understanding, developing, and maintaining the system.
