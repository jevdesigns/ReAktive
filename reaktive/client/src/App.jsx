import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import LightsPage from './pages/LightsPage';
import ClimatePage from './pages/ClimatePage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';
import haService from './services/haService';



/**
 * ReactiveDash - Home Assistant Dashboard
 * 
 * Refactored for modularity, Home Assistant integration, and maintainability.
 * Architecture:
 * - pages/: Full page views (HomePage, LightsPage, etc.)
 * - components/: Reusable UI components (Card, Modal, etc.)
 * - hooks/: Custom React hooks for state management
 * - services/: API calls and external integrations
 */


export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [time, setTime] = useState(new Date());
  
  // Dynamic entity state - discovered from Home Assistant
  const [lights, setLights] = useState([]);
  const [climateDevices, setClimateDevices] = useState([]);
  const [securityDevices, setSecurityDevices] = useState([]);
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);

  // State for climate
  const [climate, setClimate] = useState({
    temperature: 72,
    humidity: 45,
    targetTemp: 72,
    mode: 'heat',
    status: 'heating',
  });

  // State for security
  const [security, setSecurityState] = useState({
    armed: true,
    mode: 'home',
    cameras: [
      { id: 'front', name: 'Front Door', status: 'online', recording: true },
      { id: 'back', name: 'Back Patio', status: 'online', recording: true },
    ],
    doors: [
      { id: 'front_door', name: 'Front Door', locked: true },
      { id: 'garage', name: 'Garage Door', locked: true },
    ],
  });

  // State for location/weather
  const [location, setLocation] = useState({
    city: 'San Francisco',
    state: 'California',
    lat: 37.7749,
    lon: -122.4194,
  });

  const [weather, setWeather] = useState({
    temp: 72,
    condition: 'Partly Cloudy',
    code: 2,
    humidity: 65,
    windSpeed: 10,
  });

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize WebSocket connection and discover entities
  useEffect(() => {
    let mounted = true;

    const initializeApp = async () => {
      try {
        setLoading(true);
        
        // Connect to WebSocket for real-time updates
        await haService.connectWebSocket();
        setWsConnected(true);
        console.log('WebSocket connected for real-time updates');

        // Discover all entities from Home Assistant
        const entities = await haService.getAllEntities();
        if (!mounted) return;

        // Map lights and switches
        const mappedLights = [...entities.lights, ...entities.switches].map(item => {
          const id = item.entity_id;
          const attrs = item.attributes || {};
          const rawBrightness = attrs.brightness ?? null;
          const brightness = rawBrightness != null ? Math.round((rawBrightness / 255) * 100) : 0;
          return {
            id,
            title: attrs.friendly_name || id,
            on: item.state === 'on',
            brightness,
            isSwitch: item.entity_id.startsWith('switch.'),
          };
        });

        // Map climate devices
        const mappedClimate = entities.climate.map(item => {
          const attrs = item.attributes || {};
          return {
            id: item.entity_id,
            title: attrs.friendly_name || item.entity_id,
            temperature: attrs.current_temperature || 72,
            targetTemp: attrs.temperature || 72,
            humidity: attrs.current_humidity || 45,
            mode: attrs.hvac_mode || 'heat',
            state: item.state,
          };
        });

        // Map security devices
        const mappedSecurity = entities.security.map(item => {
          const attrs = item.attributes || {};
          return {
            id: item.entity_id,
            title: attrs.friendly_name || item.entity_id,
            armed: item.state === 'armed_home' || item.state === 'armed_away',
            mode: item.state,
          };
        });

        // Map sensors
        const mappedSensors = entities.sensors.map(item => {
          const attrs = item.attributes || {};
          return {
            id: item.entity_id,
            title: attrs.friendly_name || item.entity_id,
            state: item.state,
            unit: attrs.unit_of_measurement || '',
            device_class: attrs.device_class,
          };
        });

        setLights(mappedLights);
        setClimateDevices(mappedClimate);
        setSecurityDevices(mappedSecurity);
        setSensors(mappedSensors);

        // Subscribe to real-time updates for all entities
        mappedLights.forEach(light => {
          haService.subscribeToEntity(light.id, (newState) => {
            if (!mounted) return;
            setLights(prev => prev.map(l => 
              l.id === light.id ? {
                ...l,
                on: newState === 'on',
                brightness: newState.attributes?.brightness ? 
                  Math.round((newState.attributes.brightness / 255) * 100) : l.brightness
              } : l
            ));
          });
        });

        mappedClimate.forEach(device => {
          haService.subscribeToEntity(device.id, (newState) => {
            if (!mounted) return;
            setClimateDevices(prev => prev.map(d => 
              d.id === device.id ? {
                ...d,
                temperature: newState.attributes?.current_temperature || d.temperature,
                targetTemp: newState.attributes?.temperature || d.targetTemp,
                mode: newState.attributes?.hvac_mode || d.mode,
                state: newState
              } : d
            ));
          });
        });

        setLoading(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setLoading(false);
        // Fallback to polling if WebSocket fails
        setupPolling();
      }
    };

    const setupPolling = () => {
      console.log('Falling back to polling mode');
      const fetchLights = async () => {
        try {
          const remote = await haService.getLights();
          if (!mounted || !remote) return;

          const mapped = remote.map(item => {
            const id = item.entity_id || item.entityId || item.id;
            const attrs = item.attributes || {};
            const rawBrightness = attrs.brightness ?? null;
            const brightness = rawBrightness != null ? Math.round((rawBrightness / 255) * 100) : 0;
            return {
              id,
              title: attrs.friendly_name || id,
              on: item.state === 'on',
              brightness,
            };
          });

          setLights(prev => {
            const byId = Object.fromEntries(mapped.map(m => [m.id, m]));
            const merged = prev.map(p => (byId[p.id] ? byId[p.id] : p));
            mapped.forEach(m => { if (!merged.find(x => x.id === m.id)) merged.push(m); });
            return merged;
          });
        } catch (err) {
          console.error('Error fetching lights from HA:', err);
        }
      };

      fetchLights();
      const interval = setInterval(fetchLights, 5000);
      return () => { mounted = false; clearInterval(interval); };
    };

    initializeApp();

    return () => {
      mounted = false;
      haService.disconnectWebSocket();
    };
  }, []);

  // Light handlers
  const toggleLight = async (id) => {
    const light = lights.find(l => l.id === id);
    if (!light) return;

    try {
      if (light.on) {
        await haService.turnOffLight(id);
      } else {
        await haService.turnOnLight(id, light.brightness);
      }
      // WebSocket will update the state automatically
    } catch (error) {
      console.error('Error toggling light:', error);
      // Fallback: update local state optimistically
      setLights(prev => prev.map(l => 
        l.id === id ? { ...l, on: !l.on } : l
      ));
    }
  };

  const setBrightness = async (id, brightness) => {
    try {
      await haService.turnOnLight(id, brightness);
      // WebSocket will update the state automatically
    } catch (error) {
      console.error('Error setting brightness:', error);
      // Fallback: update local state optimistically
      setLights(prev => prev.map(l => 
        l.id === id ? { ...l, brightness, on: brightness > 0 } : l
      ));
    }
  };

  // Climate handlers
  const adjustTemperature = async (deviceId, delta) => {
    const device = climateDevices.find(d => d.id === deviceId);
    if (!device) return;

    const newTemp = Math.max(60, Math.min(85, device.targetTemp + delta));
    try {
      await haService.setTemperature(deviceId, newTemp);
      // WebSocket will update the state automatically
    } catch (error) {
      console.error('Error adjusting temperature:', error);
      // Fallback: update local state optimistically
      setClimateDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, targetTemp: newTemp } : d
      ));
    }
  };

  const setClimateMode = async (deviceId, mode) => {
    try {
      // This would need a proper HA service method for setting HVAC mode
      console.log(`Setting climate mode for ${deviceId} to ${mode}`);
      // For now, just update local state
      setClimateDevices(prev => prev.map(d => 
        d.id === deviceId ? { ...d, mode } : d
      ));
    } catch (error) {
      console.error('Error setting climate mode:', error);
    }
  };

  // Security handlers
  const toggleSecurityArmed = () => {
    setSecurityState(prev => ({ ...prev, armed: !prev.armed }));
  };

  const lockDoor = (doorId) => {
    setSecurityState(prev => ({
      ...prev,
      doors: prev.doors.map(d => 
        d.id === doorId ? { ...d, locked: !d.locked } : d
      )
    }));
  };

  // Shared props for pages
  const pageProps = {
    time,
    location,
    weather,
    lights,
    toggleLight,
    setBrightness,
    climate: climateDevices.length > 0 ? climateDevices[0] : climate, // Fallback to old climate for compatibility
    climateDevices,
    adjustTemperature,
    setClimateMode,
    security,
    toggleSecurityArmed,
    lockDoor,
    loading,
    wsConnected,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-blue-950 to-black text-white flex overflow-hidden">
      {/* Fixed gradient background */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
      </div>

      {/* Sidebar - Desktop only */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main content */}
      <main className="flex-1 relative z-10 overflow-y-auto h-screen">
        {activeTab === 'home' && <HomePage {...pageProps} />}
        {activeTab === 'lights' && <LightsPage {...pageProps} />}
        {activeTab === 'climate' && <ClimatePage {...pageProps} />}
        {activeTab === 'security' && <SecurityPage {...pageProps} />}
        {activeTab === 'settings' && <SettingsPage location={location} setLocation={setLocation} />}
      </main>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-white/10 z-50">
        <div className="flex justify-around p-2">
          {[
            { id: 'home', icon: '🏠', label: 'Home' },
            { id: 'lights', icon: '💡', label: 'Lights' },
            { id: 'climate', icon: '🌡️', label: 'Climate' },
            { id: 'security', icon: '🔐', label: 'Security' },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 py-3 text-center transition-colors ${
                activeTab === item.id ? 'text-blue-400' : 'text-white/40'
              }`}
            >
              <div className="text-2xl">{item.icon}</div>
              <div className="text-xs mt-1">{item.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
