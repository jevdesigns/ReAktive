# Changelog

All notable changes to ReAktive will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-13

### Added
- **NGINX Architecture**: Migrated from Node.js to NGINX for superior performance
- **Real-time Updates**: WebSocket integration for instant entity state changes
- **Dynamic Discovery**: Automatic detection of all Home Assistant entities
- **Error Boundaries**: React error boundaries for graceful failure handling
- **Multi-Architecture Support**: aarch64, amd64, armhf, armv7, i386
- **Dashboard Pages**:
  - Home dashboard with interactive tiles
  - Lights control page
  - Climate/HVAC control page
  - Security monitoring page
  - Settings page
- **Deployment Automation**:
  - PowerShell deployment script with remote support
  - Automatic authentication to Home Assistant
  - Smart path detection (local/remote)

### Changed
- **Configuration**: Renamed `addon.yaml` to `config.yaml` for HA compatibility
- **Architecture**: Removed Node.js server dependency
- **Port Access**: Removed ingress, using direct port 3000 access
- **Memory Usage**: Reduced from ~50MB to ~10MB
- **Startup Time**: Improved from ~5s to ~1s

### Technical Details
- **Frontend**: React 18 with Vite build system
- **Styling**: Tailwind CSS with glassmorphism effects
- **Web Server**: NGINX with reverse proxy configuration
- **API Integration**: Home Assistant REST API and WebSocket
- **Authentication**: SUPERVISOR_TOKEN environment variable
- **Build**: Docker multi-stage build optimized for size

### Documentation
- Added comprehensive README.md
- Added CHANGELOG.md (this file)
- Added DOCS.md with usage instructions
- Added HA_ADDON_VERIFICATION.md with requirements checklist
- Updated deployment guides

### Performance Metrics
- **Memory**: ~10MB (vs ~50MB Node.js)
- **Startup**: ~1s (vs ~5s Node.js)
- **Build Time**: ~1-2 minutes on Raspberry Pi
- **Client Bundle**: 171KB JS (53KB gzipped)

### Fixed
- Configuration file naming for Home Assistant detection
- Dockerfile optimization to remove duplicate commands
- Deployment script emoji encoding issues
- Path handling for cross-platform compatibility
