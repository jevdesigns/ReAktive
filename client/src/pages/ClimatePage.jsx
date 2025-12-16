import React, { useEffect, useState } from 'react';
import Card from '../components/Card';
import Slider from '../components/Slider';
import haService from '../services/haService';

const mapEntityToClimate = (entity) => {
  const attrs = entity.attributes || {};
  const current = attrs.current_temperature || attrs.temperature || (typeof entity.state === 'number' ? entity.state : parseFloat(entity.state) || 0);
  const target = attrs.temperature || attrs.target_temp || attrs.target_temperature || attrs.current_temperature || 72;
  const humidity = attrs.humidity || 0;
  const mode = attrs.hvac_mode || entity.state || 'off';
  const status = attrs.status || (mode === 'heat' ? 'heating' : 'idle');
  return {
    id: entity.entity_id,
    temperature: current,
    targetTemp: target,
    humidity,
    mode,
    status
  };
};

const ClimatePage = ({ climate: initialClimate = null, adjustTemperature: propAdjustTemperature, setClimateMode: propSetClimateMode }) => {
  const modes = ['heat', 'cool', 'auto', 'off'];
  const [climate, setClimate] = useState(initialClimate || { temperature: 72, targetTemp: 72, humidity: 0, mode: 'off', status: 'idle' });

  useEffect(() => {
    let mounted = true;

    const onStateChanged = (payload) => {
      const entityId = payload.entity_id || (payload.event && payload.event.data && payload.event.data.entity_id);
      const newState = payload.new_state || (payload.event && payload.event.data && payload.event.data.new_state);
      if (!entityId) return;
      if (!entityId.startsWith('climate.')) return;
      const mapped = mapEntityToClimate(newState || payload);
      if (mounted) setClimate(mapped);
    };

    (async () => {
      try { await haService.connectWebSocket(); } catch (e) { console.warn(e); }
      try {
        const all = await haService.discoverEntities();
        const first = (all.climate && all.climate[0]) || null;
        if (first && mounted) setClimate(mapEntityToClimate(first));
      } catch (e) { console.warn(e); }

      try { haService.subscribeToEntity('state_changed', onStateChanged); } catch (e) {}
    })();

    return () => {
      mounted = false;
      try { haService.unsubscribeFromEntity('state_changed', onStateChanged); } catch (e) {}
      try { haService.disconnectWebSocket(); } catch (e) {}
    };
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">🌡️ Climate Control</h1>

      {/* Current Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="text-sm text-white/50">Current Temperature</div>
          <div className="text-5xl font-bold mt-2">{climate.temperature}°F</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-white/50">Target Temperature</div>
          <div className="text-5xl font-bold mt-2">{climate.targetTemp}°F</div>
        </Card>
        <Card className="p-6">
          <div className="text-sm text-white/50">Humidity</div>
          <div className="text-5xl font-bold mt-2">{climate.humidity}%</div>
        </Card>
      </div>

      {/* Temperature Control */}
      <Card className="p-8 mb-8">
        <h2 className="text-2xl font-bold mb-6">Adjust Temperature</h2>
        
        <div className="flex items-center justify-between mb-8 bg-white/5 rounded-2xl p-6">
          <button
            onClick={() => {
              if (propAdjustTemperature) return propAdjustTemperature(-1);
              const id = climate.id;
              const target = Math.round((climate.targetTemp || 72) - 1);
              haService.setTemperature(id, target).catch(() => {});
            }}
            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-2xl font-bold transition-colors"
          >
            −
          </button>
          <div className="text-6xl font-bold">{climate.targetTemp}°</div>
          <button
            onClick={() => {
              if (propAdjustTemperature) return propAdjustTemperature(1);
              const id = climate.id;
              const target = Math.round((climate.targetTemp || 72) + 1);
              haService.setTemperature(id, target).catch(() => {});
            }}
            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-2xl font-bold transition-colors"
          >
            +
          </button>
        </div>

          <Slider
          label="Fine Tune"
          value={climate.targetTemp}
          min={60}
          max={85}
          onChange={(val) => {
            const delta = val - climate.targetTemp;
            if (propAdjustTemperature) {
              for (let i = 0; i < Math.abs(delta); i++) {
                propAdjustTemperature(delta > 0 ? 1 : -1);
              }
            } else {
              const id = climate.id;
              haService.setTemperature(id, val).catch(() => {});
            }
          }}
        />
      </Card>

      {/* Mode Selection */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Mode</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {modes.map(mode => (
            <Card
              key={mode}
              title={mode.charAt(0).toUpperCase() + mode.slice(1)}
              active={climate.mode === mode}
              onClick={() => {
                if (propSetClimateMode) return propSetClimateMode(mode);
                const id = climate.id;
                haService.callService('climate', 'set_hvac_mode', { entity_id: id, hvac_mode: mode }).catch(() => {});
              }}
              icon={mode === 'heat' ? '🔥' : mode === 'cool' ? '❄️' : '🔄'}
              className="aspect-square flex items-center justify-center"
            >
              <div className="text-4xl">{mode === 'heat' ? '🔥' : mode === 'cool' ? '❄️' : '🔄'}</div>
            </Card>
          ))}
        </div>
      </div>

      {/* Status */}
      <Card className="p-6 mt-8">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white/50 text-sm">System Status</div>
            <div className="text-xl font-semibold mt-1 capitalize">{climate.status}</div>
          </div>
          <div className="text-3xl">{climate.status === 'heating' ? '🔥' : '✓'}</div>
        </div>
      </Card>
    </div>
  );
};

export default ClimatePage;
