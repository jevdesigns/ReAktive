ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

# Install Node.js (no npm build needed - static files only)
RUN apk add --no-cache nodejs

WORKDIR /app

# Copy pre-built static files and server
COPY client/dist ./client/dist
COPY server.js ./
COPY package.json ./

# Copy startup script
COPY run.sh /
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]
