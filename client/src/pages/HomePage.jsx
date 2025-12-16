import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import haService from '../services/haService';

const HomePage = ({ time, weather, location, lights, climate, security, toggleLight }) => {
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const getGreeting = (date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const [localLights, setLocalLights] = useState(lights);
  const [localClimate, setLocalClimate] = useState(climate);
  const [localSecurity, setLocalSecurity] = useState(security);

  const lightsOn = (localLights || []).filter(l => l.on).length;

  useEffect(() => {
    let mounted = true;

    const mapEntityToLight = (entity) => {
      const id = entity.entity_id || entity.entityId || '';
      const friendly = (entity.attributes && (entity.attributes.friendly_name || entity.attributes.display_name)) || id;
      const on = entity.state === 'on';
      const brightnessRaw = entity.attributes && entity.attributes.brightness ? entity.attributes.brightness : null;
      const brightness = brightnessRaw !== null ? Math.round((brightnessRaw / 255) * 100) : 0;
      return { id, title: friendly, on, brightness };
    };

    const mapEntityToClimate = (entity) => {
      const attrs = entity.attributes || {};
      return {
        id: entity.entity_id,
        title: attrs.friendly_name || entity.entity_id,
        temperature: attrs.current_temperature || localClimate.temperature || 72,
        targetTemp: attrs.temperature || localClimate.targetTemp || 72,
        humidity: attrs.current_humidity || localClimate.humidity || 45,
        mode: attrs.hvac_mode || localClimate.mode || 'heat',
        status: entity.state || localClimate.status || 'off'
      };
    };

    const mapEntityToSecurity = (entity) => {
      const attrs = entity.attributes || {};
      return {
        id: entity.entity_id,
        title: attrs.friendly_name || entity.entity_id,
        armed: entity.state === 'armed_home' || entity.state === 'armed_away',
        mode: entity.state
      };
    };

    const onStateChanged = (payload) => {
      const entityId = payload.entity_id || (payload.event && payload.event.data && payload.event.data.entity_id);
      const newState = payload.new_state || (payload.event && payload.event.data && payload.event.data.new_state);
      if (!entityId || !mounted) return;

      try {
        if (entityId.startsWith('light.')) {
          const mapped = mapEntityToLight(newState || payload);
          setLocalLights(prev => {
            const exists = (prev || []).some(p => p.id === mapped.id);
            if (exists) return prev.map(p => p.id === mapped.id ? mapped : p);
            return [...(prev || []), mapped];
          });
        } else if (entityId.startsWith('climate.')) {
          const mapped = mapEntityToClimate(newState || payload);
          setLocalClimate(mapped);
        } else if (entityId.startsWith('alarm_control_panel.')) {
          const mapped = mapEntityToSecurity(newState || payload);
          setLocalSecurity(prev => ({ ...prev, armed: mapped.armed, mode: mapped.mode }));
        } else if (entityId.startsWith('camera.')) {
          setLocalSecurity(prev => ({ ...prev, cameras: Array.isArray(prev.cameras) ? prev.cameras : [] }));
          // For now cameras are handled via discovery below
        }
      } catch (e) {
        console.error('Error handling state_changed in HomePage:', e);
      }
    };

    (async () => {
      try {
        await haService.connectWebSocket();
      } catch (e) {
        console.warn('HA WS connect failed in HomePage', e);
      }

      try {
        const all = await haService.discoverEntities();
        if (!mounted) return;

        const mappedLights = (all.lights || []).map(mapEntityToLight);
        const mappedClimate = (all.climate && all.climate.length > 0) ? mapEntityToClimate(all.climate[0]) : localClimate;
        const securityEntities = all.security || [];
        const mappedSecurity = securityEntities.length > 0 ? mapEntityToSecurity(securityEntities[0]) : localSecurity;
        const cameras = (all.cameras || []).map(c => ({ id: c.entity_id, name: c.attributes?.friendly_name || c.entity_id, status: c.state === 'streaming' ? 'online' : c.state, recording: !!c.attributes?.is_recording }));

        setLocalLights(mappedLights);
        setLocalClimate(mappedClimate);
        setLocalSecurity(prev => ({ ...prev, ...mappedSecurity, cameras, doors: prev.doors || [] }));
      } catch (e) {
        console.warn('HomePage discovery failed', e);
      }

      try {
        haService.subscribeToEntity('state_changed', onStateChanged);
      } catch (e) {
        console.warn('HomePage subscribe failed', e);
      }
    })();

    return () => {
      mounted = false;
      try { haService.unsubscribeFromEntity('state_changed', onStateChanged); } catch (e) {}
    };
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-12">
        <div>
          <p className="text-blue-400 text-sm font-semibold mb-2 uppercase tracking-wider">
            {formatDate(time)}
          </p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            {getGreeting(time)}
          </h1>
        </div>
        <div className="text-right">
          <div className="text-5xl font-bold font-mono">{formatTime(time)}</div>
          <div className="text-white/50 mt-2">{location.city}</div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card title={`${lightsOn}/${(localLights || []).length} Lights`} icon="💡" active={lightsOn > 0} />
        <Card title={`${localClimate.targetTemp}°F`} icon="🌡️" active={localClimate.status === 'heating'} />
        <Card title={localSecurity.armed ? 'Armed' : 'Disarmed'} icon="🔐" active={localSecurity.armed} />
        <Card title={`${weather.temp}°`} icon="☀️" />
      </div>

      {/* Lights Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          💡 Lights
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(localLights || []).map(light => (
            <Card
              key={light.id}
              title={light.title}
              active={light.on}
              onClick={() => (toggleLight ? toggleLight(light.id) : haService.turnOnLight(light.id))}
              className="aspect-square flex items-center justify-center"
            >
              <div className="text-4xl">{light.on ? '💡' : '🔦'}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Climate Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">🌡️ Climate</h2>
        <Card className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm text-white/50">Current Temp</div>
              <div className="text-4xl font-bold">{localClimate.temperature}°F</div>
            </div>
            <div>
              <div className="text-sm text-white/50">Target</div>
              <div className="text-4xl font-bold">{localClimate.targetTemp}°F</div>
            </div>
            <div>
              <div className="text-sm text-white/50">Humidity</div>
              <div className="text-4xl font-bold">{localClimate.humidity}%</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Security Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🔐 Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={localSecurity.armed ? 'System Armed' : 'System Disarmed'} active={localSecurity.armed} />
          <Card title={`${(localSecurity.cameras || []).length} Cameras Online`} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
