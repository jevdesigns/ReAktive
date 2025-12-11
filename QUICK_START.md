# Quick Start Guide - ReactiveDash

## Getting Started

### Development

```bash
# Install dependencies
cd client
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Deploy to Raspberry Pi
cd ..
.\deploy.ps1
```

## Architecture at a Glance

### State Lives in App.jsx
All state is managed in one place, making it easy to understand the data flow:

```jsx
const [lights, setLights] = useState([...]);
const [climate, setClimate] = useState({...});
const [security, setSecurityState] = useState({...});
```

### Pages are Views
Each page is a separate file that receives props and renders content:

```jsx
// LightsPage receives lights and handlers
<LightsPage 
  lights={lights}
  toggleLight={toggleLight}
  setBrightness={setBrightness}
/>
```

### Components are Reusable UI
Small, focused components for common patterns:

```jsx
// Use Card for any card-like element
<Card 
  title="Living Room" 
  active={light.on} 
  onClick={() => toggleLight(light.id)}
/>
```

### Services Handle APIs
All external API calls are in service files:

```jsx
// Weather data
const weather = await weatherService.getWeather(lat, lon);

// Home Assistant entities
await haService.turnOnLight('light.living_room');
```

## File Organization

```
client/
├── src/
│   ├── App.jsx              ← Main app, state management, routing
│   ├── main.jsx             ← React entry point
│   ├── index.css            ← Global styles (Tailwind)
│   │
│   ├── components/          ← Reusable UI components
│   │   ├── Card.jsx         ← Generic card (20 lines)
│   │   ├── Modal.jsx        ← Dialog component (25 lines)
│   │   ├── Slider.jsx       ← Range input (20 lines)
│   │   └── Sidebar.jsx      ← Navigation (30 lines)
│   │
│   ├── pages/               ← Full page views
│   │   ├── HomePage.jsx     ← Dashboard overview
│   │   ├── LightsPage.jsx   ← Light control
│   │   ├── ClimatePage.jsx  ← Temperature control
│   │   ├── SecurityPage.jsx ← Cameras & locks
│   │   └── SettingsPage.jsx ← Settings & config
│   │
│   ├── services/            ← API wrappers
│   │   ├── haService.js     ← Home Assistant API
│   │   └── weatherService.js ← Weather API
│   │
│   └── hooks/               ← Custom React hooks (future)
│
└── vite.config.js           ← Build configuration
```

## Common Tasks

### Change the Dashboard Title
Edit the greeting in `App.jsx`:
```jsx
const getGreeting = (date) => {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "Good Morning";
  // ...
};
```

### Add a New Light
In `App.jsx`, add to the lights state:
```jsx
const [lights, setLights] = useState([
  { id: 'living_room', title: 'Living Room', on: true, brightness: 75 },
  { id: 'new_light', title: 'New Light', on: false, brightness: 50 }, // Add this
]);
```

### Change Colors
Tailwind classes are used everywhere. Modify className props:
```jsx
// Change from blue to purple
className="bg-purple-600 hover:bg-purple-500"
```

### Add a New Page
1. Create `pages/MyPage.jsx`:
```jsx
const MyPage = (props) => {
  return <div>My Page Content</div>;
};
export default MyPage;
```

2. Import in `App.jsx`:
```jsx
import MyPage from './pages/MyPage';
```

3. Add route:
```jsx
{activeTab === 'mypage' && <MyPage {...pageProps} />}
```

4. Add navigation item:
```jsx
{ id: 'mypage', icon: '🎯', label: 'My Page' }
```

### Use Home Assistant API
```jsx
import haService from '../services/haService';

// Turn on a light
await haService.turnOnLight('light.living_room', 100);

// Set temperature
await haService.setTemperature('climate.downstairs', 72);

// Arm/disarm security
await haService.setSecurityArm('alarm_control_panel.home', 'arm_home');
```

