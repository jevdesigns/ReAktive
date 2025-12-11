import React from 'react'

const DashboardTile = ({ name, icon, isActive, color, value, onClick }) => {
  const colorClasses = {
    orange: 'from-orange-500/30 to-orange-600/20 border-orange-500/40',
    blue: 'from-blue-500/30 to-blue-600/20 border-blue-500/40',
    green: 'from-green-500/30 to-green-600/20 border-green-500/40',
    red: 'from-red-500/30 to-red-600/20 border-red-500/40'
  }

  return (
    <div
      onClick={onClick}
      className={`
        glass-tile rounded-3xl p-6 cursor-pointer
        ${isActive ? 'active' : ''}
        hover:shadow-2xl
        transition-all duration-300
        flex flex-col justify-between
        h-48
        ${isActive ? `bg-gradient-to-br ${colorClasses[color]}` : ''}
      `}
    >
      <div className="flex justify-between items-start">
        <div className={`text-5xl transition-transform ${isActive ? 'scale-110' : ''}`}>
          {icon}
        </div>
        {isActive && (
          <div className={`w-3 h-3 rounded-full bg-${color}-500 animate-pulse`} />
        )}
      </div>
      
      <div>
        <h3 className="text-white text-xl font-semibold mb-1">
          {name}
        </h3>
        <p className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}

export default DashboardTile
