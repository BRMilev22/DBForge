# DBForge - Database as a Service Platform

A modern platform for deploying and managing database instances (PostgreSQL, MySQL, MariaDB, MongoDB, Redis) using Docker containers.

## 🚀 Project Structure

```
dbforge/
├── backend/              # Spring Boot REST API
│   ├── src/
│   ├── pom.xml
│   └── application.properties
├── frontend/             # React + TypeScript UI
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── database/            # SQL schemas and migrations
│   └── schema.sql
├── docs/               # Documentation
└── README.md
```

## 🛠️ Tech Stack

### Backend
- **Java 17** with Spring Boot 3.5.7
- **MySQL 8.0+** for metadata storage
- **Docker Java SDK** for container management
- **Spring Security + JWT** for authentication
- **Maven** for build management

### Frontend
- **React 18.2** with TypeScript
- **Vite 5** for build tooling
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Chart.js** for analytics visualization
- **Axios** for API communication

### Infrastructure
- **Docker** for database containers
- **Nginx** for frontend serving
- **Ubuntu 24.04** VPS

## 📦 Quick Start

### Prerequisites
- Java 17+
- Node.js 18+
- Docker
- MySQL 8.0+
- Maven

### Backend Setup

```bash
cd backend

# Configure database connection
# Edit src/main/resources/application.properties
# Set your MySQL credentials and app.database.host

# Build
./mvnw clean install

# Run
./mvnw spring-boot:run
```

Backend will run on `http://localhost:8080`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set API URL
# Edit .env or use VITE_API_URL=http://localhost:8080/api

# Development server
npm run dev

# Production build
npm run build
```

Frontend dev server runs on `http://localhost:5173`

### Database Setup

```bash
# Create MySQL database
mysql -u root -p < database/schema.sql

# Or connect to MySQL and run:
CREATE DATABASE dbforge;
USE dbforge;
SOURCE database/schema.sql;
```

## 🔧 Configuration

### Backend Configuration (`backend/src/main/resources/application.properties`)

```properties
# Database connection
spring.datasource.url=jdbc:mysql://localhost:3306/dbforge
spring.datasource.username=root
spring.datasource.password=your_password

# Database host (where containers will be accessible)
# For VPS: use public IP (e.g., 45.76.231.155)
# For local: use localhost or local IP
app.database.host=localhost

# JWT
jwt.secret=your-secret-key-change-this-in-production
jwt.expiration=86400000

# Docker
docker.network=dbforge_network
```

### Frontend Configuration

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:8080/api
```

## 🚀 Deployment

### Deploy to VPS

1. **Transfer files**:
```bash
scp -r dbforge root@your-vps-ip:/root/
```

2. **Setup backend**:
```bash
cd /root/dbforge/backend
./mvnw clean package
nohup java -jar target/dbforge-0.0.1-SNAPSHOT.jar &
```

3. **Setup frontend**:
```bash
cd /root/dbforge/frontend
npm install
npm run build
# Configure nginx to serve dist/
```

4. **Configure firewall**:
```bash
# Open ports for databases
ufw allow 5432:5531/tcp    # PostgreSQL
ufw allow 3306:3505/tcp    # MySQL/MariaDB
ufw allow 27017:27116/tcp  # MongoDB
ufw allow 6379:6478/tcp    # Redis
```

## 📊 Database Types Supported

- **PostgreSQL** (5432-5531)
- **MySQL** (3306-3405)
- **MariaDB** (3406-3505)
- **MongoDB** (27017-27116)
- **Redis** (6379-6478)

Each type has 100 ports allocated for scaling.

## 🔐 Authentication

Default test user:
- **Username**: `testuser`
- **Email**: `test@dbforge.dev`
- **Password**: `password` (hashed with BCrypt)

## 📝 API Endpoints

### Auth
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and get JWT token

### Databases
- `GET /api/databases/types` - List available database types
- `POST /api/databases` - Create new database instance
- `GET /api/databases` - List user's databases
- `GET /api/databases/{id}` - Get database details
- `POST /api/databases/{id}/start` - Start database
- `POST /api/databases/{id}/stop` - Stop database
- `DELETE /api/databases/{id}` - Delete database

### Analytics
- `GET /api/analytics` - Get analytics data (metrics, charts, activity)

## 🎨 Features

- ✅ Real database logos (PostgreSQL, MySQL, MariaDB, MongoDB, Redis)
- ✅ Modern sidebar navigation
- ✅ Overview dashboard with metrics
- ✅ Analytics with Chart.js visualization
- ✅ Activity log tracking
- ✅ Database details modal with connection info
- ✅ Copy credentials to clipboard
- ✅ Quick connect commands
- ✅ Docker container management
- ✅ Custom username/password support
- ✅ JWT authentication
- ✅ Resource limits (CPU, Memory, Storage)

## 🐛 Troubleshooting

### Can't connect to database from external IP
- Ensure containers bind to `0.0.0.0` (already configured)
- For MySQL/MariaDB, verify `--bind-address=0.0.0.0` is set
- Check firewall rules allow the ports
- Verify `app.database.host` is set to your public IP/domain

### Backend won't start
- Check MySQL is running and accessible
- Verify database `dbforge` exists
- Check Java version: `java -version` (should be 17+)
- Review logs for specific errors

### Frontend can't reach backend
- Verify backend is running on port 8080
- Check VITE_API_URL in frontend/.env
- Look for CORS issues in browser console

## 📄 License

MIT License - feel free to use for your projects!

## 🤝 Contributing

This is a learning project. Feel free to fork and customize!

---

**Made with ❤️ for database management**
