# ReactiveDash Development Guide

## Quick Start

### Prerequisites
- Node.js installed
- npm packages installed: `npm install` in both root and client directories

### Development Mode

**On Windows (PowerShell):**
```powershell
.\dev.ps1
```

**On Linux/Mac:**
```bash
./dev.sh
```

This will:
1. Build the React client
2. Start the server with hot reload enabled
3. Watch for changes in `client/src/` directory

## How Hot Reload Works

When you edit and save any JSX file in `client/src/`, the server automatically:
1. Detects the file change
2. Sends a reload notification to the browser
3. Refreshes the page automatically

## Access Methods

### Direct Access (No Ingress)
```
http://localhost:3000
```

### Home Assistant Ingress
```
http://your-ha-ip:8123/api/hassio/app
```

## Pages to Edit

The following pages are set up for auto-reload:
- `App.jsx` - Main application layout
- `pages/ClimatePage.jsx` - Climate/Temperature controls
- `pages/LightsPage.jsx` - Lighting controls
- `pages/SecurityPage.jsx` - Security/Alarm system
- `pages/SettingsPage.jsx` - Application settings
- `pages/MediaPage.jsx` - Media controls (coming soon)

## Environment Variables

Set before running:
- `NODE_ENV=development` - Enables hot reload (automatic in dev scripts)
- `PORT=3000` - Server port (default: 3000)
- `HA_HOST=homeassistant.local` - Home Assistant hostname
- `HA_PORT=8123` - Home Assistant port
- `HA_TOKEN=...` - Home Assistant token (optional)

## Troubleshooting

### WebSocket Connection Failed
If you see "WebSocket connection failed" in console:
1. Check server is running
2. Verify `/ws/reload` endpoint is accessible
3. Check browser console for errors

### Changes Not Reloading
1. Verify files are in `client/src/`
2. Check that the file extension is `.jsx`
3. Restart the dev server

### Build Errors
Run manually:
```bash
npm run build --prefix client
```

## Production Build

```bash
npm run build --prefix client
# Then deploy with deploy.ps1
```
