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
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const contentType = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Demo server serving ${dist} on http://127.0.0.1:${PORT}`);

  // Fetch index.html and print excerpt, then exit
  http.get({ hostname: '127.0.0.1', port: PORT, path: '/' }, (r) => {
    let data = '';
    r.setEncoding('utf8');
    r.on('data', (c) => data += c);
    r.on('end', () => {
      console.log('\n---START index.html (excerpt, first 1200 chars)---\n');
      console.log(data.slice(0, 1200));
      console.log('\n---END index.html---\n');
      server.close(() => process.exit(0));
    });
  }).on('error', (err) => {
    console.error('Fetch failed', err);
    server.close(() => process.exit(1));
  });
});
