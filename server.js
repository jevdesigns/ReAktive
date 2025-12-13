const http = require('http');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const distDir = path.join(__dirname, 'client/dist');
const srcDir = path.join(__dirname, 'client/src');

// Home Assistant configuration
const HA_HOST = process.env.HA_HOST || 'supervisor';
const HA_PORT = process.env.HA_PORT || 8123;
const HA_TOKEN = process.env.HA_TOKEN || process.env.SUPERVISOR_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkMjUyNDM0ZTdiY2U0ZDgyYTA0NmY5NjFiM2UxYWFhYSIsImlhdCI6MTc2NDY0MTU1MiwiZXhwIjoyMDgwMDAxNTUyfQ.WZjDet0_7fEXHqCMmHVAmmhELVR5p-K_LeZPJ73EQlU';
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
    
    console.log(`[HA PROXY] ${req.method} ${haPath} -> ${haUrl}`);
    
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      const haReq = http.request(haUrl, {
        method: req.method,
        headers: {
          'Authorization': `Bearer ${HA_TOKEN}`,
          'Content-Type': 'application/json',
          'Host': HA_HOST,
          'Connection': 'close'
        }
      }, (haRes) => {
        console.log(`[HA RESPONSE] ${haRes.statusCode} for ${haPath}`);
        res.writeHead(haRes.statusCode, {
          'Content-Type': haRes.headers['content-type'] || 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Content-Type'
        });
        haRes.pipe(res);
      });

      haReq.on('error', (err) => {
        console.error('[HA ERROR]', err.message);
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Home Assistant API unavailable', details: err.message }));
      });

      if (body) {
        haReq.write(body);
      }
      haReq.end();
    });
    return;
  }

  // Serve static files with ingress support
  let reqUrl = req.url;

  // Log for debugging
  console.log(`[INGRESS] Request: ${req.url}`);

  // For ingress, Home Assistant strips /api/hassio/app prefix and forwards to us
  // So we just need to serve static files normally, with SPA fallback to index.html
  if (reqUrl === '/' || reqUrl === '') {
    reqUrl = 'index.html';
  }

  // Handle API routes that should be proxied
  if (req.url.startsWith('/api/') && !req.url.startsWith('/api/ha/')) {
    // Non-HA API routes - handle locally
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
    // Other API routes - 404
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  let filePath = path.join(distDir, reqUrl);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      // For SPA routing, fallback to index.html for any missing routes
      if (reqUrl !== 'index.html') {
        console.log(`[INGRESS] SPA fallback: ${reqUrl} -> index.html`);
        fs.readFile(path.join(distDir, 'index.html'), (err2, content2) => {
          if (err2) {
            console.error(`[INGRESS] 404: ${reqUrl}`);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content2);
          }
        });
      } else {
        console.error(`[INGRESS] 404: ${reqUrl}`);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      }
    } else {
      const ext = path.extname(filePath);
      const contentType = {
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.json': 'application/json',
        '.ico': 'image/x-icon',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml'
      }[ext] || 'application/octet-stream';

      console.log(`[INGRESS] Serving: ${reqUrl} (${contentType})`);
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
