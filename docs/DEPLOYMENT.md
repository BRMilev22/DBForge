# DBForge Deployment Guide

## VPS Deployment (Ubuntu 24.04)

### Prerequisites

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Java 17
sudo apt install openjdk-17-jdk -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# Install Docker
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install Nginx
sudo apt install nginx -y
```

### Step 1: Transfer Project

```bash
# From your local machine
scp -r /Users/borismilev/Desktop/dbforge-unified root@YOUR_VPS_IP:/root/dbforge
```

### Step 2: Setup Database

```bash
# On VPS
cd /root/dbforge
mysql -u root -p < database/schema.sql
```

### Step 3: Configure Backend

```bash
cd /root/dbforge/backend

# Edit application.properties
nano src/main/resources/application.properties

# Set:
# - spring.datasource credentials
# - app.database.host=YOUR_VPS_PUBLIC_IP
# - jwt.secret to secure random string
```

### Step 4: Build and Run Backend

```bash
cd /root/dbforge/backend

# Build
./mvnw clean package -DskipTests

# Run as background service
nohup java -jar target/dbforge-0.0.1-SNAPSHOT.jar > ../logs/backend.log 2>&1 &

# Or use systemd service (recommended)
```

#### Create systemd service:

```bash
sudo nano /etc/systemd/system/dbforge-backend.service
```

```ini
[Unit]
Description=DBForge Backend
After=network.target mysql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/dbforge/backend
ExecStart=/usr/bin/java -jar /root/dbforge/backend/target/dbforge-0.0.1-SNAPSHOT.jar
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start dbforge-backend
sudo systemctl enable dbforge-backend
sudo systemctl status dbforge-backend
```

### Step 5: Build and Deploy Frontend

```bash
cd /root/dbforge/frontend

# Install dependencies
npm install

# Build for production
npm run build

# Configure nginx
sudo nano /etc/nginx/sites-available/dbforge
```

```nginx
server {
    listen 80;
    server_name dbforge.dev www.dbforge.dev;
    
    root /root/dbforge/frontend/dist;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API proxy
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/dbforge /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Configure Firewall

```bash
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow database ports
sudo ufw allow 5432:5531/tcp    # PostgreSQL
sudo ufw allow 3306:3505/tcp    # MySQL/MariaDB
sudo ufw allow 27017:27116/tcp  # MongoDB
sudo ufw allow 6379:6478/tcp    # Redis

# Allow SSH (if not already)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

### Step 7: Setup SSL (Optional but Recommended)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Get certificate
sudo certbot --nginx -d dbforge.dev -d www.dbforge.dev

# Auto-renewal is configured automatically
```

## Local Development Setup

### Backend

```bash
cd dbforge/backend
./mvnw spring-boot:run
```

Runs on `http://localhost:8080`

### Frontend

```bash
cd dbforge/frontend
npm run dev
```

Runs on `http://localhost:5173`

## VS Code Remote Development

1. Install "Remote - SSH" extension
2. Connect to VPS: `Cmd+Shift+P` → "Remote-SSH: Connect to Host"
3. Add: `root@YOUR_VPS_IP`
4. Open folder: `/root/dbforge`
5. Code directly on VPS!

## Monitoring

### View Backend Logs

```bash
# If using systemd
sudo journalctl -u dbforge-backend -f

# If using nohup
tail -f /root/dbforge/logs/backend.log
```

### View Nginx Logs

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Check Docker Containers

```bash
docker ps
docker logs <container_name>
```

## Troubleshooting

### Backend won't start
- Check MySQL connection
- Verify Java version: `java -version`
- Check logs: `journalctl -u dbforge-backend`

### Can't connect to databases
- Verify firewall rules
- Check Docker container bindings: `docker ps`
- Test port: `nc -zv YOUR_VPS_IP 3306`

### Frontend shows 404
- Check nginx config: `nginx -t`
- Verify dist/ folder exists
- Check nginx error logs

## Backup

```bash
# Database backup
mysqldump -u root -p dbforge > dbforge_backup_$(date +%F).sql

# Full project backup
tar -czf dbforge_backup_$(date +%F).tar.gz /root/dbforge
```

## Updating

```bash
# Pull latest changes
cd /root/dbforge
git pull

# Rebuild backend
cd backend
./mvnw clean package -DskipTests
sudo systemctl restart dbforge-backend

# Rebuild frontend
cd ../frontend
npm install
npm run build
```
