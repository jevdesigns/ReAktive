# Home Assistant Add-on Requirements - Verification Summary

## ✅ FIXES APPLIED

### Critical Fix
- **Renamed `addon.yaml` → `config.yaml`** (Home Assistant requires this exact name)

### Dockerfile Fixes
- Removed duplicate `RUN chmod +x /run.sh` line
- Removed duplicate `EXPOSE 3000` 
- Changed from `ENTRYPOINT` to `CMD ["/run.sh"]` (standard for HA add-ons)

### config.yaml Cleanup
- Removed empty `environment.SUPERVISOR_TOKEN: ""`
- Removed empty `privileged: []` array
- Removed inline `build:` section (using build.json instead)

### Documentation Added
- Created `DOCS.md` with usage instructions
- Created `CHANGELOG.md` with version history

---

## 📋 HOME ASSISTANT ADD-ON REQUIREMENTS

### Required Files (Minimum)
1. ✅ **config.yaml** - Add-on configuration (was addon.yaml ❌)
2. ✅ **Dockerfile** - Container definition
3. ✅ **run.sh** - Startup script

### Recommended Files
4. ✅ **README.md** - Overview (for repository)
5. ✅ **DOCS.md** - User documentation (shows in add-on UI)
6. ✅ **CHANGELOG.md** - Version history
7. ❌ **icon.png** - Add-on icon (128x128 recommended)
8. ❌ **logo.png** - Add-on logo (optional)
9. ✅ **build.json** - Extended build options (optional)

---

## 📄 CONFIG.YAML REQUIRED FIELDS

### ✅ You Have All Required Fields:
- `name`: "ReAktive"
- `version`: "1.0.0"
- `slug`: "reaktive" (must be unique, URI-friendly)
- `description`: "Reactive Home Assistant Dashboard with NGINX"
- `arch`: ["aarch64", "amd64"]

### ✅ Your Optional Fields:
- `ports`: Maps container port to host
- `startup`: "application" (correct - starts after HA)
- `boot`: "auto" (starts automatically)
- `url`: Repository URL
- `options`: {} (no config options yet)
- `schema`: {} (no validation needed)

---

## 🏗️ DOCKERFILE REQUIREMENTS

### ✅ Correct Format:
```dockerfile
ARG BUILD_FROM
FROM $BUILD_FROM
# ... your packages ...
COPY run.sh /
RUN chmod +x /run.sh
CMD ["/run.sh"]
```

### Available BUILD_FROM Images:
- `ghcr.io/home-assistant/aarch64-base:latest`
- `ghcr.io/home-assistant/amd64-base:latest`
- `ghcr.io/home-assistant/armhf-base:latest`
- `ghcr.io/home-assistant/armv7-base:latest`
- `ghcr.io/home-assistant/i386-base:latest`

Your build.json correctly maps these for multi-arch support.

---

## 🔧 RUN.SH REQUIREMENTS

### ✅ Your run.sh:
```bash
#!/usr/bin/env bashio
# Uses bashio for logging
```

### Notes:
- Shebang can be `#!/bin/bash` or `#!/usr/bin/env bashio`
- Must be executable (chmod +x)
- Bashio provides helper functions like `bashio::log.info`
- Available by default in HA base images

---

## ⚙️ OPTIONS vs SCHEMA

### Purpose:
- **`options:`** Default values for user settings
- **`schema:`** Validation rules for those settings

### Example:
```yaml
options:
  ssl: false
  port: 8000
  
schema:
  ssl: bool
  port: "int(1,65535)"
```

### Your Current Setup:
```yaml
options: {}
schema: {}
```
This means: No user configuration available (perfectly valid for simple add-ons)

---

## 🎨 ICON REQUIREMENTS (Optional)

### Not Required for Detection, But Recommended:
- **icon.png** - 128x128px PNG
- **logo.png** - Any size, shown in add-on details

### Without Icons:
- Add-on still works
- Shows default puzzle piece icon
- No installation issues

---

## 🔍 BUILD OPTIONS

### You Can Use EITHER:

1. **Inline in config.yaml:**
```yaml
build:
  dockerfile: Dockerfile
  context: .
  args:
    BUILD_FROM: ghcr.io/home-assistant/{arch}-base:latest
```

2. **Separate build.json:** ✅ (Your current approach)
```json
{
  "build_from": {
    "aarch64": "ghcr.io/home-assistant/aarch64-base:latest",
    "amd64": "ghcr.io/home-assistant/amd64-base:latest"
  }
}
```

**Recommendation:** Use build.json (cleaner, you already have it)

---

## 📂 YOUR CURRENT FILE STRUCTURE

```
reaktive/
├── config.yaml          ✅ (renamed from addon.yaml)
├── Dockerfile           ✅ (fixed duplicates)
├── run.sh              ✅
├── build.json          ✅
├── nginx.conf          ✅
├── README.md           ✅
├── DOCS.md             ✅ (created)
├── CHANGELOG.md        ✅ (created)
├── icon.png            ❌ (optional)
├── logo.png            ❌ (optional)
└── client/
    └── dist/           ✅ (React build)
```

---

## 🚀 INSTALLATION STEPS

1. **Copy to add-ons folder:**
   - Via Samba: `\\homeassistant\addons\reaktive\`
   - Via SSH: `/addons/reaktive/`

2. **Reload add-on store:**
   - Go to Settings → Add-ons → Add-on Store
   - Click ⋮ menu → "Check for updates"
   - Refresh browser if needed (Ctrl+F5)

3. **Look for "Local add-ons" section:**
   - Should see "ReAktive" listed
   - Click to install

4. **If add-on doesn't appear:**
   - Check Supervisor logs (Settings → System → Logs → Supervisor)
   - Look for YAML validation errors
   - Verify config.yaml syntax at yamllint.com

---

## 🐛 COMMON ISSUES

### Add-on Not Showing Up:
- ✅ **Fixed:** config.yaml was named addon.yaml
- Check: YAML syntax errors in config.yaml
- Check: Supervisor logs for validation errors
- Clear browser cache (Ctrl+F5)

### Build Failures:
- Verify Dockerfile syntax
- Check that run.sh exists and is referenced correctly
- Ensure client/dist folder has built files

### Runtime Errors:
- Check add-on logs
- Verify nginx.conf is valid
- Ensure port 3000 isn't blocked

---

## ✅ VALIDATION CHECKLIST

- [x] config.yaml exists (not addon.yaml)
- [x] All required fields in config.yaml
- [x] Dockerfile uses ARG BUILD_FROM pattern
- [x] Dockerfile has CMD or ENTRYPOINT (not both)
- [x] run.sh exists and is executable
- [x] build.json is valid (if using)
- [x] DOCS.md created
- [x] CHANGELOG.md created
- [ ] icon.png created (optional)
- [ ] logo.png created (optional)

---

## 🎯 NEXT STEPS

1. **Copy the reaktive folder to `/addons/` on your Home Assistant**
2. **Refresh the add-on store**
3. **Install and test**

Your add-on should now be properly configured and detectable by Home Assistant!
