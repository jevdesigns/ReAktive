import React, { useEffect, useState, useCallback } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Slider from '../components/Slider';
import haService from '../services/haService';

const mapEntityToLight = (entity) => {
  const id = entity.entity_id || entity.entityId || '';
  const friendly = entity.attributes && (entity.attributes.friendly_name || entity.attributes.display_name) || id;
  const on = entity.state === 'on';
  const brightnessRaw = entity.attributes && entity.attributes.brightness ? entity.attributes.brightness : null;
  const brightness = brightnessRaw !== null ? Math.round((brightnessRaw / 255) * 100) : 0;
  return {
    id,
    title: friendly,
    on,
    brightness
  };
};

const LightsPage = ({ lights: initialLights = [], toggleLight: propToggleLight, setBrightness: propSetBrightness }) => {
  const [lights, setLights] = useState(initialLights.map(l => ({ id: l.id, title: l.title, on: l.on, brightness: l.brightness })));
  const [selectedLight, setSelectedLight] = useState(null);

  useEffect(() => {
    let mounted = true;

    const onStateChanged = (payload) => {
      // payload may be { entity_id, new_state, old_state } or event wrapper
      const entityId = payload.entity_id || (payload.event && payload.event.data && payload.event.data.entity_id);
      const newState = payload.new_state || (payload.event && payload.event.data && payload.event.data.new_state);
      if (!entityId) return;
      if (!entityId.startsWith('light.')) return;

      const mapped = mapEntityToLight(newState || payload);
      setLights(prev => {
        const exists = prev.some(p => p.id === entityId);
        if (exists) return prev.map(p => p.id === entityId ? mapped : p);
        return [...prev, mapped];
      });
    };

    (async () => {
      try {
        await haService.connectWebSocket();
      } catch (e) {
        console.warn('WS connect failed', e);
      }

      try {
        const all = await haService.discoverEntities();
        const mappedLights = (all.lights || []).map(mapEntityToLight);
        if (mounted) setLights(mappedLights);
      } catch (e) {
        console.warn('Discover entities failed', e);
      }

      // Subscribe to general state changes
      try {
        haService.subscribeToEntity('state_changed', onStateChanged);
      } catch (e) {
        console.warn('Subscribe failed', e);
      }
    })();

    return () => {
      mounted = false;
      try { haService.unsubscribeFromEntity('state_changed', onStateChanged); } catch (e) {}
      try { haService.disconnectWebSocket(); } catch (e) {}
    };
  }, []);

  const handleBrightnessChange = useCallback((brightness) => {
    const id = selectedLight?.id;
    if (!id) return;
    if (propSetBrightness) return propSetBrightness(id, brightness);
    // Call HA service
    haService.turnOnLight(id, brightness, null).catch(() => {});
  }, [selectedLight, propSetBrightness]);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">💡 Light Control</h1>

      {/* Group by room */}
      <div className="space-y-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-white/80">All Lights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {lights.map(light => (
              <Card
                key={light.id}
                title={light.title}
                active={light.on}
                onClick={() => {
                  if (propToggleLight) return propToggleLight(light.id);
                  if (light.on) haService.turnOffLight(light.id); else haService.turnOnLight(light.id);
                }}
                onLongPress={() => setSelectedLight(light)}
                className="aspect-square flex items-center justify-center relative group"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="text-5xl">{light.on ? '💡' : '🔦'}</div>
                  <div className="text-xs text-white/70 group-hover:text-white">
                    {light.brightness}%
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Favorites */}
        <div>
          <h2 className="text-2xl font-semibold mb-4 text-white/80">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card
              title="All On"
              icon="✅"
              onClick={() => lights.forEach(l => !l.on && (propToggleLight ? propToggleLight(l.id) : haService.turnOnLight(l.id)))}
              className="aspect-square flex items-center justify-center"
            >
              <div className="text-4xl">✅</div>
            </Card>
            <Card
              title="All Off"
              icon="❌"
              onClick={() => lights.forEach(l => l.on && (propToggleLight ? propToggleLight(l.id) : haService.turnOffLight(l.id)))}
              className="aspect-square flex items-center justify-center"
            >
              <div className="text-4xl">❌</div>
            </Card>
          </div>
        </div>
      </div>

      {/* Light Detail Modal */}
      <Modal
        isOpen={!!selectedLight}
        title={selectedLight?.title || ''}
        onClose={() => setSelectedLight(null)}
      >
        {selectedLight && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-white/5 rounded-lg">
              <div className="text-5xl">{selectedLight.on ? '💡' : '🔦'}</div>
              <div>
                <p className="text-white/50 text-sm">Status</p>
                <p className="text-xl font-semibold">{selectedLight.on ? 'On' : 'Off'}</p>
              </div>
            </div>

            <Slider
              label="Brightness"
              value={selectedLight.brightness}
              min={0}
              max={100}
              onChange={handleBrightnessChange}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { if (propToggleLight) propToggleLight(selectedLight.id); else { if (selectedLight.on) haService.turnOffLight(selectedLight.id); else haService.turnOnLight(selectedLight.id); } }}
                className="py-3 rounded-lg font-semibold transition-colors bg-blue-600 hover:bg-blue-500"
              >
                {selectedLight.on ? 'Turn Off' : 'Turn On'}
              </button>
              <button
                onClick={() => setSelectedLight(null)}
                className="py-3 rounded-lg font-semibold transition-colors bg-white/10 hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

  // Setup WebSocket and discovery
  LightsPage.displayName = 'LightsPage';

  export default LightsPage;

export default LightsPage;
