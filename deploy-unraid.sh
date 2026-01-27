#!/bin/bash
# Deploy The Regenerist to Unraid
# Run this script ON your Unraid server

set -e

APP_DIR="/mnt/user/appdata/regenerist"

echo "=== The Regenerist - Unraid Deployment ==="

# Check if running on Unraid
if [ ! -d "/mnt/user" ]; then
    echo "Error: This script should be run on Unraid"
    exit 1
fi

# Create directories
echo "Creating directories..."
mkdir -p "$APP_DIR/postgres_data"

# Check if project files exist
if [ ! -f "$APP_DIR/docker-compose.unraid.yml" ]; then
    echo "Error: Project files not found in $APP_DIR"
    echo "Please copy your project files first:"
    echo "  scp -r /path/to/dnd/* root@unraid-ip:$APP_DIR/"
    exit 1
fi

# Check for .env file
if [ ! -f "$APP_DIR/.env" ]; then
    echo ""
    echo "Creating .env file..."
    echo "Please edit $APP_DIR/.env with your AWS credentials!"
    cat > "$APP_DIR/.env" << 'EOF'
DATABASE_URL="postgresql://postgres:regenerist_password@regenerist-db:5432/regenerist"
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=CHANGE_ME
AWS_SECRET_ACCESS_KEY=CHANGE_ME
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-sonnet-20241022-v2:0
EOF
    echo ""
    echo "⚠️  IMPORTANT: Edit .env with your real AWS credentials:"
    echo "   nano $APP_DIR/.env"
    echo ""
fi

# Deploy with docker-compose
echo "Starting deployment..."
cd "$APP_DIR"

# Use the unraid-specific compose file
docker compose -f docker-compose.unraid.yml up -d --build

echo ""
echo "=== Deployment Complete ==="
echo "Access the app at: http://$(hostname -I | awk '{print $1}'):3080"
echo ""
echo "Useful commands:"
echo "  View logs:    docker logs -f regenerist-app"
echo "  Stop:         docker compose -f $APP_DIR/docker-compose.unraid.yml down"
echo "  Restart:      docker compose -f $APP_DIR/docker-compose.unraid.yml restart"
