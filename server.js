const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const distDir = path.join(__dirname, 'client/dist');

// Token for Home Assistant
const HA_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJkMjUyNDM0ZTdiY2U0ZDgyYTA0NmY5NjFiM2UxYWFhYSIsImlhdCI6MTc2NDY0MTU1MiwiZXhwIjoyMDgwMDAxNTUyfQ.WZjDet0_7fEXHqCMmHVAmmhELVR5p-K_LeZPJ73EQlU';

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

  // Serve static files
  let reqUrl = req.url;
  
  if (req.url.startsWith('/api/')) {
    // API routes are already handled above. This is a fallback for any other /api routes.
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  // Serve static files directly from root
  if (reqUrl === '/') {
    reqUrl = 'index.html';
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

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
