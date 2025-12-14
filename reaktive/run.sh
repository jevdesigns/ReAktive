#!/usr/bin/env bashio
# shellcheck shell=bash

bashio::log.info "Starting ReAktive with NGINX..."

# Create NGINX runtime directories if they don't exist
mkdir -p /var/run/nginx /var/log/nginx /var/cache/nginx
chown -R nginx:nginx /var/run/nginx /var/log/nginx /var/cache/nginx

# Substitute environment variables in NGINX config
envsubst '${SUPERVISOR_TOKEN}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

# Start NGINX
bashio::log.info "Starting NGINX server on port 3000..."
exec nginx -g "daemon off;"
