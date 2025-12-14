import React from 'react';
import Card from '../components/Card';

const HomePage = ({ time, weather, location, lights, climate, security, toggleLight }) => {
  const formatTime = (date) => date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const formatDate = (date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const getGreeting = (date) => {
    const hour = date.getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const lightsOn = lights.filter(l => l.on).length;

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
        <Card title={`${lightsOn}/${lights.length} Lights`} icon="💡" active={lightsOn > 0} />
        <Card title={`${climate.targetTemp}°F`} icon="🌡️" active={climate.status === 'heating'} />
        <Card title={security.armed ? 'Armed' : 'Disarmed'} icon="🔐" active={security.armed} />
        <Card title={`${weather.temp}°`} icon="☀️" />
      </div>

      {/* Lights Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          💡 Lights
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {lights.map(light => (
            <Card
              key={light.id}
              title={light.title}
              active={light.on}
              onClick={() => toggleLight(light.id)}
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
              <div className="text-4xl font-bold">{climate.temperature}°F</div>
            </div>
            <div>
              <div className="text-sm text-white/50">Target</div>
              <div className="text-4xl font-bold">{climate.targetTemp}°F</div>
            </div>
            <div>
              <div className="text-sm text-white/50">Humidity</div>
              <div className="text-4xl font-bold">{climate.humidity}%</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Security Section */}
      <div>
        <h2 className="text-2xl font-bold mb-4">🔐 Security</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title={security.armed ? 'System Armed' : 'System Disarmed'} active={security.armed} />
          <Card title={`${security.cameras.length} Cameras Online`} />
        </div>
      </div>
    </div>
  );
};

export default HomePage;
