import React, { useEffect, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import haService from './services/haService';
import { callGemini as callGeminiService, fetchGeoLocation as fetchGeoLocationService, fetchWeather as fetchWeatherService, getWeatherIcon as getWeatherIconService } from './services/gemini';
import { LightControlModal, SettingsView } from './components';

const Rooms = React.lazy(() => import('./pages/Rooms'));
const Assistant = React.lazy(() => import('./pages/Assistant'));
const MediaPlayerCard = React.lazy(() => import('./components/MediaPlayerCard'));
const GoogleWeatherModal = React.lazy(() => import('./components/GoogleWeatherModal'));
const MagicMoodModal = React.lazy(() => import('./components/MagicMoodModal'));
const ClockWeatherCard = React.lazy(() => import('./components/ClockWeatherCard'));
const FamilyStatusCard = React.lazy(() => import('./components/FamilyStatusCard'));
const Card = React.lazy(() => import('./components/Card'));
const ThermostatCard = React.lazy(() => import('./components/ThermostatCard'));
const MoodButton = React.lazy(() => import('./components/MoodButton'));
const SceneButton = React.lazy(() => import('./components/SceneButton'));

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
/* Card, ThermostatCard, ClockWeatherCard, MediaPlayerCard and LightControlModal
   implementations were moved to separate component files under `client/src/components`.
   The components are imported at the top of this file. */



/* `MoodButton` extracted to `client/src/components/MoodButton.jsx` */

/* `SceneButton` extracted to `client/src/components/SceneButton.jsx` */

/* `FamilyStatusCard` extracted to `client/src/components/FamilyStatusCard.jsx` */

/* `GoogleWeatherModal` extracted to `client/src/components/GoogleWeatherModal.jsx` */



/* `MagicMoodModal` extracted to `client/src/components/MagicMoodModal.jsx` */

/* `SettingsView` extracted to `client/src/components/SettingsView.jsx` */

export default function App() {
  const [time, setTime] = useState(new Date());
  const [showWeatherModal, setShowWeatherModal] = useState(false);
  const [showMagicMoodModal, setShowMagicMoodModal] = useState(false);
  const [activeLightId, setActiveLightId] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({ lightDimmerDelay: 800, lightEditDelay: 6000, mediaExpandDelay: 800 });
  const [userCoords, setUserCoords] = useState({ lat: 37.7749, lon: -122.4194 });
  const [locationName, setLocationName] = useState({ city: 'San Francisco', state: 'California' });
  const [weatherData, setWeatherData] = useState(null);

  const [lights, setLights] = useState([]);
  const [thermostats, setThermostats] = useState([]);
  const [currentThermoIndex, setCurrentThermoIndex] = useState(0);
  const [rotateDelay, setRotateDelay] = useState(5000);
  const [security, setSecurity] = useState({ entityId: null, armed: true, mode: 'armed_home', title: 'Security System' });
  const [isLocked, setIsLocked] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [isPlayingCompact, setIsPlayingCompact] = useState(true);

  const [family] = useState([
    { id: 'dad', name: 'Dad', status: 'Home', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop' },
    { id: 'mom', name: 'Mom', status: 'Work', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop' },
    { id: 'kid', name: 'Kid', status: 'School', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop' },
  ]);

  const [moods, setMoods] = useState([
    { id: 'morning', name: 'Morning', icon: Lucide.Sun, color: 'bg-amber-500', animation: 'sunrise-spin' },
    { id: 'dining', name: 'Dining', icon: Lucide.Utensils, color: 'bg-rose-500', animation: 'candle-pulse' },
    { id: 'movie', name: 'Movie', icon: Lucide.Tv, color: 'bg-indigo-600', animation: 'cinema-zoom' },
    { id: 'away', name: 'Away', icon: Lucide.Shield, color: 'bg-emerald-600', animation: 'radar-pulse' },
  ]);
  const [isReorderingMoods, setIsReorderingMoods] = useState(false);
  const [activeMoodId, setActiveMoodId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchWeather(userCoords.lat, userCoords.lon).then((data) => setWeatherData(data));
  }, [userCoords.lat, userCoords.lon]);

  useEffect(() => {
    let mounted = true;

    const hydrateFromEntities = (entities) => {
      const mappedLights = [...entities.lights, ...entities.switches].map((entity, index) => mapLightEntity(entity, index));
      const mappedThermos = entities.climate.map(mapClimateEntity);
      const mappedSecurity = entities.security[0] ? mapSecurityEntity(entities.security[0]) : security;

      if (!mounted) return;
      setLights(mappedLights);
      setThermostats(mappedThermos.length ? mappedThermos : [{ id: 0, name: 'Home', temp: 70, status: 'idle', min: 60, max: 85 }]);
      setSecurity(mappedSecurity);

      mappedLights.forEach((light) => {
        haService.subscribeToEntity(light.id, (newState) => {
          if (!mounted || !newState) return;
          const attrs = newState.attributes || {};
          const brightness = toBrightnessPercent(attrs);
          setLights((prev) => prev.map((l) => (l.id === light.id ? { ...l, on: newState.state === 'on', brightness } : l)));
        });
      });

      mappedThermos.forEach((thermo) => {
        haService.subscribeToEntity(thermo.entityId, (newState) => {
          if (!mounted || !newState) return;
          const attrs = newState.attributes || {};
          setThermostats((prev) =>
            prev.map((t) =>
              t.entityId === thermo.entityId
                ? { ...t, temp: attrs.current_temperature || t.temp, targetTemp: attrs.temperature || t.targetTemp, status: attrs.hvac_action || newState.state || t.status }
                : t
            )
          );
        });
      });

      if (mappedSecurity.entityId) {
        haService.subscribeToEntity(mappedSecurity.entityId, (newState) => {
          if (!mounted || !newState) return;
          setSecurity(mapSecurityEntity(newState));
        });
      }
    };

    const initialize = async () => {
      try {
        setLoading(true);
        await haService.connectWebSocket();
        if (!mounted) return;
        setWsConnected(true);
      } catch (err) {
        console.error('WS connect failed', err);
      }

      try {
        const entities = await haService.getAllEntities();
        hydrateFromEntities(entities);
      } catch (err) {
        console.error('Entity discovery failed', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initialize();
    return () => {
      mounted = false;
      haService.disconnectWebSocket();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentThermoIndex((prev) => (thermostats.length ? (prev + 1) % thermostats.length : 0));
      setRotateDelay(5000);
    }, rotateDelay);
    return () => clearInterval(interval);
  }, [currentThermoIndex, thermostats.length, rotateDelay]);

  const handleThermoChange = (direction, e) => {
    e.stopPropagation();
    if (!thermostats.length) return;
    if (direction === 'next') {
      setCurrentThermoIndex((prev) => (prev + 1) % thermostats.length);
    } else {
      setCurrentThermoIndex((prev) => (prev - 1 + thermostats.length) % thermostats.length);
    }
  };

  const adjustTemp = async (val, e) => {
    if (e) e.stopPropagation();
    setRotateDelay(10000);
    const currentThermo = thermostats[currentThermoIndex];
    if (!currentThermo) return;
    const nextTemp = Math.min(currentThermo.max, Math.max(currentThermo.min, (currentThermo.targetTemp || currentThermo.temp) + val));
    setThermostats((prev) => prev.map((t, idx) => (idx === currentThermoIndex ? { ...t, temp: nextTemp, targetTemp: nextTemp } : t)));
    if (currentThermo.entityId) {
      try {
        await haService.setTemperature(currentThermo.entityId, nextTemp);
      } catch (err) {
        console.error('Failed to set temperature', err);
      }
    }
  };

  const toggleLight = async (id) => {
    const light = lights.find((l) => l.id === id);
    if (!light) return;
    try {
      if (light.on) {
        await haService.turnOffLight(id);
      } else {
        await haService.turnOnLight(id, light.brightness);
      }
    } catch (error) {
      console.error('Error toggling light:', error);
      setLights((prev) => prev.map((l) => (l.id === id ? { ...l, on: !l.on } : l)));
    }
  };

  const setLightBrightness = async (id, brightness) => {
    const light = lights.find((l) => l.id === id);
    if (!light) return;
    setLights((prev) => prev.map((l) => (l.id === id ? { ...l, brightness, on: brightness > 0 } : l)));
    try {
      await haService.turnOnLight(id, brightness);
    } catch (error) {
      console.error('Error setting brightness:', error);
    }
  };

  const deleteLight = (id) => {
    setLights((prev) => prev.filter((l) => l.id !== id));
    setActiveLightId(null);
  };

  const updateLightColor = (id, color) => {
    setLights((prev) => prev.map((l) => (l.id === id ? { ...l, iconColor: color } : l)));
  };

  const turnAllOn = async () => {
    setLights((prev) => prev.map((l) => ({ ...l, on: true })));
    await Promise.allSettled(lights.map((l) => haService.turnOnLight(l.id, l.brightness || 100)));
  };

  const turnAllOff = async () => {
    setLights((prev) => prev.map((l) => ({ ...l, on: false })));
    await Promise.allSettled(lights.map((l) => haService.turnOffLight(l.id)));
  };

  const handleAddMood = (m) => setMoods((prev) => [...prev, { ...m, id: `mood-${Date.now()}` }]);
  const updateWeather = async (newCoords) => {
    const data = await fetchWeather(newCoords.lat, newCoords.lon);
    setWeatherData(data);
  };

  const handleMoodReorder = (index, direction) => {
    const newMoods = [...moods];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < newMoods.length) {
      [newMoods[index], newMoods[targetIndex]] = [newMoods[targetIndex], newMoods[index]];
      setMoods(newMoods);
    }
  };

  const handleMoodActivate = (id) => {
    setActiveMoodId(id);
    setTimeout(() => {
      setActiveMoodId(null);
    }, 3000);
  };

  const currentThermo = thermostats[currentThermoIndex] || thermostats[0];
  const favoriteLights = lights.filter((l) => l.isFavorite || lights.indexOf(l) < 6);
  const lightsOnCount = lights.filter((l) => l.on).length;

  const getLightSubtitle = (light) => {
    if (!light.on) return 'Off';
    return `${light.brightness}% Brightness`;
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-sans selection:bg-blue-500/30 flex overflow-hidden">
      <div className="fixed inset-0 z-0 opacity-30 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-blue-900 blur-[120px]" />
      </div>

      <nav className="hidden md:flex flex-col items-center w-20 py-8 border-r border-white/5 bg-black/40 backdrop-blur-2xl z-50 h-screen sticky top-0">
        <button
          onClick={() => setActiveTab('home')}
          className={`mb-10 p-3 rounded-2xl transition-all duration-300 shadow-lg ${activeTab === 'home' ? 'bg-blue-600 shadow-blue-600/20 text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}
        >
          <Lucide.Home size={24} />
        </button>
        <div className="flex flex-col gap-6 w-full px-2">
          {[
            { id: 'rooms', icon: Lucide.Lightbulb },
            { id: 'climate', icon: Lucide.Thermometer },
            { id: 'security', icon: Lucide.Shield },
            { id: 'assistant', icon: Lucide.Sparkles },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`p-3 rounded-2xl transition-all ${activeTab === item.id ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white'}`}
            >
              <item.icon size={24} />
            </button>
          ))}
        </div>
        <button
          onClick={() => setActiveTab('settings')}
          className={`p-3 rounded-2xl transition-all duration-300 mt-auto mb-4 ${activeTab === 'settings' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
        >
          <Lucide.Settings size={24} />
        </button>
      </nav>

      <main className="flex-1 relative z-10 overflow-y-auto h-screen scrollbar-hide">
        {activeTab === 'settings' ? (
          <SettingsView
            settings={settings}
            setSettings={setSettings}
            coords={userCoords}
            setCoords={setUserCoords}
            locationName={locationName}
            setLocationName={setLocationName}
            onClose={() => setActiveTab('home')}
            onUpdateWeather={updateWeather}
          />
                ) : activeTab === 'assistant' ? (
          <React.Suspense fallback={<div className="p-6">Loading assistant…</div>}>
            <Assistant dashboardState={{ weather: weatherData, location: locationName, lights, thermo: currentThermo || { temp: 0, status: 'idle' }, isLocked, family }} />
          </React.Suspense>
        ) : activeTab === 'rooms' ? (
          <React.Suspense fallback={<div className="p-6">Loading rooms…</div>}>
            <Rooms lights={lights} toggleLight={toggleLight} setLightBrightness={setLightBrightness} setActiveLightId={setActiveLightId} settings={settings} />
          </React.Suspense>
        ) : activeTab === 'climate' ? (
          <div className="p-10 text-white">Coming soon.</div>
        ) : activeTab === 'security' ? (
          <div className="p-10 text-white">Security dashboard coming soon.</div>
        ) : (
          <div className="max-w-[1600px] mx-auto p-6 md:p-10">
            <header className="flex flex-col md:flex-row md:items-start justify-between mb-12 gap-6">
              <div>
                <h2 className="text-blue-400 font-bold mb-2 tracking-wider uppercase text-sm flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  {formatDate(time)}
                </h2>
                <h1 className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50 tracking-tight">
                  {getGreeting(time)}
                </h1>
                {!wsConnected && <p className="text-xs text-amber-300/80 mt-2">Realtime link inactive; falling back to REST.</p>}
                {loading && <p className="text-xs text-white/40">Loading Home Assistant data...</p>}
              </div>
              <div className="text-right self-center">
                <h1 className="text-6xl font-bold text-white/90 tracking-tighter leading-none font-mono">{formatTime(time)}</h1>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
              <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6 content-start">
                <div className="md:col-span-2 relative">
                  <div className="flex items-end justify-between mb-4 pr-2">
                    <h3 className="text-lg font-bold ml-1 text-white/90 flex items-center gap-2">
                      <Lucide.Sparkles size={18} className="text-amber-400" />
                      Moods
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowMagicMoodModal(true)}
                        className="text-xs font-bold bg-purple-600 text-white px-4 py-1.5 rounded-lg transition-colors uppercase tracking-wider shadow-lg hover:bg-purple-500 flex items-center gap-1"
                      >
                        <Lucide.Plus size={12} />
                        Create
                      </button>
                      {isReorderingMoods && (
                        <button
                          onClick={() => setIsReorderingMoods(false)}
                          className="text-xs font-bold bg-green-500 text-white px-4 py-1.5 rounded-lg transition-colors uppercase tracking-wider shadow-lg animate-in fade-in"
                        >
                          Done
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-hide -mx-6 px-6 md:-mx-0 md:px-0 snap-x snap-mandatory">
                    {moods.map((mood, index) => {
                      const isActive = activeMoodId === mood.id;
                      return (
                        <div key={mood.id} className="snap-start shrink-0 w-[130px]">
                          <div
                            onClick={() => !isReorderingMoods && handleMoodActivate(mood.id)}
                            className={`relative flex flex-col items-center justify-center gap-2 p-3 rounded-[1.5rem] border transition-all w-full h-[130px] cursor-pointer overflow-hidden ${
                              isActive ? `${mood.color} border-transparent shadow-xl scale-[1.02]` : 'bg-white/10 hover:bg-white/15 border-white/10 hover:border-white/20 backdrop-blur-md active:scale-95'
                            } ${isReorderingMoods ? 'animate-wiggle' : ''}`}
                          >
                            {isActive && <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />}
                            <div className={`p-3 rounded-full ${isActive ? 'bg-white/20 text-white' : `${mood.color} text-white`} shadow-lg relative overflow-hidden transition-colors`}>
                              <div className={`absolute inset-0 ${mood.animation} pointer-events-none opacity-50`}></div>
                              <mood.icon size={28} className="relative z-10" />
                            </div>
                            <span className={`text-lg font-bold transition-colors ${isActive ? 'text-white' : 'text-white/90'}`}>{mood.name}</span>
                            {isActive && <div className="absolute bottom-3 text-xs font-bold uppercase tracking-widest text-white animate-in fade-in">Activated</div>}
                            {isReorderingMoods && (
                              <div className="absolute inset-0 z-20 bg-black/80 rounded-[1.5rem] flex items-center justify-center gap-2 backdrop-blur-sm animate-in fade-in">
                                {index > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoodReorder(index, 'left');
                                    }}
                                    className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                                  >
                                    <Lucide.ChevronLeft size={16} />
                                  </button>
                                )}
                                {index < moods.length - 1 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoodReorder(index, 'right');
                                    }}
                                    className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform"
                                  >
                                    <Lucide.ChevronRight size={16} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!isReorderingMoods && <p className="text-xs text-white/20 mt-2 ml-2">Long press to reorder</p>}
                </div>

                <React.Suspense fallback={<div className="p-4">Loading weather…</div>}>
                  <ClockWeatherCard onClick={() => setShowWeatherModal(true)} time={time} locationName={locationName} weather={weatherData} className="md:col-span-1" />
                </React.Suspense>
                <React.Suspense fallback={<div className="p-4">Loading thermostat…</div>}>
                  <ThermostatCard currentThermo={currentThermo} onAdjust={adjustTemp} onNext={(e) => handleThermoChange('next', e)} onPrev={(e) => handleThermoChange('prev', e)} />
                </React.Suspense>

                <div className="md:col-span-2">
                  <div className="flex items-end justify-between mb-4 pr-2">
                    <div>
                      <h3 className="text-lg font-bold ml-1 text-white/90">Favorites</h3>
                      <p className="text-xs text-white/40 ml-1 mt-1">{lightsOnCount} lights on</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={turnAllOn} className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full border border-white/10 uppercase">All On</button>
                      <button onClick={turnAllOff} className="text-xs font-bold bg-white/15 hover:bg-white/25 text-white px-3 py-1.5 rounded-full border border-white/10 uppercase">All Off</button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {favoriteLights.map((light) => (
                      <Card
                        key={light.id}
                        active={light.on}
                        onClick={() => toggleLight(light.id)}
                        onLongPress={() => setActiveLightId(light.id)}
                        dimmerDelay={settings.lightDimmerDelay}
                        title={light.title}
                        subTitle={getLightSubtitle(light)}
                        icon={light.icon}
                        iconColor={light.iconColor}
                        className="aspect-[4/3]"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="md:col-span-4 flex flex-col gap-6">
                <div className="bg-[#1C1C1E] rounded-[1.2rem] aspect-[4/3] border border-white/10 relative overflow-hidden shadow-2xl group cursor-pointer">
                  <img
                    src="https://images.unsplash.com/photo-1502224562085-639556652f33?q=80&w=1000&auto=format&fit=crop"
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all duration-700"
                    alt="Camera Feed"
                  />
                  <div className="absolute top-4 left-4 bg-blue-500 p-2 rounded-lg">
                    <Lucide.Video className="text-white" size={20} />
                  </div>
                </div>
                <React.Suspense fallback={<div className="p-4">Loading family…</div>}>
                  <FamilyStatusCard members={family} />
                </React.Suspense>
                <Card
                  active={!isLocked}
                  onClick={() => {
                    setIsLocked((prev) => !prev);
                    if (security.entityId) {
                      const nextState = isLocked ? 'disarm' : 'arm_home';
                      haService.setSecurityArm(security.entityId, nextState).catch((err) => console.error('Failed to toggle security', err));
                    }
                  }}
                  title={security.title}
                  subTitle={isLocked ? 'Armed Home' : 'Disarmed'}
                  icon={isLocked ? Lucide.ShieldCheck : Lucide.ShieldAlert}
                  iconColor={isLocked ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}
                />
                <React.Suspense fallback={<div className="p-4">Loading player…</div>}>
                  <MediaPlayerCard isPlayingCompact={isPlayingCompact} setIsPlayingCompact={setIsPlayingCompact} expandDelay={settings.mediaExpandDelay} className="md:col-span-2 aspect-[2.5/1]" />
                </React.Suspense>
              </div>
            </div>

            {showWeatherModal && (
              <React.Suspense fallback={<div className="p-4">Loading weather…</div>}>
                <GoogleWeatherModal onClose={() => setShowWeatherModal(false)} locationName={locationName} weather={weatherData} />
              </React.Suspense>
            )}
            {showMagicMoodModal && (
              <React.Suspense fallback={<div className="p-4">Loading…</div>}>
                <MagicMoodModal onClose={() => setShowMagicMoodModal(false)} onAddMood={handleAddMood} />
              </React.Suspense>
            )}
            {activeLightId && (
              <LightControlModal
                light={lights.find((l) => l.id === activeLightId)}
                onClose={() => setActiveLightId(null)}
                onToggle={() => toggleLight(activeLightId)}
                onBrightnessChange={(val) => setLightBrightness(activeLightId, val)}
                onColorChange={(color) => updateLightColor(activeLightId, color)}
                onDelete={() => deleteLight(activeLightId)}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
