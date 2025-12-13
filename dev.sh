#!/bin/bash
# Development script with hot reload

echo "Starting ReactiveDash Development Server..."
echo ""

# Navigate to script directory (project root)
cd "$(dirname "$0")" || exit 1

echo "Building client..."
(
  cd client || exit 1
  npm install || exit 1
  npm run build || exit 1
)

echo ""
echo "Starting server with hot reload..."
echo "Ingress URL: /api/hassio/app"
echo "Direct URL: http://localhost:3000"
echo ""
echo "Edit files in client/src and they will trigger a reload!"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install || exit 1
fi

NODE_ENV=development node server.js

