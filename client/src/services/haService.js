/**
 * Home Assistant API Service
 * 
 * Handles communication with Home Assistant via HA token and REST API.
 * Supports real-time state updates via WebSocket.
 * 
 * Important: All HA API calls are proxied through /api/ha/* paths
 * which the server forwards to Home Assistant:8123
 */

const HA_API_BASE = '/api/ha';

// Helper to log API calls for debugging
const log = (method, path, data = null) => {
  console.log(`[HA API] ${method} ${path}${data ? ' ' + JSON.stringify(data).substring(0, 100) : ''}`);
};

export const haService = {
  // Get current state of an entity
  async getEntity(entityId) {
    try {
      log('GET', `/states/${entityId}`);
      const response = await fetch(`${HA_API_BASE}/states/${entityId}`);
      if (!response.ok) {
        console.error(`Failed to fetch entity ${entityId}: ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching entity:', error);
      return null;
    }
  },

  // Call a service (e.g., turn on a light)
  async callService(domain, service, data) {
    try {
      const path = `/services/${domain}/${service}`;
      log('POST', path, data);
      const response = await fetch(`${HA_API_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const text = await response.text();
        console.error(`Service call failed: ${response.status} ${text}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Service call error:', error);
      return null;
    }
  },

  // Turn on a light
  async turnOnLight(entityId, brightness = null, color = null) {
    const data = { entity_id: entityId };
    if (brightness) data.brightness = Math.round((brightness / 100) * 255);
    if (color) data.hs_color = color;
    return this.callService('light', 'turn_on', data);
  },

  // Turn off a light
  async turnOffLight(entityId) {
    return this.callService('light', 'turn_off', { entity_id: entityId });
  },

  // Set climate temperature
  async setTemperature(entityId, temperature) {
    return this.callService('climate', 'set_temperature', {
      entity_id: entityId,
      temperature,
    });
  },

  // Arm/disarm security system
  async setSecurityArm(entityId, state) {
    return this.callService('alarm_control_panel', 'alarm_' + state, {
      entity_id: entityId,
    });
  },

  // Get all lights - fetch from states and filter
  async getLights() {
    try {
      log('GET', `/states`);
      const response = await fetch(`${HA_API_BASE}/states`);
      if (!response.ok) {
        console.error('Failed to fetch states');
        return [];
      }
      const allStates = await response.json();
      // Filter for light and switch entities
      return allStates.filter(entity => 
        entity.entity_id.startsWith('light.') || entity.entity_id.startsWith('switch.')
      );
    } catch (error) {
      console.error('Error fetching lights:', error);
      return [];
    }
  },

  // Get all climate entities
  async getClimateDevices() {
    try {
      log('GET', `/states`);
      const response = await fetch(`${HA_API_BASE}/states`);
      if (!response.ok) {
        console.error('Failed to fetch states');
        return [];
      }
      const allStates = await response.json();
      // Filter for climate entities
      return allStates.filter(entity => entity.entity_id.startsWith('climate.'));
    } catch (error) {
      console.error('Error fetching climate:', error);
      return [];
    }
  },

  // Get security system state
  async getSecurityState(entityId) {
    return this.getEntity(entityId);
  },

  // Turn on a switch
  async turnOnSwitch(entityId) {
    return this.callService('switch', 'turn_on', { entity_id: entityId });
  },

  // Turn off a switch
  async turnOffSwitch(entityId) {
    return this.callService('switch', 'turn_off', { entity_id: entityId });
  },
};

export default haService;
