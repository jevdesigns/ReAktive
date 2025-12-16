import React, { useEffect, useRef, useState } from 'react';
import * as Lucide from 'lucide-react';
import haService from './services/haService';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const getGreeting = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  return 'Good Evening';
};

const callGemini = async (prompt, systemContext = '') => {
  if (!GEMINI_API_KEY) return "Sorry, I can't connect to Gemini right now.";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          systemInstruction: { parts: [{ text: systemContext }] },
        }),
      }
    );

    if (!response.ok) throw new Error('Gemini API failed');
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't generate a response.";
  } catch (error) {
    console.error('Gemini Error:', error);
    return "Sorry, I'm having trouble connecting to the AI right now.";
  }
};

const fetchGeoLocation = async (city, state) => {
  try {
    const query = `${city}, ${state}`;
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
    return null;
  } catch (error) {
    return null;
  }
};

const fetchWeather = async (lat, lon) => {
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&hourly=temperature_2m,weather_code&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=8`);
    return await response.json();
  } catch (error) {
    return null;
  }
};

const getWeatherIcon = (code) => {
  if (code === 0) return { icon: Lucide.Sun, label: 'Clear' };
  if (code >= 1 && code <= 3) return { icon: Lucide.CloudSun, label: 'Partly Cloudy' };
  if (code >= 45 && code <= 48) return { icon: Lucide.CloudFog, label: 'Fog' };
  if (code >= 51 && code <= 67) return { icon: Lucide.CloudRain, label: 'Rain' };
  if (code >= 71 && code <= 77) return { icon: Lucide.Snowflake, label: 'Snow' };
  if (code >= 80 && code <= 82) return { icon: Lucide.CloudRain, label: 'Showers' };
  if (code >= 95 && code <= 99) return { icon: Lucide.CloudLightning, label: 'Thunderstorm' };
  return { icon: Lucide.Cloud, label: 'Cloudy' };
};

const lightPalette = ['text-amber-500', 'text-blue-500', 'text-emerald-500', 'text-rose-500', 'text-purple-500', 'text-cyan-400'];
const lightIconMatches = [
  { pattern: /kitchen|dining/i, icon: Lucide.Utensils, color: 'text-amber-500' },
  { pattern: /garage/i, icon: Lucide.Car, color: 'text-slate-500' },
  { pattern: /bed|sleep/i, icon: Lucide.BedDouble, color: 'text-indigo-500' },
  { pattern: /living|den|family/i, icon: Lucide.Armchair, color: 'text-orange-500' },
  { pattern: /hall|foyer|entry/i, icon: Lucide.DoorOpen, color: 'text-blue-500' },
  { pattern: /outside|exterior|porch|patio|deck/i, icon: Lucide.TreePine, color: 'text-green-500' },
  { pattern: /office|study/i, icon: Lucide.Laptop, color: 'text-cyan-400' },
];

const pickLightIcon = (name, index) => {
  const match = lightIconMatches.find((m) => m.pattern.test(name));
  if (match) return { icon: match.icon, color: match.color };
  return { icon: Lucide.Lightbulb, color: lightPalette[index % lightPalette.length] };
};

const toBrightnessPercent = (attributes = {}) => {
  if (typeof attributes.brightness === 'number') {
    return Math.round((attributes.brightness / 255) * 100);
  }
  if (typeof attributes.percentage === 'number') return Math.round(attributes.percentage);
  if (typeof attributes.brightness_pct === 'number') return Math.round(attributes.brightness_pct);
  return 0;
};

const mapLightEntity = (entity, index) => {
  const id = entity.entity_id;
  const attrs = entity.attributes || {};
  const friendly = attrs.friendly_name || id;
  const { icon, color } = pickLightIcon(friendly, index);
  const brightness = toBrightnessPercent(attrs);

  return {
    id,
    title: friendly,
    on: entity.state === 'on',
    brightness,
    icon,
    iconColor: color,
    isFavorite: index < 6,
    isSwitch: entity.entity_id.startsWith('switch.'),
  };
};

const mapClimateEntity = (entity, index) => {
  const attrs = entity.attributes || {};
  const current = typeof attrs.current_temperature === 'number' ? attrs.current_temperature : Number(entity.state) || 72;
  const target = typeof attrs.temperature === 'number' ? attrs.temperature : current;
  return {
    id: entity.entity_id,
    entityId: entity.entity_id,
    name: attrs.friendly_name || `Thermostat ${index + 1}`,
    temp: current,
    targetTemp: target,
    status: attrs.hvac_action || entity.state || 'idle',
    min: attrs.min_temp || 60,
    max: attrs.max_temp || 85,
  };
};

const mapSecurityEntity = (entity) => {
  const armed = entity.state?.startsWith('armed');
  return {
    entityId: entity.entity_id,
    title: entity.attributes?.friendly_name || 'Security System',
    armed,
    mode: entity.state || 'disarmed',
  };
};

const Card = ({
  className = '',
  title,
  icon: Icon,
  subTitle,
  onClick,
  active,
  iconColor,
  onLongPress,
  dimmerDelay = 800,
  children,
}) => {
  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  const handleStart = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      if (onLongPress) {
        isLongPress.current = true;
        onLongPress();
      }
    }, dimmerDelay);
  };

  const handleCancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const handleEnd = () => {
    handleCancel();
    if (!isLongPress.current && onClick) {
      onClick();
    }
    setTimeout(() => {
      isLongPress.current = false;
    }, 100);
  };

  return (
    <div
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleCancel}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchMove={handleCancel}
      className={`
        relative overflow-hidden rounded-[1.2rem] p-3 flex flex-col justify-between transition-all duration-300 cursor-pointer select-none
        shadow-sm backdrop-blur-xl border border-white/5
        ${
          active
            ? 'bg-white/90 text-black shadow-[0_0_30px_rgba(255,255,255,0.1)] scale-[1.02] border-transparent'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10 hover:border-white/20 backdrop-blur-2xl'
        }
        ${className}
      `}
    >
      <div className="flex justify-between items-start">
        <div className={`rounded-full p-0 ${active ? iconColor : 'text-white/80'}`}>
          {Icon && <Icon size={24} fill={active ? 'currentColor' : 'none'} />}
        </div>
        {children}
      </div>

      <div className="mt-2 flex flex-col overflow-hidden">
        {title && <h3 className="font-semibold text-[15px] leading-tight tracking-tight truncate">{title}</h3>}
        {subTitle && <p className={`text-[11px] font-medium truncate ${active ? 'opacity-70' : 'text-white/50'}`}>{subTitle}</p>}
      </div>
    </div>
  );
};

const ThermostatCard = ({ currentThermo, onAdjust, onNext, onPrev }) => (
  <div className="md:col-span-1 bg-[#1C1C1E] border border-white/10 rounded-[1.2rem] p-6 relative overflow-hidden flex flex-col justify-between min-h-[220px] shadow-2xl">
    <div className="absolute top-0 left-0 right-0 h-2/3 bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
    <div className="flex flex-col items-center justify-center flex-1 gap-2 mt-2 relative z-10">
      <div className="relative mb-1">
        <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-500 shadow-lg shadow-orange-500/10">
          <Lucide.Flame size={32} />
        </div>
        <div className="absolute top-0 right-0 w-6 h-6 bg-orange-500 border-4 border-[#1C1C1E] rounded-full flex items-center justify-center text-[#1C1C1E]">
          <Lucide.Flame size={10} fill="currentColor" />
        </div>
      </div>
      <div className="text-center">
        <div className="flex items-center gap-3 justify-center">
          <button onClick={onPrev} className="text-white/20 hover:text-white transition-colors">
            <Lucide.ChevronLeft size={20} />
          </button>
          <h3 className="text-2xl font-bold text-white leading-tight">{currentThermo?.name || 'Thermostat'}</h3>
          <button onClick={onNext} className="text-white/20 hover:text-white transition-colors">
            <Lucide.ChevronRight size={20} />
          </button>
        </div>
        <p className="text-base text-white/50 font-medium mt-1">Heat • {currentThermo?.temp ?? '--'}°</p>
      </div>
    </div>
    <div className="flex items-center gap-3 mt-6 relative z-10">
      <div className="flex-1 bg-white/5 rounded-[1rem] h-14 flex items-center justify-between px-1.5 border border-white/5">
        <button onClick={(e) => onAdjust(-1, e)} className="w-12 h-full hover:bg-white/10 rounded-xl flex items-center justify-center text-white/80 hover:text-white transition-colors active:scale-90">
          <Lucide.Minus size={24} />
        </button>
        <span className="text-2xl font-bold text-white tabular-nums">{currentThermo?.temp ?? '--'}</span>
        <button onClick={(e) => onAdjust(1, e)} className="w-12 h-full hover:bg-white/10 rounded-xl flex items-center justify-center text-white/80 hover:text-white transition-colors active:scale-90">
          <Lucide.Plus size={24} />
        </button>
      </div>
      <button className="w-14 h-14 bg-white/5 rounded-[1rem] border border-white/5 flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors active:scale-95">
        <Lucide.Power size={24} />
      </button>
    </div>
  </div>
);

const ClockWeatherCard = ({ onClick, time, locationName, weather, className }) => {
  const currentTemp = weather?.current?.temperature_2m ? Math.round(weather.current.temperature_2m) : '--';
  const weatherCode = weather?.current?.weather_code || 0;
  const weatherInfo = getWeatherIcon(weatherCode);
  const WeatherIcon = weatherInfo.icon;

  const hourlyData = [1, 2, 3].map((offset) => {
    const code = weather?.hourly?.weather_code?.[offset] || 0;
    const temp = weather?.hourly?.temperature_2m?.[offset];
    const info = getWeatherIcon(code);
    return { label: `+${offset}h`, Icon: info.icon, temp: temp ? `${Math.round(temp)}°` : '--' };
  });

  const forecastItems = [{ label: 'Now', Icon: WeatherIcon, temp: `${currentTemp}°` }, ...hourlyData];

  return (
    <div
      onClick={onClick}
      className={`${className} bg-[#1C1C1E] rounded-[1.2rem] p-4 flex flex-col justify-between relative overflow-hidden border border-white/10 shadow-xl min-h-[220px] group cursor-pointer hover:border-white/20 transition-all`}
    >
      <div className="flex justify-between items-start z-10">
        <div>
          <div className="flex items-center gap-1.5 text-orange-400 mb-0.5">
            <Lucide.MapPin size={14} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{locationName.city}</span>
          </div>
          <h3 className="text-lg font-bold text-white leading-none">{locationName.state}</h3>
        </div>
        <div className="text-right">
          <span className="block text-2xl font-bold text-white">{currentTemp}°</span>
          <span className="text-[10px] text-white/50 uppercase tracking-wider font-bold">{weatherInfo.label}</span>
        </div>
      </div>
      <div className="flex items-center justify-center z-10 mt-2 mb-2">
        <div className="w-20 h-20 bg-gradient-to-tr from-orange-400 to-yellow-300 rounded-full blur-[2px] opacity-80 animate-pulse-soft flex items-center justify-center shadow-[0_0_20px_rgba(251,146,60,0.4)]">
          <WeatherIcon size={40} className="text-white mix-blend-overlay" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 z-10 border-t border-white/5 pt-3">
        {forecastItems.map((item, i) => (
          <div key={i} className="flex flex-col items-center bg-white/5 rounded-2xl p-3 backdrop-blur-sm">
            <span className="text-[9px] text-white/40 font-bold uppercase">{item.label}</span>
            <item.Icon size={14} className="text-white/80 my-1" />
            <span className="text-[10px] font-medium text-white">{item.temp}</span>
          </div>
        ))}
      </div>
      <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
    </div>
  );
};

