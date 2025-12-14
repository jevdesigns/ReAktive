# ReAktive Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Development](#development)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Overview

ReAktive is a modern Home Assistant dashboard add-on that provides:

- **Real-time Updates**: WebSocket connection for instant state changes
- **Dynamic Discovery**: Automatically finds all HA entities
- **High Performance**: NGINX-powered with minimal resource usage
- **Modern UI**: Glassmorphism design with responsive layout

### Key Specifications

| Feature | Value |
|---------|-------|
| Memory Usage | ~10MB |
| Startup Time | ~1 second |
| Port | 3000 (TCP) |
| Architecture | React 18 + NGINX |
| Supported Platforms | aarch64, amd64, armhf, armv7, i386 |

---

## Architecture

### System Components

```
┌─────────────────────────────────────────┐
│         Browser (Client)                │
│  ┌──────────────────────────────────┐   │
│  │  React 18 SPA                    │   │
│  │  - Tailwind CSS                  │   │
│  │  - WebSocket Client              │   │
│  │  - HA Service Integration        │   │
│  └──────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │ HTTP/WebSocket
                  │
┌─────────────────┴───────────────────────┐
│         NGINX Web Server                │
│  ┌──────────────────────────────────┐   │
│  │  Static File Serving             │   │
│  │  Reverse Proxy to HA             │   │
│  │  WebSocket Proxy                 │   │
│  │  CORS & Security Headers         │   │
│  └──────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────┴───────────────────────┐
│      Home Assistant Core                │
│  - REST API                             │
│  - WebSocket API                        │
│  - Supervisor Token Auth                │
└─────────────────────────────────────────┘
```

### Frontend Architecture

- **Framework**: React 18 with functional components and hooks
- **Routing**: React Router for SPA navigation
- **State Management**: React hooks (useState, useEffect, useContext)
- **Styling**: Tailwind CSS utility classes
- **Build Tool**: Vite for fast development and optimized production builds

### Backend Architecture

- **Web Server**: NGINX (Alpine Linux)
- **Proxy**: Reverse proxy to Home Assistant API
- **WebSocket**: Upgrade connections for real-time updates
- **Authentication**: SUPERVISOR_TOKEN environment variable

---

## Installation

