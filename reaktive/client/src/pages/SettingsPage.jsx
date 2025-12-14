import React, { useState } from 'react';
import Card from '../components/Card';

const SettingsPage = ({ location, setLocation }) => {
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [tempLocation, setTempLocation] = useState(location);

  const handleSaveLocation = () => {
    setLocation(tempLocation);
    setShowLocationForm(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">⚙️ Settings</h1>

      {/* Location Settings */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📍 Location</h2>
        <Card className="p-6 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-white/50 text-sm">Current Location</div>
              <div className="text-2xl font-bold mt-2">
                {location.city}, {location.state}
              </div>
              <div className="text-white/50 text-sm mt-2">
                Coordinates: {location.lat.toFixed(2)}, {location.lon.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => {
                setTempLocation(location);
                setShowLocationForm(!showLocationForm);
              }}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
            >
              ✏️ Edit
            </button>
          </div>
        </Card>

        {showLocationForm && (
          <Card className="p-6 bg-white/5">
            <h3 className="text-lg font-semibold mb-4">Edit Location</h3>
            <div className="space-y-4 mb-6">
              <input
                type="text"
                placeholder="City"
                value={tempLocation.city}
                onChange={(e) =>
                  setTempLocation({ ...tempLocation, city: e.target.value })
                }
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="State/Region"
                value={tempLocation.state}
                onChange={(e) =>
                  setTempLocation({ ...tempLocation, state: e.target.value })
                }
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSaveLocation}
                className="py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setShowLocationForm(false)}
                className="py-3 bg-white/10 hover:bg-white/20 rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </Card>
        )}
      </div>

      {/* System Info */}
      <div>
        <h2 className="text-2xl font-bold mb-4">ℹ️ System Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <div className="text-white/50 text-sm">Dashboard Version</div>
            <div className="text-2xl font-bold mt-2">1.0.0</div>
          </Card>
          <Card className="p-6">
            <div className="text-white/50 text-sm">Last Updated</div>
            <div className="text-2xl font-bold mt-2">{new Date().toLocaleDateString()}</div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
