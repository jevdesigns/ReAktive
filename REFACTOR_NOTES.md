# ReactiveDash - Refactored Architecture

## Overview

ReactiveDash has been refactored from a monolithic single-file component into a modular, maintainable architecture designed for Home Assistant integration and scalability.

## Directory Structure

```
client/src/
├── App.jsx                    # Main app component with state management
├── main.jsx                   # React entry point
├── index.css                  # Global styles
├── components/                # Reusable UI components
│   ├── Card.jsx              # Generic card component
│   ├── Modal.jsx             # Modal/dialog component
│   ├── Slider.jsx            # Range input slider
│   └── Sidebar.jsx           # Navigation sidebar
├── pages/                     # Full page views
│   ├── HomePage.jsx          # Dashboard home view
│   ├── LightsPage.jsx        # Light control page
│   ├── ClimatePage.jsx       # Temperature/climate page
│   ├── SecurityPage.jsx      # Security/cameras page
│   └── SettingsPage.jsx      # Settings & configuration
├── services/                  # API & external integrations
│   ├── haService.js          # Home Assistant API wrapper
│   └── weatherService.js     # Open-Meteo weather API
└── hooks/                     # Custom React hooks (future)
    └── (to be added)
```

## Key Improvements

### 1. **Modular Component Design**
- Each page is a separate component with single responsibility
- Reusable Card, Modal, and Slider components
- Easy to add new features without touching existing code

### 2. **Centralized State Management**
- All state lives in `App.jsx` 
- Passed down to pages via props
- Callback functions for updates (lift state pattern)
- Future: Consider Context API or Redux for complex state

### 3. **API Abstraction Layer**
- `haService.js`: Wraps Home Assistant REST API
- `weatherService.js`: Handles weather data from Open-Meteo
- Easy to swap implementations or add new services

### 4. **Home Assistant Integration Ready**
- API endpoints for getting/setting entity states
- Support for lights, climate, security systems
- Extensible for custom integrations

### 5. **Better Scalability**
- Add new pages by creating in `pages/` folder
- Add reusable components in `components/` folder
- Add new services in `services/` folder

## Usage Examples

### Adding a New Page

1. Create `pages/MyNewPage.jsx`:
```jsx
const MyNewPage = (props) => {
  return (
    <div className="p-6">
      <h1>My New Page</h1>
    </div>
  );
};
export default MyNewPage;
```

2. Import in `App.jsx` and add to navigation

### Using Home Assistant Service

```javascript
import haService from '../services/haService';

// Turn on a light
await haService.turnOnLight('light.living_room', 100);

// Set temperature
await haService.setTemperature('climate.downstairs', 72);
```

### Using Weather Service

```javascript
import weatherService from '../services/weatherService';

// Get weather for coordinates
const weather = await weatherService.getWeather(37.7749, -122.4194);

// Get coordinates from city/state
const coords = await weatherService.getCoordinates('San Francisco', 'California');
```

## Component API Reference

### Card Component
```jsx
<Card
  title="Living Room"
  icon="💡"
  active={light.on}
  onClick={() => toggleLight(light.id)}
  className="aspect-square"
>
  {children}
</Card>
```

### Modal Component
```jsx
<Modal
  isOpen={isOpen}
  title="Light Settings"
  onClose={() => setIsOpen(false)}
>
  {children}
</Modal>
```

### Slider Component
```jsx
<Slider
  label="Brightness"
  value={brightness}
  min={0}
  max={100}
  onChange={(val) => setBrightness(val)}
/>
```

## Recommendations for Further Improvement

1. **Add Custom Hooks**
   - `useHAEntity()` - Auto-sync entity state
   - `useWeather()` - Fetch and cache weather
   - `useLights()` - Centralized light management

2. **Error Handling**
   - Toast notifications for errors
   - Fallback UI for failed API calls
   - Retry logic

3. **State Persistence**
   - localStorage for user preferences
   - IndexedDB for historical data

4. **Real-time Updates**
   - WebSocket connection to Home Assistant
   - Live entity state subscriptions
   - Optimistic UI updates

5. **Testing**
   - Unit tests for components
   - Integration tests for API calls
   - E2E tests for user flows

6. **Accessibility**
   - ARIA labels and roles
   - Keyboard navigation
   - Screen reader support

7. **Performance**
   - Lazy load pages
   - Memoize expensive computations
   - Virtual lists for many items

## Development Workflow

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to Raspberry Pi
.\deploy.ps1
```

## Deployment Notes

- Pre-built `dist/index.html` is served from `server.js`
- No npm install during Docker build (uses pre-built assets)
- Alpine Linux base image for small footprint
- Ingress support for Home Assistant integration

## Future Enhancements

- [ ] Voice control integration (Google Assistant, Alexa)
- [ ] Automation routines/scenes builder
- [ ] Energy usage monitoring dashboard
- [ ] Camera live stream with ML object detection
- [ ] Mobile app with React Native
- [ ] Dark/light theme toggle
- [ ] Multi-user support with profiles
