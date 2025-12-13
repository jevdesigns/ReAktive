import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import HomePage from './pages/HomePage';
import LightsPage from './pages/LightsPage';
import ClimatePage from './pages/ClimatePage';
import SecurityPage from './pages/SecurityPage';
import SettingsPage from './pages/SettingsPage';
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
  
  // State for lights — initialized from Home Assistant entity ids provided via ingress
  const [lights, setLights] = useState([
    { id: 'light.basement_sitting_area_main_lights_1', title: 'Basement Sitting Area Main Lights 1', on: false, brightness: 0 },
    { id: 'light.basement_sitting_area_main_lights_2', title: 'Basement Sitting Area Main Lights 2', on: false, brightness: 0 },
    { id: 'light.den_den_lights', title: ' Den Den Lights', on: false, brightness: 0 },
    { id: 'light.den_recessed_lights', title: 'Den Recessed Lights', on: false, brightness: 0 },
    { id: 'light.exterior_deck_lights_right', title: 'Exterior Deck Lights Right', on: false, brightness: 0 },
    { id: 'light.front_foyer_hallway_lights', title: 'Front Foyer Hallway Lights', on: false, brightness: 0 },
    { id: 'light.front_foyer_stairway_lights', title: 'Front Foyer Stairway Lights', on: false, brightness: 0 },
    { id: 'light.kitchen_recessed_main_lights', title: 'Kitchen Recessed Main Lights', on: false, brightness: 0 },
    { id: 'light.living_room_main_lights', title: 'Living Room Main Lights', on: false, brightness: 0 },
    { id: 'light.master_bathroom_tub_lights', title: 'Master Bathroom Tub Lights', on: false, brightness: 0 },
    { id: 'light.master_bathroom_vanity_lights', title: 'Master Bathroom Vanity Lights', on: false, brightness: 0 },
    { id: 'light.office_main_lights', title: 'Office Main Lights', on: false, brightness: 0 },
    { id: 'switch.mudroom_main_lights', title: 'Mudroom Main Lights', on: false, brightness: 0, isSwitch: true },
    { id: 'switch.myas_bedroom_recessed_lights', title: "Mya’s Bedroom Recessed Lights", on: false, brightness: 0, isSwitch: true },
  ]);

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

  // Populate lights from Home Assistant and keep them updated (simple polling)
  useEffect(() => {
    let mounted = true;

    const fetchLights = async () => {
      try {
        const remote = await haService.getLights();
        if (!mounted || !remote) return;

        // Map HA response to local light shape
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
          // Preserve existing order where possible, update states for known ids
          const byId = Object.fromEntries(mapped.map(m => [m.id, m]));
          const merged = prev.map(p => (byId[p.id] ? byId[p.id] : p));
          // Append any new lights not already in prev
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
  }, []);

  // Light handlers
  const toggleLight = (id) => {
    setLights(prev => prev.map(l => 
      l.id === id ? { ...l, on: !l.on } : l
    ));
  };

  const setBrightness = (id, brightness) => {
    setLights(prev => prev.map(l => 
      l.id === id ? { ...l, brightness, on: brightness > 0 } : l
    ));
  };

  // Climate handlers
  const adjustTemperature = (delta) => {
    setClimate(prev => ({
      ...prev,
      targetTemp: Math.max(60, Math.min(85, prev.targetTemp + delta))
    }));
  };

  const setClimateMode = (mode) => {
    setClimate(prev => ({ ...prev, mode }));
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
    climate,
    adjustTemperature,
    setClimateMode,
    security,
    toggleSecurityArmed,
    lockDoor,
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
