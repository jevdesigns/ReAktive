# ReAktive Documentation

## Configuration

This add-on currently has no configuration options. It will automatically connect to your Home Assistant instance.

## How to use

1. Start the add-on
2. Access the dashboard at `http://homeassistant.local:3000`
3. The interface provides access to:
   - Climate controls
   - Light management
   - Security systems
   - Settings

## Technical Details

- Built with React and Vite
- Served via NGINX
- Communicates with Home Assistant API
- Port: 3000 (TCP)

## Troubleshooting

### Add-on won't start
- Check the logs for error messages
- Ensure port 3000 is not in use by another service
- Verify the client files were built correctly

### Dashboard not loading
- Clear your browser cache
- Check that the add-on is running
- Verify network connectivity to Home Assistant

### Can't control devices
- Ensure Home Assistant API is accessible
- Check that you have proper permissions
- Review browser console for errors
