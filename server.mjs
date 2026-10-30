import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.gif': 'image/gif', '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg' };

createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (pathname === '/youlobme') pathname = '/';
    else if (pathname.startsWith('/youlobme/')) pathname = pathname.slice('/youlobme'.length);
    const path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(root + sep) || !types[extname(path)]) {
      response.writeHead(404).end();
      return;
    }
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': types[extname(path)] });
    response.end(data);
  } catch {
    response.writeHead(404).end();
  }
}).listen(5173, '127.0.0.1', () => {
  console.log('Local: http://127.0.0.1:5173');
});
