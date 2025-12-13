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

// WebSocket connection for real-time updates
class HAWebSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }

  async connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    try {
      // Connect through NGINX proxy
      const wsUrl = `ws://${window.location.host}/api/ha/websocket`;
      this.ws = new WebSocket(wsUrl);

      return new Promise((resolve, reject) => {
        this.ws.onopen = () => {
          console.log('[HA WS] Connected to Home Assistant via NGINX');
          this.connected = true;
          this.reconnectAttempts = 0;

          // Authenticate with HA
          this.authenticate().then(resolve).catch(reject);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('[HA WS] Error parsing message:', error);
          }
        };

        this.ws.onclose = () => {
          console.log('[HA WS] Connection closed');
          this.connected = false;
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('[HA WS] Connection error:', error);
          this.connected = false;
        };

        // Connection timeout
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('[HA WS] Connection failed:', error);
      this.attemptReconnect();
      throw error;
    }
  }

  async authenticate() {
    return new Promise((resolve, reject) => {
      const authTimeout = setTimeout(() => {
        reject(new Error('Authentication timeout'));
      }, 5000);

      const handleAuth = (data) => {
        if (data.type === 'auth_required') {
          this.send({
            type: 'auth',
            access_token: this.getToken()
          });
        } else if (data.type === 'auth_ok') {
          clearTimeout(authTimeout);
          console.log('[HA WS] Authentication successful');
          this.subscribeToEvents();
          resolve();
        } else if (data.type === 'auth_invalid') {
          clearTimeout(authTimeout);
          reject(new Error('Authentication failed'));
        }
      };

      // Temporary message handler for auth
      const originalHandler = this.ws.onmessage;
      this.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleAuth(data);
      };

      // Restore original handler after auth
      setTimeout(() => {
        this.ws.onmessage = originalHandler;
      }, 6000);
    });
  }

  getToken() {
    // NGINX proxy handles authentication, but WebSocket still needs token for HA protocol
    // In production, this will be handled by the proxy
    return process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN || '';
  }

  subscribeToEvents() {
    // Subscribe to all state changes
    this.send({
      id: 1,
      type: 'subscribe_events',
      event_type: 'state_changed'
    });
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  handleMessage(data) {
    if (data.type === 'event' && data.event.event_type === 'state_changed') {
      const { entity_id, new_state, old_state } = data.event.data;
      console.log(`[HA WS] State changed: ${entity_id}`, new_state);
      
      // Notify all listeners for this entity
      this.notifyListeners(entity_id, new_state, old_state);
      
      // Also notify general state change listeners
      this.notifyListeners('state_changed', { entity_id, new_state, old_state });
    }
  }

  subscribe(entityId, callback) {
    if (!this.listeners.has(entityId)) {
      this.listeners.set(entityId, []);
    }
    this.listeners.get(entityId).push(callback);
  }

  unsubscribe(entityId, callback) {
    if (this.listeners.has(entityId)) {
      const callbacks = this.listeners.get(entityId);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  notifyListeners(entityId, ...args) {
    if (this.listeners.has(entityId)) {
      this.listeners.get(entityId).forEach(callback => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[HA WS] Error in listener for ${entityId}:`, error);
        }
      });
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[HA WS] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[HA WS] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[HA WS] Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.listeners.clear();
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Global WebSocket instance
const haWebSocket = new HAWebSocket();

export const haService = {
  // WebSocket connection management
  connectWebSocket: () => haWebSocket.connect(),
  disconnectWebSocket: () => haWebSocket.disconnect(),
  isWebSocketConnected: () => haWebSocket.isConnected(),
  subscribeToEntity: (entityId, callback) => haWebSocket.subscribe(entityId, callback),
  unsubscribeFromEntity: (entityId, callback) => haWebSocket.unsubscribe(entityId, callback),

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

  // Get all entities from Home Assistant
  async getAllEntities() {
    try {
      log('GET', `/states`);
      const response = await fetch(`${HA_API_BASE}/states`);
      if (!response.ok) {
        console.error('Failed to fetch all entities');
        return {
          lights: [],
          climate: [],
          security: [],
          sensors: [],
          switches: []
        };
      }
      const allStates = await response.json();
      
      // Categorize entities by domain
      return {
        lights: allStates.filter(entity => entity.entity_id.startsWith('light.')),
        switches: allStates.filter(entity => entity.entity_id.startsWith('switch.')),
        climate: allStates.filter(entity => entity.entity_id.startsWith('climate.')),
        security: allStates.filter(entity => entity.entity_id.startsWith('alarm_control_panel.')),
        sensors: allStates.filter(entity => entity.entity_id.startsWith('sensor.')),
        cameras: allStates.filter(entity => entity.entity_id.startsWith('camera.')),
        locks: allStates.filter(entity => entity.entity_id.startsWith('lock.')),
        covers: allStates.filter(entity => entity.entity_id.startsWith('cover.'))
      };
    } catch (error) {
      console.error('Error fetching all entities:', error);
      return {
        lights: [],
        climate: [],
        security: [],
        sensors: [],
        switches: []
      };
    }
  },

  // Get all lights and switches
  async getLights() {
    const entities = await this.getAllEntities();
    return [...entities.lights, ...entities.switches];
  },

  // Get all climate entities
  async getClimateDevices() {
    const entities = await this.getAllEntities();
    return entities.climate;
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
