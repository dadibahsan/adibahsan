/* serve.js — a small local preview server.
 *
 * This is ONLY for looking at the site on your own machine. It is not used
 * when the site is live; Cloudflare Pages serves dist/ directly.
 *
 * Run it with:  npm run preview
 * Then open:    http://localhost:8080
 * Stop it with: Ctrl-C
 *
 * It uses nothing but Node's built-in web server. No dependencies.
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, 'dist');
const PORT = 8080;

// Browsers need to be told what kind of file they are receiving.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

const server = http.createServer(function (request, response) {
  // Strip off anything after "?" and decode %20-style escapes.
  let urlPath;
  try {
    urlPath = decodeURIComponent(request.url.split('?')[0]);
  } catch (err) {
    urlPath = request.url.split('?')[0];
  }

  // Every page URL on this site ends in a slash and is served from the
  // index.html inside that folder — SPEC.md §14.4. So "/work/" means
  // "dist/work/index.html".
  //
  // If someone types "/work" without the slash, send them to "/work/" — the
  // same thing Cloudflare Pages does live, so preview behaves like the real
  // site rather than showing a confusing "not found".
  if (!urlPath.endsWith('/') && !path.extname(urlPath)) {
    if (fs.existsSync(path.join(DIST, urlPath, 'index.html'))) {
      response.writeHead(301, { Location: urlPath + '/' });
      response.end();
      return;
    }
  }

  if (urlPath.endsWith('/')) urlPath += 'index.html';

  // Refuse to serve anything outside dist/, whatever the URL claims.
  const target = path.join(DIST, urlPath);
  if (!target.startsWith(DIST)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(target, function (err, data) {
    if (err) {
      // Not found: show the site's own 404 page if it has been built yet.
      const notFound = path.join(DIST, '404.html');
      fs.readFile(notFound, function (fallbackErr, fallbackData) {
        if (fallbackErr) {
          response.writeHead(404, { 'Content-Type': TYPES['.txt'] });
          response.end('404 — not found: ' + urlPath + '\n');
        } else {
          response.writeHead(404, { 'Content-Type': TYPES['.html'] });
          response.end(fallbackData);
        }
      });
      return;
    }

    const type = TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream';
    // Never cache during preview, so a rebuild always shows up on refresh.
    response.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-store' });
    response.end(data);
  });
});

server.listen(PORT, function () {
  console.log('  Preview running at http://localhost:' + PORT);
  console.log('  Press Ctrl-C to stop.\n');
});
