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

# Build then deploy (builds client first)
.\deploy_to_z.ps1 -BuildClient

# Remote via SMB (map to Y:)
.\deploy_to_z.ps1 -RemoteHost 192.168.1.100 -TargetPath 'Y:\addons\local\reaktive'

# Remote via SCP+SSH (sets run.sh executable with -SetExec)
.\deploy_to_z.ps1 -RemoteHost 10.0.0.5 -UseSCP -SSHUser root -TargetPath '/config/addons/local/reaktive' -SetExec -SSHKey C:\keys\id_rsa

# Dry run (preview actions without making changes)
.\deploy_to_z.ps1 -BuildClient -DryRun
```
3. Refreshes the page automatically

## Access Methods

### Direct Access (No Ingress)
```
http://localhost:3000
```

### Home Assistant Ingress (Open inside Home Assistant)

After you deploy the add-on to Home Assistant (`/config/addons/local/reaktive`) the Supervisor will build the add-on image.

1. In Home Assistant go to **Settings → Add-ons** (or **Supervisor → Add-on Store** on older UIs).
2. Find **ReAktive** in the local add-ons list and open it.
3. Click **Install** (if required) and then **Start**.
4. Use **Open Web UI** to launch the dashboard inside Home Assistant — this uses Supervisor Ingress.

Notes:
- If you prefer direct access (outside Ingress) the add-on still exposes port `3000` by default.
- Ingress is enabled in the add-on manifest (`reaktive/config.yaml`) so the dashboard will appear as an embedded tab in HA when opened via the Add-on UI.

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
