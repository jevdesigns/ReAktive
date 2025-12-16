import React, { useState, useEffect } from 'react';
import Card from '../components/Card';
import Modal from '../components/Modal';
import haService from '../services/haService';

const SecurityPage = ({ security, toggleSecurityArmed, lockDoor }) => {
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [localSecurity, setLocalSecurity] = useState(security);

  useEffect(() => {
    let mounted = true;

    const mapCamera = (entity) => ({ id: entity.entity_id, name: entity.attributes?.friendly_name || entity.entity_id, status: entity.state === 'streaming' ? 'online' : entity.state, recording: !!entity.attributes?.is_recording });

    const onStateChanged = (payload) => {
      const entityId = payload.entity_id || (payload.event && payload.event.data && payload.event.data.entity_id);
      const newState = payload.new_state || (payload.event && payload.event.data && payload.event.data.new_state);
      if (!entityId || !mounted) return;

      try {
        if (entityId.startsWith('alarm_control_panel.')) {
          const armed = newState && (newState.state === 'armed_home' || newState.state === 'armed_away');
          setLocalSecurity(prev => ({ ...prev, armed, mode: newState.state }));
        } else if (entityId.startsWith('camera.')) {
          setLocalSecurity(prev => ({ ...prev, cameras: Array.from(new Set([...(prev.cameras || []), mapCamera(newState)])) }));
        } else if (entityId.startsWith('lock.')) {
          setLocalSecurity(prev => ({ ...prev, doors: (prev.doors || []).map(d => d.id === entityId ? { ...d, locked: newState && newState.state === 'locked' } : d) }));
        }
      } catch (e) { console.error('SecurityPage state_changed error', e); }
    };

    (async () => {
      try { await haService.connectWebSocket(); } catch (e) { console.warn('WS connect failed in SecurityPage', e); }
      try {
        const all = await haService.discoverEntities();
        if (!mounted) return;
        const alarm = (all.security || [])[0];
        const cameras = (all.cameras || []).map(mapCamera);
        const locks = (all.locks || []).map(l => ({ id: l.entity_id, name: l.attributes?.friendly_name || l.entity_id, locked: l.state === 'locked' }));
        setLocalSecurity({ armed: alarm ? (alarm.state === 'armed_home' || alarm.state === 'armed_away') : security.armed, mode: alarm ? alarm.state : security.mode, cameras, doors: locks });
      } catch (e) { console.warn('SecurityPage discovery failed', e); }

      try { haService.subscribeToEntity('state_changed', onStateChanged); } catch (e) { console.warn('SecurityPage subscribe failed', e); }
    })();

    return () => { mounted = false; try { haService.unsubscribeFromEntity('state_changed', onStateChanged); } catch (e) {} };
  }, []);

  // handlers
  const handleToggleSecurityArmed = async () => {
    if (typeof toggleSecurityArmed === 'function') return toggleSecurityArmed();
    try {
      const desired = localSecurity && localSecurity.armed ? 'disarm' : 'arm';
      const entityId = localSecurity && localSecurity.id ? localSecurity.id : null;
      if (entityId) await haService.setSecurityArm(entityId, desired);
      setLocalSecurity(prev => ({ ...prev, armed: !prev.armed }));
    } catch (e) {
      console.error('Error toggling security arm state', e);
      setLocalSecurity(prev => ({ ...prev, armed: !prev.armed }));
    }
  };

  const lockDoorLocal = async (doorId) => {
    if (typeof lockDoor === 'function') return lockDoor(doorId);
    try {
      const door = (localSecurity.doors || []).find(d => d.id === doorId);
      if (!door) return;
      const service = door.locked ? 'unlock' : 'lock';
      await haService.callService('lock', service, { entity_id: doorId });
      setLocalSecurity(prev => ({ ...prev, doors: (prev.doors || []).map(d => d.id === doorId ? { ...d, locked: !d.locked } : d) }));
    } catch (e) {
      console.error('Error toggling lock', e);
      setLocalSecurity(prev => ({ ...prev, doors: (prev.doors || []).map(d => d.id === doorId ? { ...d, locked: !d.locked } : d) }));
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">🔐 Security</h1>

      {/* Main Security Status */}
      <Card
        className="p-8 mb-8 bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-500/30"
        active={localSecurity.armed}
      >
        <div className="flex justify-between items-center">
          <div>
            <div className="text-white/50 text-sm">System Status</div>
            <div className="text-4xl font-bold mt-2">
              {localSecurity.armed ? '✓ Armed' : '🔓 Disarmed'}
            </div>
            <div className="text-white/50 mt-2 text-sm">Mode: {localSecurity.mode}</div>
          </div>
          <button
            onClick={handleToggleSecurityArmed}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all ${
              localSecurity.armed
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-green-600 hover:bg-green-500'
            }`}
          >
            {localSecurity.armed ? 'Disarm' : 'Arm'}
          </button>
        </div>
      </Card>

      {/* Cameras */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4">📹 Cameras</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(localSecurity.cameras || []).map(camera => (
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
          {(localSecurity.doors || []).map(door => (
            <Card
              key={door.id}
              title={door.name}
              active={door.locked}
              onClick={() => lockDoorLocal(door.id)}
              className="p-6 cursor-pointer"
            >
              <div className="flex items-start justify-between w-full">
                <div className="text-sm text-white/50">
                  {door.locked ? '🔒 Locked' : '🔓 Unlocked'}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    lockDoorLocal(door.id);
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
