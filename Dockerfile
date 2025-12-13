ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

RUN apk add --no-cache nodejs npm

WORKDIR /app

# Copy pre-built client files
COPY client/dist ./client/dist

# Copy server files
COPY server.js ./
COPY package.json ./
COPY package-lock.json* ./

# Install production dependencies
RUN npm ci --only=production || npm install --production

# Copy startup script
COPY run.sh /
RUN chmod +x /run.sh

EXPOSE 3000

ENTRYPOINT ["/run.sh"]
