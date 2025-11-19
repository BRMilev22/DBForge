#!/bin/bash
# DBForge VPS Deployment Script

echo "🚀 Deploying DBForge to VPS..."

# Configuration
VPS_HOST="dbforge@192.168.0.107"
VPS_APP_DIR="/opt/dbforge"
JAR_FILE="target/dbforge-0.0.1-SNAPSHOT.jar"
PROD_CONFIG="application-prod.properties"

# Create directory on VPS
echo "📁 Creating application directory..."
ssh $VPS_HOST "sudo mkdir -p $VPS_APP_DIR && sudo chown dbforge:dbforge $VPS_APP_DIR"

# Copy JAR and config
echo "📦 Copying application files..."
scp $JAR_FILE $VPS_HOST:$VPS_APP_DIR/dbforge.jar
scp $PROD_CONFIG $VPS_HOST:$VPS_APP_DIR/application.properties

# Create systemd service
echo "⚙️  Creating systemd service..."
ssh $VPS_HOST "sudo tee /etc/systemd/system/dbforge.service > /dev/null << 'EOF'
[Unit]
Description=DBForge Database Provisioning Service
After=network.target mysql.service docker.service

[Service]
Type=simple
User=dbforge
WorkingDirectory=/opt/dbforge
ExecStart=/usr/bin/java -jar /opt/dbforge/dbforge.jar --spring.config.location=/opt/dbforge/application.properties
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/dbforge/app.log
StandardError=append:/var/log/dbforge/error.log

# Environment
Environment="JAVA_OPTS=-Xmx512m -Xms256m"

[Install]
WantedBy=multi-user.target
EOF"

# Create log directory
echo "📝 Setting up logging..."
ssh $VPS_HOST "sudo mkdir -p /var/log/dbforge && sudo chown dbforge:dbforge /var/log/dbforge"

# Reload systemd and enable service
echo "🔄 Enabling service..."
ssh $VPS_HOST "sudo systemctl daemon-reload && sudo systemctl enable dbforge"

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To start the service:"
echo "  ssh $VPS_HOST 'sudo systemctl start dbforge'"
echo ""
echo "To check status:"
echo "  ssh $VPS_HOST 'sudo systemctl status dbforge'"
echo ""
echo "To view logs:"
echo "  ssh $VPS_HOST 'tail -f /var/log/dbforge/app.log'"
