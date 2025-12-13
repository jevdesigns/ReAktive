const http = require('http');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'client/dist');
const srcDir = path.join(__dirname, 'client/src');

// Home Assistant configuration
const HA_HOST = process.env.HA_HOST || 'homeassistant.local';
const HA_PORT = process.env.HA_PORT || 8123;
const HA_TOKEN = process.env.HA_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkMjUyNDM0ZTdiY2U0ZDgyYTA0NmY5NjFiM2UxYWFhYSIsImlhdCI6MTc2NDY0MTU1MiwiZXhwIjoyMDgwMDAxNTUyfQ.WZjDet0_7fEXHqCMmHVAmmhELVR5p-K_LeZPJ73EQlU';
const INGRESS_PATH = '/api/hassio/app';

// WebSocket clients for hot reload
const wss = new WebSocket.Server({ noServer: true });
const connectedClients = new Set();

const server = http.createServer((req, res) => {
  // API endpoints
  if (req.url === '/api/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: "Dashboard Backend is Online" }));
    return;
  }

  if (req.url === '/api/token' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ token: HA_TOKEN }));
    return;
  }

  // Proxy Home Assistant API requests
  if (req.url.startsWith('/api/ha/')) {
    const haPath = req.url.replace('/api/ha', '');
    const haUrl = `http://${HA_HOST}:${HA_PORT}${haPath}`;
    
    const haReq = http.request(haUrl, {
      method: req.method,
      headers: {
        ...req.headers,
        'Authorization': `Bearer ${HA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }, (haRes) => {
      res.writeHead(haRes.statusCode, haRes.headers);
      haRes.pipe(res);
    });

    haReq.on('error', (err) => {
      console.error('HA API error:', err);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Home Assistant API unavailable' }));
    });

    req.pipe(haReq);
    return;
  }

  // Serve static files with ingress support
  let reqUrl = req.url;
  const basePath = INGRESS_PATH + '/';

  // Handle ingress routing
  if (reqUrl.startsWith(basePath)) {
    reqUrl = reqUrl.substring(basePath.length);
    if (!reqUrl || reqUrl === '') {
      reqUrl = 'index.html';
    }
  } else if (reqUrl === '/' || reqUrl === INGRESS_PATH) {
    // Redirect to ingress path
    res.writeHead(302, { 'Location': basePath });
    res.end();
    return;
  } else if (req.url.startsWith('/api/')) {
    // API routes are already handled above
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  let filePath = path.join(distDir, reqUrl);
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Fallback to index.html for SPA routing
      fs.readFile(path.join(distDir, 'index.html'), (err2, content2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content2);
        }
      });
    } else {
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json'
      }[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

// WebSocket upgrade handler for hot reload
server.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws/reload') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      connectedClients.add(ws);
      console.log('Client connected for hot reload');
      
      ws.on('close', () => {
        connectedClients.delete(ws);
        console.log('Client disconnected');
      });
    });
  }
});

// Watch for file changes in src directory
if (process.env.NODE_ENV !== 'production') {
  const watcher = chokidar.watch(srcDir, {
    ignored: /(^|[\/\\])\.|node_modules/,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 100
    }
  });

  watcher.on('change', (filePath) => {
    const fileName = path.basename(filePath);
    console.log(`File changed: ${fileName}`);
    
    // Notify all connected clients to reload
    connectedClients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'reload',
          file: fileName,
          timestamp: Date.now()
        }));
      }
    });
  });

  console.log(`Watching for changes in: ${srcDir}`);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Dashboard running on port ${PORT}`);
  console.log(`Ingress path: ${INGRESS_PATH}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('Hot reload enabled');
  }
});
