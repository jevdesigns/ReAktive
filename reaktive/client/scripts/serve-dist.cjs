const http = require('http');
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist');
const PORT = 5000;

const server = http.createServer((req, res) => {
  const urlPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(dist, urlPath);
  fs.readFile(filePath, (err, content) => {
    if (err) {
      // Fallback to index.html for SPA routing
      fs.readFile(path.join(dist, 'index.html'), (err2, content2) => {
        if (err2) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 Not Found');
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(content2);
        }
      });
      return;
    }
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Serving ${dist} on http://127.0.0.1:${PORT}`);
});

// keep process alive
process.on('SIGINT', () => {
  server.close(() => process.exit(0));
});
