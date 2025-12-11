import React, { useState } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import Slider from '../components/Slider';

const LightsPage = ({ lights, toggleLight, setBrightness }) => {
  const [selectedLight, setSelectedLight] = useState(null);

  const handleBrightnessChange = (brightness) => {
    setBrightness(selectedLight.id, brightness);
  };

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
                onClick={() => toggleLight(light.id)}
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
              onClick={() => lights.forEach(l => !l.on && toggleLight(l.id))}
              className="aspect-square flex items-center justify-center"
            >
              <div className="text-4xl">✅</div>
            </Card>
            <Card
              title="All Off"
              icon="❌"
              onClick={() => lights.forEach(l => l.on && toggleLight(l.id))}
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
                onClick={() => toggleLight(selectedLight.id)}
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

export default LightsPage;