const MediaPlayerCard = ({ isPlayingCompact, setIsPlayingCompact, expandDelay = 800, className }) => {
  const longPressTimer = useRef(null);

  const handlePressStart = () => {
    longPressTimer.current = setTimeout(() => {}, expandDelay);
  };
  const handlePressEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };
  const handleClick = () => setIsPlayingCompact(true);

  return (
    <div
      onClick={handleClick}
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
      onMouseLeave={handlePressEnd}
      className={`${className} relative aspect-[2.5/1] rounded-[1.2rem] overflow-hidden bg-black group border border-white/10 shadow-xl cursor-pointer select-none md:col-span-2`}
    >
      <img
        src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=1000&auto=format&fit=crop"
        alt="Album Art"
        className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-110 transition-transform duration-700 ease-out"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
      <div className="absolute inset-0 p-4 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/10">
            <Lucide.Music size={16} />
          </div>
          <div className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md uppercase tracking-wider border border-green-500/20">Spotify</div>
        </div>
        <div>
          <h3 className="text-2xl font-bold mb-1 leading-tight">Midnight City</h3>
          <p className="text-white/60 mb-6 text-sm font-medium">M83 · Hurry Up, We're Dreaming</p>
        </div>
      </div>
    </div>
  );
};

const LightControlModal = ({ light, onClose, onBrightnessChange, onColorChange, onDelete, onToggle }) => {
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const availableColors = ['text-blue-500', 'text-orange-500', 'text-emerald-500', 'text-purple-500', 'text-rose-500'];

  const handleDragStart = (e) => {
    setIsDragging(true);
    handleDrag(e);
  };
  const handleDragEnd = () => setIsDragging(false);
  const handleDrag = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const height = rect.height;
    const bottom = rect.bottom;
    let offsetY = bottom - clientY;
    if (offsetY < 0) offsetY = 0;
    if (offsetY > height) offsetY = height;
    const percentage = Math.round((offsetY / height) * 100);
    onBrightnessChange(percentage);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('mousemove', handleDrag);
      window.addEventListener('touchend', handleDragEnd);
      window.addEventListener('touchmove', handleDrag);
    } else {
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
    }
    return () => {
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('mousemove', handleDrag);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchmove', handleDrag);
    };
  }, [isDragging]);

  const getSliderStyle = (brightness) => {
    const g = Math.max(180, 255 - brightness * 0.75);
    const b = Math.max(0, 255 - brightness * 2.5);
    const color = `rgb(255, ${g}, ${b})`;
    return { height: `${brightness}%`, backgroundColor: color, opacity: 0.6 + brightness / 250, boxShadow: `0 0 ${brightness * 0.5}px ${color}` };
  };

  if (!light) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300" onClick={onClose}>
      <div className="bg-[#1C1C1E] w-full max-w-sm rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">{light.title}</h2>
            <p className="text-white/50 text-sm">{light.on ? 'On' : 'Off'} • {light.brightness}%</p>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors">
            <Lucide.X size={20} />
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center mb-10">
          <div
            ref={sliderRef}
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
            className="relative h-64 w-28 bg-white/10 rounded-[2rem] overflow-hidden border border-white/5 cursor-pointer touch-none"
          >
            <div className="absolute bottom-0 left-0 right-0 transition-all duration-75 ease-out" style={getSliderStyle(light.brightness)} />
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-end pb-6 transition-colors duration-300">
              <Lucide.Sun size={32} className={light.brightness > 60 ? 'text-black/80' : 'text-white'} />
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="flex justify-between">
            {availableColors.map((colorClass) => (
              <button
                key={colorClass}
                onClick={() => onColorChange(colorClass)}
                className={`w-10 h-10 rounded-full ${colorClass.replace('text-', 'bg-')} border-2 ${light.iconColor === colorClass ? 'border-white scale-110' : 'border-transparent'} transition-all`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={onToggle} className={`py-4 rounded-2xl font-bold text-sm transition-colors ${light.on ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              {light.on ? 'Turn Off' : 'Turn On'}
            </button>
            <button onClick={() => { onDelete(); onClose(); }} className="py-4 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold text-sm transition-colors">
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MoodButton = ({ name, icon: Icon, color, onClick, animationClass, isReordering, onMoveLeft, onMoveRight, isFirst, isLast }) => {
  const timerRef = useRef(null);
  const isLongPress = useRef(false);

  const handleStart = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      if (onClick) onClick(true);
    }, 800);
  };

  const handleEnd = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!isLongPress.current && onClick && !isReordering) {
      onClick(false);
    }
  };

  return (
    <div
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onMouseLeave={() => clearTimeout(timerRef.current)}
      className={`
        relative flex flex-col items-center justify-center gap-2 p-3 rounded-[1.5rem] border transition-all duration-300 w-[130px] h-[130px] cursor-pointer overflow-hidden
        bg-white/10 hover:bg-white/15 border-white/10 hover:border-white/20 backdrop-blur-md
        ${isReordering ? 'animate-wiggle' : ''}
      `}
    >
      <div className={`p-3 rounded-full ${color} text-white shadow-lg relative overflow-hidden transition-transform duration-300`}>
        <div className={`absolute inset-0 ${animationClass} pointer-events-none`}></div>
        <Icon size={24} className="relative z-10" />
      </div>
      <span className="text-base font-normal text-white/90">{name}</span>
      {isReordering && (
        <div className="absolute inset-0 z-20 bg-black/80 rounded-[1.5rem] flex items-center justify-center gap-2 backdrop-blur-sm animate-in fade-in">
          {!isFirst && (
            <button onClick={(e) => { e.stopPropagation(); onMoveLeft(); }} className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
              <Lucide.ChevronLeft size={16} />
            </button>
          )}
          {!isLast && (
            <button onClick={(e) => { e.stopPropagation(); onMoveRight(); }} className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
              <Lucide.ChevronRight size={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const SceneButton = ({ name, icon: Icon, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center gap-4 p-4 rounded-[1.2rem] bg-white/10 hover:bg-white/15 border border-white/10 transition-all w-full h-full backdrop-blur-md active:scale-95"
  >
    <div className={`p-4 rounded-full ${color} text-white shadow-lg`}>
      <Icon size={24} />
    </div>
    <span className="text-base font-normal text-white/90">{name}</span>
  </button>
);

const FamilyStatusCard = ({ members }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'home':
        return 'border-green-500';
      case 'work':
        return 'border-orange-500';
      case 'school':
        return 'border-blue-500';
      default:
        return 'border-red-500';
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-[1.2rem] p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Family</h3>
        <div className="bg-white/10 p-1.5 rounded-full">
          <Lucide.Users size={16} className="text-white/70" />
        </div>
      </div>
      <div className="flex justify-between items-center px-1">
        {members.map((member) => (
          <div key={member.id} className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className={`p-0.5 rounded-full border-2 ${getStatusColor(member.status)} transition-transform group-hover:scale-105`}>
              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover opacity-90 group-hover:opacity-100" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-xs font-bold leading-tight">{member.name}</p>
              <p className="text-[10px] text-white/50 uppercase tracking-wider font-medium">{member.status}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const GoogleWeatherModal = ({ onClose, locationName }) => (
  <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300" onClick={onClose}>
    <div
      className="bg-[#18181b] w-full max-w-3xl rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden relative p-8 flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onClose} className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 p-2 rounded-full text-white transition-colors">
        <Lucide.X size={20} />
      </button>
      <div className="text-white text-center">
        <h2 className="text-2xl font-bold">Weather Details</h2>
        <p className="text-white/60 mt-2">Extended forecast for {locationName.city}, {locationName.state} coming soon.</p>
      </div>
    </div>
  </div>
);

const AllLightsView = ({ lights, toggleLight, setLightBrightness, setActiveLightId, settings }) => {
  const getLightSubtitle = (light) => {
    if (!light.on) return 'Off';
    return `${light.brightness}% Brightness`;
  };

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-yellow-500/20 text-yellow-500 rounded-2xl shadow-lg border border-yellow-500/20">
          <Lucide.Lightbulb size={24} />
        </div>
        <h2 className="text-3xl font-bold text-white">All Lights</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {lights.map((light) => (
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
  );
};

const AssistantView = ({ dashboardState }) => {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Hello! I am your home concierge. Ask me about the weather, security status, or for a briefing.' },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const context = `
      You are a smart home concierge living in a dashboard.
      Current Home State:
      - Weather: ${JSON.stringify(dashboardState.weather?.current || 'Unknown')}
      - Location: ${dashboardState.location.city}, ${dashboardState.location.state}
      - Security: ${dashboardState.isLocked ? 'Armed' : 'Disarmed'}
      - Thermostat: ${dashboardState.thermo.temp}°F (${dashboardState.thermo.status})
      - Family: ${JSON.stringify(dashboardState.family)}
      - Active Lights: ${dashboardState.lights.filter((l) => l.on).length} lights are on.
      Provide helpful, concise answers. If asked for a briefing, summarize the key points.
    `;

    const reply = await callGemini(userMsg.text, context);
    setMessages((prev) => [...prev, { role: 'system', text: reply }]);
    setIsLoading(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto h-full flex flex-col animate-in fade-in zoom-in-95 duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl shadow-lg">
          <Lucide.Sparkles className="text-white" size={24} />
        </div>
        <h2 className="text-3xl font-bold text-white">Concierge</h2>
      </div>

      <div className="flex-1 bg-[#1C1C1E]/80 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-6 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2 scrollbar-hide">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white/10 text-white/90 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && <div className="text-white/40 text-xs ml-4 animate-pulse">Thinking...</div>}
        </div>

        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask me anything..."
            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-4 pr-12 text-white focus:outline-none focus:border-blue-500 transition-colors"
          />
          <button
            onClick={handleSend}
            className="absolute right-2 top-2 bottom-2 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
          >
            <Lucide.Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

const MagicMoodModal = ({ onClose, onAddMood }) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) return;
    setIsLoading(true);

    const systemPrompt = `
        You are a UI generator. Based on the user's mood description, generate a JSON object for a smart home button.
        Output JSON ONLY. No markdown.
        Format: { "name": "Short Name", "color": "text-color-500", "icon": "LucideIconName" }
        Available colors: text-red-500, text-blue-500, text-green-500, text-yellow-500, text-purple-500, text-pink-500, text-orange-500.
        Common Icons: Sun, Moon, Coffee, Book, Gamepad, Tv, Music, Heart, Cloud, Zap, Home.
     `;

    try {
      const jsonString = await callGemini(prompt, systemPrompt);
      const cleanJson = jsonString.replace(/```json|```/g, '').trim();
      const moodData = JSON.parse(cleanJson);

      if (moodData.icon && Lucide[moodData.icon]) {
        onAddMood({ ...moodData, icon: Lucide[moodData.icon], animation: 'pulse-soft' });
        onClose();
      } else {
        alert('Could not generate a valid icon. Try again.');
      }
    } catch (e) {
      console.error('Mood Gen Error', e);
      alert('Failed to generate mood.');
    }
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-300" onClick={onClose}>
      <div
        className="bg-[#1C1C1E] w-full max-w-md rounded-[2rem] border border-white/10 shadow-2xl p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-white/50 hover:text-white">
          <Lucide.X size={24} />
        </button>
        <div className="flex items-center gap-3 mb-6 text-purple-400">
          <Lucide.Wand2 size={32} />
          <h2 className="text-2xl font-bold text-white">Magic Mood</h2>
        </div>
        <p className="text-white/60 mb-6">Describe a scene (e.g., "Romantic Dinner", "Focus Time", "Party Mode") and AI will create a tile for it.</p>

        <input
          autoFocus
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter a vibe..."
          className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-white mb-6 focus:border-purple-500 focus:outline-none"
        />

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:opacity-90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? <Lucide.Loader2 className="animate-spin" /> : (<><Lucide.Sparkles size={20} /> Generate</>)}
        </button>
      </div>
    </div>
  );
};

const SettingsView = ({ settings, setSettings, onClose, coords, setCoords, locationName, setLocationName, onUpdateWeather }) => {
  const handleLocationUpdate = async () => {
    const newCoords = await fetchGeoLocation(locationName.city, locationName.state);
    if (newCoords) {
      setCoords(newCoords);
      onUpdateWeather(newCoords);
    }
    onClose();
  };

  return (
    <div className="p-8 animate-in fade-in duration-500 max-w-[1000px] mx-auto">
      <div className="flex justify-between items-end mb-10">
        <div>
          <h2 className="text-4xl font-bold mb-2">Settings</h2>
          <p className="text-white/50">Configure dashboard behaviors.</p>
        </div>
        <button
          onClick={handleLocationUpdate}
          className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-colors"
        >
          <Lucide.Check size={20} />
          Save & Close
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white/5 rounded-[1.2rem] p-8 border border-white/10 backdrop-blur-md">
          <h3 className="text-xl font-bold mb-6 flex items-center gap-3">
            <Lucide.MapPin className="text-red-400" />
            Weather Location
          </h3>
          <p className="text-xs text-white/40 mb-6">Set location for Weather and Display Name.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">City Name</label>
                <input
                  type="text"
                  value={locationName.city}
                  onChange={(e) => setLocationName((l) => ({ ...l, city: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">State</label>
                <input
                  type="text"
                  value={locationName.state}
                  onChange={(e) => setLocationName((l) => ({ ...l, state: e.target.value }))}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white/5 rounded-[1.2rem] p-8 border border-white/10 backdrop-blur-md space-y-4">
          <h3 className="text-xl font-bold mb-2">Interactions</h3>
          <label className="block text-xs font-bold uppercase tracking-wider text-white/50">Long-press to dim</label>
          <input
            type="range"
            min="300"
            max="1500"
            step="50"
            value={settings.lightDimmerDelay}
            onChange={(e) => setSettings((s) => ({ ...s, lightDimmerDelay: Number(e.target.value) }))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
};

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
          <AssistantView dashboardState={{ weather: weatherData, location: locationName, lights, thermo: currentThermo || { temp: 0, status: 'idle' }, isLocked, family }} />
        ) : activeTab === 'rooms' ? (
          <AllLightsView lights={lights} toggleLight={toggleLight} setLightBrightness={setLightBrightness} setActiveLightId={setActiveLightId} settings={settings} />
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

                <ClockWeatherCard onClick={() => setShowWeatherModal(true)} time={time} locationName={locationName} weather={weatherData} className="md:col-span-1" />
                <ThermostatCard currentThermo={currentThermo} onAdjust={adjustTemp} onNext={(e) => handleThermoChange('next', e)} onPrev={(e) => handleThermoChange('prev', e)} />

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
                <FamilyStatusCard members={family} />
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
                <MediaPlayerCard isPlayingCompact={isPlayingCompact} setIsPlayingCompact={setIsPlayingCompact} expandDelay={settings.mediaExpandDelay} className="md:col-span-2 aspect-[2.5/1]" />
              </div>
            </div>

            {showWeatherModal && <GoogleWeatherModal onClose={() => setShowWeatherModal(false)} locationName={locationName} weather={weatherData} />}
            {showMagicMoodModal && <MagicMoodModal onClose={() => setShowMagicMoodModal(false)} onAddMood={handleAddMood} />}
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
