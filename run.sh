#!/usr/bin/env bashio
# shellcheck shell=bash

bashio::log.info "Starting My Custom Dashboard..."

# Fail fast if /app is missing to avoid silent errors
cd /app || exit 1

exec node server.js
