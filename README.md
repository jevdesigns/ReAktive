# ReAktive

A HomeKit-inspired Home Assistant add-on with a beautiful glassmorphism dashboard built with React and NGINX.

## Features

- **Real-time WebSocket Updates**: Instant entity state changes
- **Dynamic Entity Discovery**: Automatically discovers all Home Assistant entities
- **Glassmorphism Design**: Modern HomeKit-inspired UI with blur effects
- **NGINX Performance**: Fast, lightweight web server (~10MB memory usage)
- **Direct Port Access**: No ingress complexity, accessible at port 3000
- **Responsive Layout**: Works on desktop, tablet, and mobile devices
- **Easy Customization**: Edit React components and auto-sync changes

## Installation

### In Home Assistant

1. Go to **Settings → Add-ons → Add-on Store**
2. Click the **three dots (⋮)** → **Check for updates**
3. Scroll down to **Local add-ons**
4. Find **ReAktive** and click **Install**
5. Once installed, click **Start**
6. Access the dashboard at **http://homeassistant.local:3000**

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
