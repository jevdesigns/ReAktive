ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

# Install Node.js
RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy pre-built static files and server
COPY client/dist ./client/dist
COPY server.js ./
COPY package.json ./

# Install dependencies (minimal - just what server.js needs)
RUN npm install --production

# Copy startup script
COPY run.sh /
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]
