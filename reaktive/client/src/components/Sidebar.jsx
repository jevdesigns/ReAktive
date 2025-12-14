import React from 'react';

const Sidebar = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'lights', icon: '💡', label: 'Lights' },
    { id: 'climate', icon: '🌡️', label: 'Climate' },
    { id: 'security', icon: '🔐', label: 'Security' },
    { id: 'settings', icon: '⚙️', label: 'Settings' },
  ];

  return (
    <nav className="hidden md:flex flex-col items-center w-24 py-8 border-r border-white/10 bg-black/40 backdrop-blur-2xl z-50 h-screen sticky top-0 gap-6">
      {navItems.map(item => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all w-16 h-16 ${
            activeTab === item.id
              ? 'bg-blue-600 shadow-lg shadow-blue-600/30 text-white'
              : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
          title={item.label}
        >
          <span className="text-2xl">{item.icon}</span>
          <span className="text-xs font-semibold">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

export default Sidebar;
