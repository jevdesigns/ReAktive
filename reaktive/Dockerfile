ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

# Install NGINX and build tools (node and build dependencies for client build)
RUN apk add --no-cache nginx nodejs npm gettext build-base python3

# Create NGINX directories
RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx
RUN chown -R nginx:nginx /var/log/nginx /var/cache/nginx /tmp/nginx

# Create app directory
WORKDIR /app

# Copy client source (includes dist when pre-built). If dist isn't present, we'll build it.
COPY client/ ./client/

# Build client if dist is not present
RUN if [ ! -d "./client/dist" ]; then \
        cd client && \
        if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi && \
        npm run build --silent; \
    fi

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY run.sh /

# Make startup script executable
RUN chmod +x /run.sh

EXPOSE 3000

CMD ["/run.sh"]
