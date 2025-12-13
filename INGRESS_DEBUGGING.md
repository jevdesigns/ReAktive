# ReactiveDash Ingress Debugging Guide

## 🔧 **FIXED: Core Ingress Issues**

### **Issue 1: Incorrect Server Path Handling** ❌→✅
**Problem**: Server was trying to handle `/api/hassio/app/` paths itself
**Root Cause**: Home Assistant strips the ingress prefix automatically
**Fix**: Simplified server to serve static files normally

### **Issue 2: Missing Ingress Configuration** ❌→✅
**Problem**: `addon.yaml` had no ingress settings
**Fix**: Added proper ingress configuration:
```yaml
ingress: true
ingress_port: 3000
ingress_entry: /
```

### **Issue 3: Wrong HA Connection** ❌→✅
**Problem**: Using `homeassistant.local` instead of `supervisor`
**Fix**: Updated defaults for add-on context:
- `HA_HOST: supervisor` (Docker network alias)
- `HA_TOKEN` from `SUPERVISOR_TOKEN` environment

---

## 🔍 **Current Status & Testing**

### **Expected Behavior After Fixes:**
1. **Add-on restart** → Docker rebuilds with ingress enabled
2. **Click "Open"** → Loads dashboard through HA's secure ingress
3. **API calls work** → `/api/ha/*` requests proxy to Home Assistant
4. **Pages load** → All 5 pages (Home, Lights, Climate, Security, Settings)

### **Debug Steps:**

#### **1. Check Add-on Logs**
```
Home Assistant → Settings → Add-ons → ReactiveDash → Logs
```
Look for:
- `[INGRESS] Request: /` (successful static file serving)
- `[HA PROXY] POST /services/light/turn_on` (API calls working)
- `[HA RESPONSE] 200` (successful HA API responses)

#### **2. Browser Network Tab**
1. Open dashboard via ingress
2. Press **F12** → **Network** tab
3. Toggle a light
4. Check for:
   - `200` status for `/api/ha/services/light/turn_on`
   - No CORS errors
   - Proper JSON responses

#### **3. Console Logs**
Check browser console for:
- `[HA API] POST /services/light/turn_on` (client-side logging)
- No fetch errors or network failures

---

## 🚨 **Common Issues & Solutions**

### **"Add-on won't start"**
**Check**: Add-on logs show Docker build errors
**Fix**: Ensure `addon.yaml` has correct `build:` section

### **"Blank page or 404"**
**Check**: Browser shows HA's default ingress page
**Fix**: Restart add-on after ingress config changes

### **"API calls fail (401/403)"**
**Check**: `[HA ERROR]` in add-on logs
**Fix**: Ensure `SUPERVISOR_TOKEN` is available (automatically provided by HA)

### **"API calls fail (502)"**
**Check**: Can't connect to `supervisor:8123`
**Fix**: Verify Home Assistant is running and accessible

### **"CORS errors"**
**Check**: Browser console shows CORS blocks
**Fix**: Shouldn't happen with ingress - content served from same domain

---

## 📋 **Configuration Verification**

### **addon.yaml (Critical)**
```yaml
ingress: true          # ✅ Enables ingress
ingress_port: 3000     # ✅ Internal port
ingress_entry: /       # ✅ Root path
auth_header: true      # ✅ Provides SUPERVISOR_TOKEN
build:                 # ✅ Docker build config
  dockerfile: Dockerfile
  context: .
  args:
    BUILD_FROM: ghcr.io/home-assistant/{arch}-base:latest
```

### **server.js (Critical)**
```javascript
const HA_HOST = process.env.HA_HOST || 'supervisor';    // ✅ Docker network
const HA_TOKEN = process.env.SUPERVISOR_TOKEN || '...'; // ✅ Auto-provided
// NO ingress path handling - HA does this automatically
```

### **Client (haService.js)**
```javascript
const HA_API_BASE = '/api/ha';  // ✅ Relative URLs work with ingress
```

---

## 🔄 **Testing Workflow**

1. **Save changes** to `addon.yaml` and `server.js`
2. **Rebuild client**: `npm run build` in client folder
3. **Restart add-on** in Home Assistant
4. **Wait** for Docker rebuild (check logs)
5. **Click "Open"** to access via ingress
6. **Test functionality**:
   - Page navigation (sidebar/mobile tabs)
   - Light toggles
   - Climate controls
   - Security settings

---

## 🎯 **Success Indicators**

- ✅ **Dashboard loads** at `/api/hassio/app/`
- ✅ **No CORS errors** in browser console
- ✅ **API calls succeed** (200 status in Network tab)
- ✅ **HA entities update** (check HA dashboard)
- ✅ **All pages accessible** (Home, Lights, Climate, Security, Settings)

---

## 🚑 **Emergency Troubleshooting**

If still not working:

1. **Check HA version**: Ensure supports ingress add-ons
2. **Verify network**: `supervisor` hostname resolves in container
3. **Test manually**: Access add-on directly at `http://homeassistant:3000`
4. **Check permissions**: Add-on has network access to supervisor
5. **Review logs**: Full add-on logs, not just recent entries

---

## 📝 **Key Changes Made**

| File | Change | Reason |
|------|--------|---------|
| `server.js` | Removed ingress path handling | HA strips prefix automatically |
| `server.js` | Updated HA_HOST to 'supervisor' | Correct for add-on Docker network |
| `server.js` | Added SUPERVISOR_TOKEN support | HA provides token automatically |
| `addon.yaml` | Added ingress configuration | Enables secure embedding |
| `client/` | Rebuilt and redeployed | Updated configuration |

**Result**: Proper Home Assistant ingress integration with secure API proxying.
