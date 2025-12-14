import React, { useState } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';

const SecurityPage = ({ security, toggleSecurityArmed, lockDoor }) => {
  const [selectedCamera, setSelectedCamera] = useState(null);

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">🔐 Security</h1>

      {/* Main Security Status */}
      <Card
        className="p-8 mb-8 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30"
        active={security.armed}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white/50 text-sm">System Status</div>
            <div className="text-4xl font-bold mt-2">
              {security.armed ? '✓ Armed' : '🔓 Disarmed'}
            </div>
            <div className="text-white/50 mt-2 text-sm">Mode: {security.mode}</div>
          </div>
          <button
            onClick={toggleSecurityArmed}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              security.armed
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {security.armed ? 'Disarm' : 'Arm'}
          </button>
        </div>
      </Card>

      {/* Cameras */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📹 Cameras</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {security.cameras.map(camera => (
            <Card
              key={camera.id}
              title={camera.name}
              onClick={() => setSelectedCamera(camera)}
              active={camera.recording}
              className="p-4 cursor-pointer relative overflow-hidden"
            >
              <div className="flex items-start justify-between w-full">
                <div>
                  <div className="text-sm text-white/50">
                    {camera.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                  </div>
                  <div className="mt-2">{camera.recording ? '🔴 Recording' : '⏹️ Not Recording'}</div>
                </div>
                <div className="text-2xl">📹</div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Door Locks */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🚪 Door Locks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {security.doors.map(door => (
            <Card
              key={door.id}
              title={door.name}
              active={door.locked}
              onClick={() => lockDoor(door.id)}
              className="p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between w-full">
                <div className="text-sm text-white/50">
                  {door.locked ? '🔒 Locked' : '🔓 Unlocked'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lockDoor(door.id);
                  }}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    door.locked
                      ? 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      : 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
                  }`}
                >
                  {door.locked ? 'Unlock' : 'Lock'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Camera Detail Modal */}
      <Modal
        isOpen={!!selectedCamera}
        title={selectedCamera?.name || ''}
        onClose={() => setSelectedCamera(null)}
      >
        {selectedCamera && (
          <div className="space-y-4">
            <div className="aspect-video bg-gradient-to-br from-white/10 to-white/5 rounded-lg flex items-center justify-center text-4xl">
              📹
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/50 text-sm">Status</div>
                <div className="font-bold mt-1">
                  {selectedCamera.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                </div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-white/50 text-sm">Recording</div>
                <div className="font-bold mt-1">
                  {selectedCamera.recording ? '🔴 Yes' : '⏹️ No'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SecurityPage;
