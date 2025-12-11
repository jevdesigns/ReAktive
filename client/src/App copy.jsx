import { useState } from 'react'
import './index.css'
import DashboardTile from './components/DashboardTile'

function App() {
  const [tiles, setTiles] = useState([
    {
      id: 'lights',
      name: 'Lights',
      icon: '💡',
      isActive: false,
      color: 'orange',
      value: 'Off'
    },
    {
      id: 'climate',
      name: 'Climate',
      icon: '🌡️',
      isActive: true,
      color: 'blue',
      value: '72°F'
    },
    {
      id: 'security',
      name: 'Security',
      icon: '🔒',
      isActive: true,
      color: 'green',
      value: 'Armed'
    },
    {
      id: 'media',
      name: 'Media',
      icon: '🎵',
      isActive: false,
      color: 'red',
      value: 'Paused'
    }
  ])

  const handleTileClick = (id) => {
    setTiles(tiles.map(tile => 
      tile.id === id 
        ? { 
            ...tile, 
            isActive: !tile.isActive,
            value: tile.id === 'lights' 
              ? (!tile.isActive ? 'On' : 'Off')
              : tile.value
          }
        : tile
    ))
  }

  return (
    <div className="min-h-screen bg-homekit-bg p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">
            My Home
          </h1>
          <p className="text-gray-400 text-lg">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiles.map(tile => (
            <DashboardTile
              key={tile.id}
              {...tile}
              onClick={() => handleTileClick(tile.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
