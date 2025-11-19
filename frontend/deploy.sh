#!/bin/bash

# DBForge Frontend Deployment Script
# This script builds and deploys the frontend to the VPS

set -e

echo "🚀 DBForge Frontend Deployment"
echo "================================"

# Configuration
VPS_USER="root"
VPS_HOST="your-vps-ip"
VPS_PATH="/var/www/dbforge"
API_URL="http://$VPS_HOST:8080/api"

# Check if .env.production exists, create if not
if [ ! -f .env.production ]; then
    echo "Creating .env.production..."
    echo "VITE_API_URL=$API_URL" > .env.production
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build for production
echo "🏗️  Building for production..."
npm run build

# Create deployment directory on VPS if it doesn't exist
echo "📁 Creating directory on VPS..."
ssh $VPS_USER@$VPS_HOST "mkdir -p $VPS_PATH"

# Upload files
echo "📤 Uploading files to VPS..."
scp -r dist/* $VPS_USER@$VPS_HOST:$VPS_PATH/

# Upload nginx configuration (optional)
echo "📝 Uploading nginx configuration..."
scp nginx.conf $VPS_USER@$VPS_HOST:/tmp/dbforge-nginx.conf
echo "⚠️  Remember to move /tmp/dbforge-nginx.conf to /etc/nginx/sites-available/"

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. SSH to your VPS: ssh $VPS_USER@$VPS_HOST"
echo "2. Configure Nginx:"
echo "   sudo mv /tmp/dbforge-nginx.conf /etc/nginx/sites-available/dbforge"
echo "   sudo ln -s /etc/nginx/sites-available/dbforge /etc/nginx/sites-enabled/"
echo "   sudo nginx -t"
echo "   sudo systemctl reload nginx"
echo "3. Visit http://$VPS_HOST"
