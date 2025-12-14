# ReAktive Development Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Git** for version control
- **PowerShell** (Windows) or **Bash** (Linux/Mac)
- **Home Assistant** instance (for testing)

### Initial Setup

1. **Clone the repository**:
   ```powershell
   git clone https://github.com/jevdesigns/ReAktive.git
   cd ReAktive
   ```

2. **Install dependencies**:
   ```powershell
   cd client
   npm install
   ```

3. **Build the client**:
   ```powershell
   npm run build
   ```

## 🛠️ Development Workflow

### Local Development

**Start development server**:
```powershell
cd client
npm run dev
```

Access at `http://localhost:5173` with hot module replacement (HMR).

### Building for Production

**Build optimized bundle**:
```powershell
cd client
npm run build
```

Output directory: `client/dist/`

### Deployment

**Deploy to Home Assistant**:
```powershell
# Local (Z: drive mapped)
.\deploy_to_z.ps1

# Remote deployment
.\deploy_to_z.ps1 -Remote

# Custom host
.\deploy_to_z.ps1 -HAHost 192.168.1.100
```
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
