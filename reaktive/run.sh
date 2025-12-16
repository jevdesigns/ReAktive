#!/usr/bin/env bashio
# shellcheck shell=bash

bashio::log.info "Starting ReAktive with NGINX..."

# Create NGINX runtime directories if they don't exist
mkdir -p /var/run/nginx /var/log/nginx /var/cache/nginx
chown -R nginx:nginx /var/run/nginx /var/log/nginx /var/cache/nginx

# Log the nginx.conf for debugging (after substitution)
bashio::log.info "Substituting environment variables into nginx.conf..."
if ! envsubst '\${SUPERVISOR_TOKEN}' < /etc/nginx/nginx.conf > /etc/nginx/nginx.conf.tmp; then
	bashio::log.error "envsubst failed - missing gettext/envsubst in image"
	tail -n +1 /etc/nginx/nginx.conf || true
	exit 1
fi
mv /etc/nginx/nginx.conf.tmp /etc/nginx/nginx.conf

bashio::log.info "Testing NGINX configuration..."
nginx -t
NGINX_TEST=$?
if [ $NGINX_TEST -ne 0 ]; then
	bashio::log.error "nginx configuration test failed (exit $NGINX_TEST). Showing error log:"
	tail -n 200 /var/log/nginx/error.log || true
	exit $NGINX_TEST
fi

# Start NGINX in foreground
bashio::log.info "Starting NGINX server on port 3000..."
exec nginx -g "daemon off;"
