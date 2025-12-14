import React from 'react';
import Card from '../components/Card';
import Slider from '../components/Slider';

const ClimatePage = ({ climate, adjustTemperature, setClimateMode }) => {
  const modes = ['heat', 'cool', 'auto', 'off'];

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
            onClick={() => adjustTemperature(-1)}
            className="w-16 h-16 rounded-full bg-blue-600 hover:bg-blue-500 text-2xl font-bold transition-colors"
          >
            −
          </button>
          <div className="text-6xl font-bold">{climate.targetTemp}°</div>
          <button
            onClick={() => adjustTemperature(1)}
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
            for (let i = 0; i < Math.abs(delta); i++) {
              adjustTemperature(delta > 0 ? 1 : -1);
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
              onClick={() => setClimateMode(mode)}
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