See [README.md](README.md#installation) for detailed installation instructions.

---

## Configuration

### Add-on Configuration

ReAktive requires no user configuration. It automatically:

- Connects to Home Assistant using the supervisor token
- Discovers available entities
- Sets up WebSocket connections
- Configures NGINX reverse proxy

### Environment Variables (Automatic)

| Variable | Source | Purpose |
|----------|--------|--------|
| `SUPERVISOR_TOKEN` | Home Assistant | API authentication |
| `HASSIO_TOKEN` | Home Assistant | Alternative token name |

### NGINX Configuration

The NGINX configuration (`nginx.conf`) provides:

- **Static file serving** from `/app/client/dist`
- **Reverse proxy** to `http://supervisor/core` for HA API
- **WebSocket upgrade** for real-time connections
- **CORS headers** for cross-origin requests
- **Security headers** (X-Frame-Options, X-Content-Type-Options)

---

## Usage

### Accessing the Dashboard

1. Ensure the add-on is started in Home Assistant
2. Navigate to: `http://homeassistant.local:3000`
3. Or use your HA IP: `http://192.168.1.xxx:3000`

### Dashboard Features

#### Home Page
- Overview dashboard with interactive tiles
- Quick access to all sections
- Real-time entity status

#### Lights Page
- Control all light entities
- Adjust brightness
- Toggle on/off states
- Color temperature control (if supported)

#### Climate Page
- View and control thermostats
- Adjust temperature setpoints
- Change HVAC modes
- Monitor current temperature

#### Security Page
- Monitor security sensors
- View camera feeds (if configured)
- Control locks
- Arm/disarm alarm systems

#### Settings Page
- Application preferences
- Theme customization
- Entity selection

---

## Development

### Local Development Setup

1. **Prerequisites**:
   ```powershell
   # Node.js 18+ and npm
   node --version
   npm --version
   ```

2. **Install Dependencies**:
   ```powershell
   cd client
   npm install
   ```

3. **Development Mode**:
   ```powershell
   npm run dev
   ```
   Access at `http://localhost:5173`

4. **Build for Production**:
   ```powershell
   npm run build
   ```

### File Structure

```
ReAktive/
├── config.yaml          # HA add-on configuration
├── Dockerfile           # Container build
├── nginx.conf           # NGINX configuration
├── run.sh              # Startup script
├── deploy_to_z.ps1     # Deployment automation
└── client/
    ├── src/
    │   ├── App.jsx              # Main app component
    │   ├── main.jsx             # React entry point
    │   ├── index.css            # Global styles
    │   ├── components/          # Reusable components
    │   │   ├── Card.jsx
    │   │   ├── DashboardTile.jsx
    │   │   ├── ErrorBoundary.jsx
    │   │   ├── Modal.jsx
    │   │   ├── Sidebar.jsx
    │   │   └── Slider.jsx
    │   ├── pages/               # Page components
    │   │   ├── HomePage.jsx
    │   │   ├── LightsPage.jsx
    │   │   ├── ClimatePage.jsx
    │   │   ├── SecurityPage.jsx
    │   │   └── SettingsPage.jsx
    │   └── services/            # API services
    │       ├── haService.js
    │       └── weatherService.js
    └── dist/                    # Built files (generated)
```

### Deployment

```powershell
# Deploy to local Z: drive
.\deploy_to_z.ps1

# Deploy remotely with authentication
.\deploy_to_z.ps1 -Remote

# Deploy to custom host
.\deploy_to_z.ps1 -HAHost 192.168.1.100
```

---

## Troubleshooting

### Add-on Won't Start

**Symptoms**: Add-on shows as stopped or crashes immediately

**Solutions**:
1. Check add-on logs:
   - Settings → Add-ons → ReAktive → Log
2. Verify port 3000 is available:
   ```bash
   netstat -an | grep 3000
   ```
3. Rebuild the add-on:
   - Uninstall and reinstall
4. Check Home Assistant supervisor logs

### Dashboard Not Loading

**Symptoms**: Blank page or connection error

**Solutions**:
1. Verify add-on is running
2. Check browser console (F12) for errors
3. Clear browser cache:
   - Ctrl+Shift+Delete → Clear cached images and files
4. Try incognito/private mode
5. Verify network connectivity:
   ```powershell
   ping homeassistant.local
   ```

### WebSocket Connection Failed

**Symptoms**: "WebSocket connection failed" in console

**Solutions**:
1. Check NGINX is proxying WebSocket correctly
2. Verify Home Assistant API is accessible
3. Check firewall settings
4. Review NGINX logs in add-on

### Entities Not Showing

**Symptoms**: No entities appear in dashboard

**Solutions**:
1. Verify Home Assistant API is accessible:
   ```bash
   curl http://supervisor/core/api/states
   ```
2. Check browser console for API errors
3. Verify SUPERVISOR_TOKEN is set correctly
4. Check Home Assistant entity availability

### Can't Control Devices

**Symptoms**: Switches/lights don't respond to controls

**Solutions**:
1. Check Home Assistant service calls are working
2. Verify entity permissions
3. Check browser console for API errors
4. Test entities in Home Assistant UI
5. Verify authentication token has proper permissions

### Build Errors

**Symptoms**: Docker build fails

**Solutions**:
1. Ensure client files are built:
   ```powershell
   cd client
   npm run build
   ```
2. Verify `client/dist/` exists and has files
3. Check Dockerfile syntax
4. Review Home Assistant supervisor logs

---

## API Reference

### Home Assistant Service

Location: `client/src/services/haService.js`

#### Methods

##### `getStates()`
Fetch all entity states from Home Assistant.

**Returns**: `Promise<Array>` - Array of entity objects

**Example**:
```javascript
import haService from './services/haService';

const entities = await haService.getStates();
```

##### `callService(domain, service, entityId, data)`
Call a Home Assistant service.

**Parameters**:
- `domain` (string): Entity domain (e.g., 'light', 'switch')
- `service` (string): Service name (e.g., 'turn_on', 'turn_off')
- `entityId` (string): Target entity ID
- `data` (object): Additional service data

**Example**:
```javascript
await haService.callService('light', 'turn_on', 'light.living_room', {
  brightness: 255
});
```

##### `connectWebSocket(onMessage, onError)`
Connect to Home Assistant WebSocket API.

**Parameters**:
- `onMessage` (function): Callback for WebSocket messages
- `onError` (function): Callback for errors

**Returns**: WebSocket instance

**Example**:
```javascript
const ws = haService.connectWebSocket(
  (message) => console.log('Received:', message),
  (error) => console.error('Error:', error)
);
```

---

## Performance Optimization

### Resource Usage

- **Memory**: ~10MB steady state
- **CPU**: < 1% idle, < 5% during updates
- **Network**: Minimal, only state changes
- **Storage**: ~2MB total

### Optimization Tips

1. **Limit entity queries**: Only fetch entities you need
2. **Debounce updates**: Use WebSocket selectively
3. **Lazy load pages**: Use React.lazy for code splitting
4. **Optimize images**: Compress and use modern formats
5. **Cache static assets**: NGINX handles this automatically

---

## Security

### Authentication

- Uses Home Assistant supervisor token
- No external authentication required
- Token automatically injected by HA

### Network Security

- NGINX configured with security headers
- CORS enabled for HA API
- No external network access required
- Runs on local network only

### Best Practices

1. Keep Home Assistant updated
2. Use HTTPS if exposing externally
3. Don't share supervisor tokens
4. Review add-on logs regularly
5. Monitor network traffic

---

## Support

- **Issues**: https://github.com/jevdesigns/ReAktive/issues
- **Discussions**: https://github.com/jevdesigns/ReAktive/discussions
- **Documentation**: This file and README.md

---

## License

MIT License - See LICENSE file for details
