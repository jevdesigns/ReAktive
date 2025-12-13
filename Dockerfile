ARG BUILD_FROM=ghcr.io/home-assistant/aarch64-base:latest
FROM $BUILD_FROM

# Install NGINX and build tools
RUN apk add --no-cache nginx nodejs npm

# Create NGINX directories
RUN mkdir -p /var/log/nginx /var/cache/nginx /tmp/nginx
RUN chown -R nginx:nginx /var/log/nginx /var/cache/nginx /tmp/nginx

# Create app directory
WORKDIR /app

# Copy pre-built client files
COPY client/dist ./client/dist

# Build client if not pre-built (for development)
RUN if [ ! -d "./client/dist" ]; then \
        mkdir -p client && \
        echo '{"name":"client","version":"1.0.0","scripts":{"build":"echo Build client first"}}' > client/package.json && \
        npm run build; \
    fi

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy startup script
COPY run.sh /

# Make startup script executable
RUN chmod +x /run.sh

EXPOSE 3000

CMD ["/run.sh"]
RUN chmod +x /run.sh

EXPOSE 3000

ENTRYPOINT ["/run.sh"]