### Get Weather Data
```jsx
import weatherService from '../services/weatherService';

// Get coordinates
const coords = await weatherService.getCoordinates('San Francisco', 'California');

// Get weather
const weather = await weatherService.getWeather(coords.lat, coords.lon);
console.log(weather.temp); // 72
console.log(weather.condition); // "Partly Cloudy"
```

## Component Props Reference

### Card
```jsx
<Card
  title="Light Name"          // Display title
  icon="💡"                   // Emoji or icon
  active={true}               // Active/inactive state
  onClick={() => {}}          // Click handler
  className="custom-class"    // Extra CSS classes
>
  {children}                  // Optional content
</Card>
```

### Modal
```jsx
<Modal
  isOpen={true}               // Show/hide
  title="Settings"            // Modal title
  onClose={() => {}}          // Close handler
>
  {children}                  // Modal content
</Modal>
```

### Slider
```jsx
<Slider
  label="Brightness"          // Label text
  value={75}                  // Current value (0-100)
  min={0}                     // Minimum value
  max={100}                   // Maximum value
  onChange={(val) => {}}      // Change handler
/>
```

## Styling

All styling uses **Tailwind CSS**. No CSS files to edit (except `index.css` for global).

Common patterns:
```jsx
// Colors
className="bg-blue-600"       // Blue background
className="text-red-500"      // Red text
className="border-white/10"   // Semi-transparent white border

// Spacing
className="p-6"               // Padding 1.5rem
className="gap-4"             // Gap between items
className="mb-8"              // Margin bottom 2rem

// Responsive
className="md:col-span-2"     // Span 2 columns on medium+ screens
className="hidden md:flex"    // Hidden on mobile, flex on desktop

// Hover/Active states
className="hover:bg-blue-500" // On hover
className="active:scale-95"   // When pressed
className="transition-all"    // Smooth animation
```

## Debugging

### Check component props
```jsx
const MyComponent = (props) => {
  console.log('Props:', props); // Debug in browser console
  return <div>...</div>;
};
```

### Check state changes
In React DevTools browser extension, look at the component tree to see state updates.

### Network requests
Open browser DevTools (F12) → Network tab to see API calls and responses.

## Home Assistant Integration

The app is ready to connect to real Home Assistant instances:

### Step 1: Get your HA token
1. Go to Home Assistant settings
2. Create a "Long-lived access token"
3. Copy the token

### Step 2: Update server.js
Set your token in `server.js`:
```javascript
const HA_TOKEN = 'your-token-here';
```

### Step 3: Update API calls
In services, use real entity IDs from your HA instance:
```jsx
// Replace with your actual entity IDs
await haService.turnOnLight('light.living_room');
await haService.setTemperature('climate.downstairs', 72);
await haService.setSecurityArm('alarm_control_panel.home', 'arm_home');
```

### Step 4: Deploy
```bash
.\deploy.ps1
```

## Troubleshooting

### App won't build
```bash
cd client
rm -r node_modules package-lock.json
npm install
npm run build
```

### Styles not updating
Tailwind CSS is compiled into `dist/index.html`. Rebuild:
```bash
npm run build
```

### Changes not showing
1. Close and reopen the browser
2. Hard refresh (Ctrl+Shift+R)
3. Check browser console for errors

### API calls failing
1. Check Home Assistant is running and accessible
2. Verify token is correct in `server.js`
3. Check entity IDs exist in your HA instance
4. Look at server logs for errors

## Performance Tips

1. **Lazy load images** - Use `loading="lazy"` on img tags
2. **Memoize expensive functions** - Use `useMemo` and `useCallback`
3. **Optimize renders** - Keep components focused and small
4. **Use production build** - `npm run build` is optimized

## Resources

- [React Docs](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest/)
- [Open-Meteo Weather](https://open-meteo.com)

## Need Help?

1. Check `REFACTOR_NOTES.md` for architecture details
2. Look at similar pages for examples
3. Check browser console for error messages
4. Review Home Assistant logs: `docker logs home-assistant-addon`

---

Happy building! 🚀
