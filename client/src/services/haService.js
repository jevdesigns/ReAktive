/**
 * Home Assistant API Service
 * 
 * Handles communication with Home Assistant via HA token and REST API.
 * Supports real-time state updates via WebSocket.
 */

const HA_API_BASE = '/api/ha';

export const haService = {
  // Get current state of an entity
  async getEntity(entityId) {
    try {
      const response = await fetch(`${HA_API_BASE}/states/${entityId}`);
      if (!response.ok) throw new Error('Failed to fetch entity');
      return await response.json();
    } catch (error) {
      console.error('Error fetching entity:', error);
      return null;
    }
  },

  // Call a service (e.g., turn on a light)
  async callService(domain, service, data) {
    try {
      const response = await fetch(`${HA_API_BASE}/services/${domain}/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Service call failed');
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

  // Get all lights
  async getLights() {
    try {
      const response = await fetch(`${HA_API_BASE}/lights`);
      if (!response.ok) throw new Error('Failed to fetch lights');
      return await response.json();
    } catch (error) {
      console.error('Error fetching lights:', error);
      return [];
    }
  },

  // Get all climate entities
  async getClimateDevices() {
    try {
      const response = await fetch(`${HA_API_BASE}/climate`);
      if (!response.ok) throw new Error('Failed to fetch climate devices');
      return await response.json();
    } catch (error) {
      console.error('Error fetching climate:', error);
      return [];
    }
  },

  // Get security system state
  async getSecurityState(entityId) {
    return this.getEntity(entityId);
  },
};

export default haService;
