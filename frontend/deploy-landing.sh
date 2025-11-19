#!/bin/bash

echo "🚀 Building DBForge Landing Page..."

# Build the frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build complete!"

# VPS details
VPS_USER="dbforge"
VPS_HOST="192.168.0.107"
VPS_DIR="/var/www/dbforge.dev"

echo "📦 Deploying to VPS..."

# Create directory on VPS if it doesn't exist
echo "1312" | sshpass -p "1312" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} "sudo -S mkdir -p ${VPS_DIR} && sudo -S chown -R ${VPS_USER}:${VPS_USER} ${VPS_DIR}"

# Upload built files
sshpass -p "1312" rsync -avz --delete ./dist/ ${VPS_USER}@${VPS_HOST}:${VPS_DIR}/

echo "⚙️  Configuring nginx..."

# Upload nginx config
sshpass -p "1312" scp -o StrictHostKeyChecking=no ./nginx-landing.conf ${VPS_USER}@${VPS_HOST}:/tmp/

# Setup nginx on VPS
echo "1312" | sshpass -p "1312" ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS_HOST} << 'EOF'
    # Move nginx config
    sudo -S mv /tmp/nginx-landing.conf /etc/nginx/sites-available/dbforge.dev
    
    # Enable site
    sudo -S ln -sf /etc/nginx/sites-available/dbforge.dev /etc/nginx/sites-enabled/
    
    # Remove default site if exists
    sudo -S rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx config
    sudo -S nginx -t
    
    # Reload nginx
    sudo -S systemctl reload nginx
    
    # Ensure nginx is running
    sudo -S systemctl enable nginx
    sudo -S systemctl restart nginx
EOF

echo "✅ Deployment complete!"
echo "🌐 Your site should be live at http://192.168.0.107 (local)"
echo ""
echo "📝 Next steps:"
echo "   1. Configure router port forwarding (ports 80, 443) to 192.168.0.107"
echo "   2. Point your Namecheap DNS A record to: 79.100.101.80"
echo "   3. Wait for DNS propagation (5-30 minutes)"
echo "   4. Install SSL certificate (after DNS works):"
echo "      ssh dbforge@192.168.0.107"
echo "      sudo apt install certbot python3-certbot-nginx -y"
echo "      sudo certbot --nginx -d dbforge.dev -d www.dbforge.dev"
