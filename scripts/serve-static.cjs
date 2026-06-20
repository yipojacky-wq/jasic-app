const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'dist');
const port = Number(process.env.PORT || 8081);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
};

http
  .createServer((request, response) => {
    const pathname = decodeURIComponent((request.url || '/').split('?')[0]);
    const requested = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(root, requested);
    const safePath = filePath.startsWith(root) ? filePath : path.join(root, 'index.html');
    const finalPath = fs.existsSync(safePath) && fs.statSync(safePath).isFile()
      ? safePath
      : path.join(root, 'index.html');

    response.setHeader('Content-Type', mime[path.extname(finalPath)] || 'application/octet-stream');
    fs.createReadStream(finalPath).pipe(response);
  })
  .listen(port, '0.0.0.0', () => {
    console.log(`JASIC web preview: http://localhost:${port}`);
  });
