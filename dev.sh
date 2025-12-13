#!/bin/bash
# Development script with hot reload

echo "Starting ReactiveDash Development Server..."
echo ""
echo "Building client..."
npm run build --prefix client

if [ $? -ne 0 ]; then
    echo "Build failed!"
    exit 1
fi

echo ""
echo "Starting server with hot reload..."
echo "Ingress URL: /api/hassio/app"
echo "Direct URL: http://localhost:3000"
echo ""
echo "Edit files in client/src and they will trigger a reload!"
echo ""

NODE_ENV=development node server.js
