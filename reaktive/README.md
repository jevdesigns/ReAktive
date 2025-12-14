# ReAktive

<p align="center">
  <img src="https://img.shields.io/badge/version-1.0.0-blue.svg" alt="Version">
  <img src="https://img.shields.io/badge/Home%20Assistant-Add--on-41BDF5.svg" alt="Home Assistant">
  <img src="https://img.shields.io/badge/NGINX-Powered-009639.svg" alt="NGINX">
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg" alt="React">
</p>

A modern, high-performance Home Assistant dashboard add-on built with React and powered by NGINX. Features real-time WebSocket updates, dynamic entity discovery, and a beautiful glassmorphism UI.

## ✨ Features

### Performance
- **🚀 NGINX Web Server**: Lightning-fast static file serving (~10MB memory)
- **⚡ Fast Startup**: ~1 second boot time
- **📊 Low Resource Usage**: Optimized for Raspberry Pi and similar hardware
- **🔄 Real-time Updates**: WebSocket integration for instant entity state changes

### User Experience
- **🎨 Glassmorphism Design**: Modern HomeKit-inspired UI with blur effects
- **📱 Responsive Layout**: Works seamlessly on desktop, tablet, and mobile
- **🔍 Dynamic Discovery**: Automatically finds all Home Assistant entities
- **🛡️ Error Boundaries**: Graceful failure handling for stability

### Integration
- **🔌 Direct Port Access**: Simple port 3000 access (no ingress complexity)
- **🏠 Home Assistant Native**: Supervisor token authentication
- **🌐 Multi-Architecture**: Supports aarch64, amd64, armhf, armv7, i386

## 📦 Installation

### Method 1: Remote Deployment (Recommended)

1. Clone this repository:
   ```powershell
   git clone https://github.com/jevdesigns/ReAktive.git
   cd ReAktive
   ```

2. Deploy to your Home Assistant:
   ```powershell
   .\deploy_to_z.ps1 -Remote
   ```

3. In Home Assistant:
   - Go to **Settings → Add-ons**
   - Click **"Check for updates"**
   - Find **"ReAktive"** in Local add-ons
   - Click **Install** → **Start**

4. Access at **http://homeassistant.local:3000**

### Method 2: Manual Installation

1. Copy files to your Home Assistant:
   ```
   /addons/local/reaktive/
   ├── config.yaml
   ├── Dockerfile
   ├── nginx.conf
   ├── run.sh
   ├── README.md
   ├── CHANGELOG.md
   └── client/dist/
   ```

2. Follow steps 3-4 from Method 1

## Development

### Local Setup

```powershell
cd D:\HA\ReactiveWork
.\deploy.ps1  # Deploy to Home Assistant
```

### Watch Mode (Auto-sync)

Monitor `App.jsx` for changes and automatically sync to Home Assistant:

```powershell
.\watch-app.ps1
```

This watches the file `D:\HA\ReactiveWork\client\src\App.jsx` and syncs changes to the Home Assistant add-on whenever you save.

## File Structure

```
ReactiveWork/
├── config.yaml              # Add-on metadata and configuration
├── build.json              # Docker base image specifications
├── Dockerfile              # Container build instructions
├── server.js               # Node.js HTTP server
├── package.json            # Server dependencies
├── run.sh                  # Container startup script
├── deploy.ps1              # Deployment script
├── watch-app.ps1           # Auto-sync watcher
└── client/
    ├── index.html          # HTML entry point
    ├── package.json        # Frontend dependencies
    ├── vite.config.js      # Vite build configuration
    ├── tailwind.config.js  # Tailwind CSS configuration
    ├── postcss.config.js   # PostCSS configuration
    ├── src/
    │   ├── App.jsx         # Main dashboard component
    │   ├── main.jsx        # React entry point
    │   ├── index.css       # Global styles
    │   └── components/
    │       └── DashboardTile.jsx  # Reusable tile component
    └── dist/
        └── index.html      # Pre-built static frontend
```

## Customization

### Adding/Editing Tiles

Edit `D:\HA\ReactiveWork\client\src\App.jsx`:

```jsx
const [tiles, setTiles] = useState([
  {
    id: 'lights',
    name: 'Lights',
    icon: '💡',
    isActive: false,
    color: 'orange',
    value: 'Off'
  },
  // Add more tiles here...
])
```

### Connecting to Home Assistant Entities

Update `server.js` to fetch real data from Home Assistant:

```javascript
// Example: Fetch light state from Home Assistant
app.get('/api/lights', async (req, res) => {
  const response = await fetch('http://homeassistant.local:8123/api/states/light.living_room', {
    headers: { 'Authorization': `Bearer ${HA_TOKEN}` }
  });
  const data = await response.json();
  res.json({ state: data.state });
});
```

### Styling

- **Tailwind CSS**: Modify `client/tailwind.config.js` for colors and theme
- **Glass Effect**: Adjust blur and opacity in `client/src/index.css` (`.glass-tile` class)
- **Layout**: Edit grid columns in `client/src/App.jsx` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)

## Architecture

### Backend
- **Node.js HTTP Server** (no external dependencies)
- **Static File Serving**: Serves pre-built React app from `client/dist/`
- **API Endpoints**:
  - `GET /api/status` - Health check
  - `GET /api/token` - Returns Home Assistant authentication token
  - `GET /api/*` - Custom endpoints for your integrations

### Frontend
- **React 18**: Component-based UI
- **Vite**: Fast development and optimized builds
- **Tailwind CSS**: Utility-first styling
- **Glassmorphism**: Backdrop blur effects for modern aesthetics

### Deployment
- **Docker Container**: Alpine-based with minimal footprint
- **Home Assistant Ingress**: Runs on internal port 3000, no external exposure
- **Samba Share**: Deployed via network share to Raspberry Pi

## Deployment Path

- **Local Dev**: `D:\HA\ReactiveWork`
- **Remote Storage**: `\\192.168.1.243\addons\reactivedash`
- **Docker Build**: Uses `ghcr.io/home-assistant/aarch64-base:latest` (ARM64 Raspberry Pi)

## Troubleshooting

### Add-on won't install
1. Check Supervisor logs: Settings → System → Supervisor → System → View logs
2. Ensure all files are properly deployed: `.\deploy.ps1`
3. Restart Supervisor: Settings → System → Supervisor → Restart Supervisor

### Changes not appearing after edit
1. Ensure `.\watch-app.ps1` is running (if using auto-sync)
2. Manually redeploy: `.\deploy.ps1`
3. Restart the add-on in Home Assistant

### Dashboard shows blank page
1. Check browser console for errors (F12)
2. Verify `client/dist/index.html` exists
3. Check server logs in Home Assistant: Settings → Add-ons → ReactiveDash → Logs

## Token Management

The add-on includes a Home Assistant long-lived access token for secure communication:
- Token is stored in `server.js`
- Used for API calls to Home Assistant
- Keep it private and regenerate if exposed

## Performance

- **Build Time**: ~2 minutes (Docker build on Raspberry Pi)
- **Frontend Size**: ~5KB (pre-built static HTML)
- **Memory Usage**: ~30-50MB (Node.js server)
- **Network**: Optimized for local network (no external API calls needed)

## License

MIT

## Support

For issues or questions about development:
1. Check the troubleshooting section above
2. Review Home Assistant add-on logs
3. Verify file permissions on the Samba share
