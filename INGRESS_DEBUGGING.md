# ReactiveDash Ingress Debugging Guide

## Problem: "Ingress is failing to accept updates from all my pages"

### Root Causes Fixed

1. **API Proxy Incomplete** ✅
   - Server was not properly handling request bodies for POST requests
   - Missing proper error logging and response headers
   - **Fix**: Enhanced `/api/ha/*` proxy with proper body handling and CORS headers

2. **Incorrect HA API Endpoints** ✅
   - Client was calling `/api/ha/lights`, `/api/ha/climate` which don't exist
   - Home Assistant's actual endpoints are `/api/states` and `/api/services`
   - **Fix**: Updated `haService.js` to use correct HA API paths

3. **Incomplete State Management** ✅
   - Light toggle, brightness, climate, and security updates weren't being persisted
   - **Fix**: Service calls now properly route to Home Assistant `/services/` endpoints

---

## How the Fixed Flow Works

```
React Page (LightsPage, ClimatePage, etc.)
    ↓
haService.callService() [e.g., light.turn_on]
    ↓
fetch(`/api/ha/services/light/turn_on`) [POST with entity_id, brightness]
    ↓
server.js /api/ha/* proxy
    ↓
HTTP POST to homeassistant.local:8123/api/services/light/turn_on
    ↓
Home Assistant updates entity state
    ↓
Client polls /api/ha/states → refreshes UI
```

---

## Testing the Ingress Integration

### 1. **Check Server Logging**

The server now logs all HA API calls:

```
[HA PROXY] POST /services/light/turn_on -> http://homeassistant.local:8123/services/light/turn_on
[HA RESPONSE] 200 for /services/light/turn_on
[HA API] POST /services/light/turn_on {"entity_id":"light.living_room_main_lights"...}
```

Start server in development mode to see logs:
```bash
npm run dev  # From project root
# or
npm --prefix client run build && node server.js
```

### 2. **Browser Network Tab Debugging**

1. Open Home Assistant → Settings → Add-ons → ReactiveDash → Open
2. Press **F12** to open DevTools
3. Go to **Network** tab
4. Toggle a light in the UI
5. Look for requests to `/api/hassio/app/api/ha/services/light/turn_on`
   - **Status should be 200-201**, not 4xx/5xx
   - **Response should be JSON array** of triggered states

### 3. **Check Response Headers**

The proxy now sets CORS headers for ingress compatibility:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type
Content-Type: application/json
```

### 4. **Console Errors to Watch For**

- `"Service call failed: 401"` → HA_TOKEN is invalid
- `"Service call error: Failed to fetch"` → Network/proxy issue
- `"Home Assistant API unavailable"` → Server can't reach homeassistant:8123

---

## File Changes Made

### `server.js`
**Enhanced `/api/ha/*` proxy with:**
- Proper request body handling (collects data before forwarding)
- Better error logging with endpoints shown
- CORS headers for ingress compatibility
- Response status code preservation
- Content-type detection

### `client/src/services/haService.js`
**Updated API methods:**
- `getLights()` → fetches `/api/states` and filters for `light.*` and `switch.*` entities
- `getClimateDevices()` → fetches `/api/states` and filters for `climate.*` entities
- `callService()` → uses correct `/services/{domain}/{service}` endpoint
- Added `turnOnSwitch()` and `turnOffSwitch()` for switch entities
- Added logging for API calls with `[HA API]` prefix

---

## Configuration Validation

### Home Assistant Token
The server uses `HA_TOKEN` from environment or a default fallback. In production (add-on), this should come from Home Assistant supervisor:

```javascript
const HA_TOKEN = process.env.HA_TOKEN || 'default-token';
```

**To verify token is correct:**
```bash
# Inside Home Assistant container
echo $HA_TOKEN
```

### Home Assistant Host/Port
```javascript
const HA_HOST = process.env.HA_HOST || 'homeassistant.local';  // Correct for Docker network
const HA_PORT = process.env.HA_PORT || 8123;
```

For add-ons running inside HA Docker network, `homeassistant.local` resolves correctly.

---

## Troubleshooting Checklist

### 🔴 Pages load but buttons don't update anything

**Check:**
1. Open DevTools → Network tab
2. Toggle a light
3. Look for POST request to `/api/hassio/app/api/ha/services/light/turn_on`
   - If missing: React isn't calling the service
   - If 502: Server can't reach HA
   - If 401: Token is invalid
   - If 200 but no update: Entity ID is wrong

**Fix:**
- Verify light entity IDs are correct in `App.jsx`
- Check HA token is valid
- Ensure HA is running at `homeassistant.local:8123`

### 🔴 "Home Assistant API unavailable" error

**Check:**
1. From server terminal: `ping homeassistant.local` (in Docker)
2. Verify `HA_HOST` and `HA_PORT` in `server.js`
3. Check Home Assistant is running

**Fix:**
- In add-on container, use `homeassistant.local` (Docker DNS alias)
- In local dev, might need `192.168.x.x:8123` or `localhost:8123`

### 🔴 401 Unauthorized errors

**Check:**
1. Verify `HA_TOKEN` in `server.js` is correct
2. Token should be a long JWT-like string (not entity IDs)

**Fix:**
```bash
# Copy from Home Assistant Settings → Developer Tools → Rest Call
# Should look like: eyJ...a.eyJ...b.WZj...
```

### 🔴 Ingress shows blank page or 404

**Check:**
1. App built: Files exist in `Z:\addons\local\reactivedash\client\dist\`
2. Ingress path handling: Look for `[Request: /api/hassio/app/...]` in server logs

**Fix:**
- Rebuild: `npm run build` in client folder
- Deploy: Files auto-deploy to add-on folder
- Restart add-on in HA

---

## Performance Optimization

The polling approach (fetching state every 5 seconds) is functional but not ideal. For production, consider:

1. **WebSocket State Updates** - Home Assistant WebSocket API for real-time updates
2. **Event Subscriptions** - Subscribe to `state_changed` events
3. **Caching** - Reduce redundant `/api/states` calls

Current bottleneck: Each page refresh fetches ALL entity states. This works for small setups but scales poorly.

---

## Key API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/states` | GET | Fetch all entity states |
| `/api/states/{entity_id}` | GET | Fetch single entity state |
| `/api/services/{domain}/{service}` | POST | Call a service (turn light on, etc.) |
| `/api/config` | GET | Get Home Assistant config |

All proxied through `/api/ha/*` prefix on the dashboard server.

---

## Next Steps

1. **Restart the add-on** in Home Assistant Settings → Add-ons
2. **Open dashboard** at `/api/hassio/app/`
3. **Toggle a light** and watch DevTools Network tab
4. **Check server logs** (add-on details in Settings → Add-ons)
5. **Compare response** with expected 200 status and entity state JSON

If still failing, collect:
- Server error logs
- Browser console errors (F12)
- Network request/response bodies
- HA token validity
