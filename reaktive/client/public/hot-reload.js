// Hot reload client for development
(function() {
  if (typeof WebSocket === 'undefined') return;
  
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev) return;

  let ws;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;

  function connect() {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/reload`);

      ws.onopen = () => {
        console.log('[Hot Reload] Connected');
        reconnectAttempts = 0;
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'reload') {
          console.log(`[Hot Reload] File changed: ${data.file}`);
          // Reload the page
          window.location.reload();
        }
      };

      ws.onerror = (error) => {
        console.error('[Hot Reload] Error:', error);
      };

      ws.onclose = () => {
        console.log('[Hot Reload] Disconnected');
        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          console.log(`[Hot Reload] Reconnecting (${reconnectAttempts}/${maxReconnectAttempts})...`);
          setTimeout(connect, 3000);
        }
      };
    } catch (error) {
      console.error('[Hot Reload] Connection failed:', error);
    }
  }

  // Connect when the page loads
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', connect);
  } else {
    connect();
  }
})();
