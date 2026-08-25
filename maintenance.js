/* maintenance.js — builds a holding page and nothing else.
 *
 * WHAT THIS IS FOR
 * While the real site is still a draft, this replaces it with a single
 * "under development" page so that visitors cannot browse unfinished work.
 * Every address on the domain shows that one page.
 *
 * HOW IT IS SWITCHED ON AND OFF
 * package.json decides which builder runs:
 *
 *   "build": "node maintenance.js"   <- holding page (maintenance mode)
 *   "build": "node build.js"         <- the real site
 *
 * Nothing else changes. Every source file, every project, every note and
 * every image stays exactly where it is. To bring the real site back, put
 * that one line back to "node build.js", run npm run build, and deploy.
 *
 * This file deliberately uses nothing but Node's own tools — no sharp, no
 * marked — so it cannot fail for a reason unrelated to itself.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const CONTENT = path.join(ROOT, 'content');

// Escape the few characters that mean something in HTML.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Read the owner's details so the holding page cannot go out of date. If the
// file is unreadable for any reason, fall back rather than fail — a holding
// page that builds is worth more than a perfect one that does not.
function loadSite() {
  const fallback = {
    name: 'Adib Ahsan',
    email: 'hello@adibahsan.com',
    location: 'Dhaka',
    lang: 'en',
    year: new Date().getFullYear(),
  };
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(CONTENT, 'site.json'), 'utf8'));
    return Object.assign(fallback, parsed);
  } catch (err) {
    return fallback;
  }
}

const site = loadSite();

// The registration mark from the real site, so the holding page still looks
// like it belongs to the same person.
const MARK =
  '<svg class="mark" width="16" height="16" viewBox="0 0 14 14" aria-hidden="true" focusable="false">' +
  '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1"/>' +
  '<line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" stroke-width="1"/>' +
  '<line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1"/>' +
  '</svg>';

// The tab icon, written straight into the page so there is no second file to
// fetch and nothing that can 404.
const FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" fill="#EDEBE4"/>' +
    '<g fill="none" stroke="#B0281F" stroke-width="2.5">' +
    '<circle cx="16" cy="16" r="8.5"/><path d="M16 1.5V30.5M1.5 16H30.5"/></g></svg>'
  );

function page() {
  return `<!doctype html>
<html lang="${escapeHtml(site.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(site.name)}</title>
<meta name="description" content="A new site is on the way.">
<!-- Keep this page, and the unfinished work behind it, out of search results. -->
<meta name="robots" content="noindex, nofollow">
<meta name="theme-color" content="#EDEBE4">
<link rel="icon" href="${FAVICON}">
<style>
  /* Everything is inline: the holding page makes no second request of any
     kind, so it cannot be caught half-loaded. Fonts are the ones already on
     the visitor's machine, chosen to sit close to the real site's Faustina
     and IBM Plex Mono. */
  :root {
    --paper:     #EDEBE4;
    --ink:       #1A1917;
    --ink-muted: #6B6862;
    --rule:      #C9C5BB;
    --mark:      #B0281F;
  }

  * { box-sizing: border-box; border-radius: 0; }

  html { -webkit-text-size-adjust: 100%; }

  body {
    margin: 0;
    padding: 2rem 1.5rem 4rem;
    min-height: 100vh;
    display: flex;
    align-items: center;
    background: var(--paper);
    color: var(--ink);
    font-family: Charter, "Bitstream Charter", Georgia, "Times New Roman", serif;
    font-size: 1.0625rem;
    line-height: 1.65;
    overflow-wrap: break-word;
  }

  main { max-width: 32rem; margin-inline: auto; width: 100%; }

  .wordmark {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.0625rem;
    letter-spacing: -0.01em;
  }

  .mark { color: var(--mark); flex: none; }

  h1 {
    margin: 2rem 0 0;
    font-size: 1.75rem;
    font-weight: 500;
    line-height: 1.15;
    letter-spacing: -0.015em;
    text-wrap: balance;
  }

  p { margin: 1rem 0 0; max-width: 30rem; color: var(--ink-muted); }

  hr {
    height: 0;
    margin: 2rem 0;
    border: 0;
    border-top: 1px solid var(--rule);
  }

  .contact {
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.9375rem;
    letter-spacing: 0.01em;
  }

  a { color: var(--ink); text-decoration-color: var(--rule); text-underline-offset: 0.17em; }
  a:hover { text-decoration-color: var(--mark); }
  a:focus-visible { outline: 2px solid var(--mark); outline-offset: 3px; }

  .foot {
    margin-top: 2rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 0.75rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--ink-muted);
  }

  @media (min-width: 43.75em) {
    body { padding: 2rem 2.5rem 4rem; }
    h1 { font-size: 2.25rem; }
  }
</style>
</head>
<body>
<main>
  <p class="wordmark">${MARK}<span>${escapeHtml(site.name)}</span></p>

  <h1>A new site is on the way.</h1>

  <p>This one is still being built, so there is nothing here worth your time yet. It will be worth it shortly.</p>

  <hr>

  <p class="contact">Work enquiries — <a href="mailto:${escapeHtml(site.email)}">${escapeHtml(site.email)}</a></p>

  <p class="foot">${escapeHtml(site.name)} · ${escapeHtml(site.location)}</p>
</main>
</body>
</html>
`;
}

/* Tell Cloudflare how to serve the site.
 *
 * Every address on the domain must land on the holding page, including links
 * people already have to /work/something/.
 *
 * This is done here rather than in a _redirects file on purpose. A catch-all
 * rule like "/*  /index.html  200" is REJECTED by Cloudflare — it strips
 * "/index" and ".html" from the destination, which then matches "/*" again,
 * and it refuses the whole deployment as an infinite loop. A _redirects file
 * containing that rule is what silently blocked every deployment between
 * 23 and 25 August 2026.
 *
 * "not_found_handling" is the supported way to say the same thing:
 *   single-page-application -> anything unmatched serves index.html (200)
 *   404-page                -> anything unmatched serves 404.html (404)
 *
 * Maintenance mode wants the first. The real site wants the second, and
 * build.js writes that value instead.
 */
function wranglerConfig() {
  return JSON.stringify({
    $schema: 'node_modules/wrangler/config-schema.json',
    name: 'adibahsan',
    compatibility_date: '2026-08-20',
    observability: { enabled: true },
    assets: {
      directory: 'dist',
      not_found_handling: 'single-page-application',
    },
  }, null, 2) + '\n';
}

// Ask every search engine to stay away entirely while the site is unfinished.
function robots() {
  return 'User-agent: *\nDisallow: /\n';
}

// Do not let the holding page sit in anyone's browser cache for long, so the
// real site appears promptly once it is switched back on.
function headers() {
  return '/*\n  Cache-Control: no-cache\n  X-Robots-Tag: noindex, nofollow\n';
}

function emptyDist() {
  if (!fs.existsSync(DIST)) return;
  for (const entry of fs.readdirSync(DIST)) {
    fs.rmSync(path.join(DIST, entry), { recursive: true, force: true });
  }
}

function write(name, contents) {
  const target = path.join(DIST, name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  return Buffer.byteLength(contents);
}

function main() {
  fs.mkdirSync(DIST, { recursive: true });
  emptyDist();

  const files = [
    ['index.html', page()],
    ['robots.txt', robots()],
    ['_headers', headers()],
  ];

  let total = 0;
  for (const [name, contents] of files) total += write(name, contents);

  // wrangler.jsonc sits beside package.json, not inside dist/ — Cloudflare
  // reads it to decide how to serve the folder.
  fs.writeFileSync(path.join(ROOT, 'wrangler.jsonc'), wranglerConfig());

  console.log('');
  console.log('  MAINTENANCE MODE');
  console.log('');
  console.log('  dist/ now holds the holding page and nothing else.');
  console.log('  Every address on the site shows it. Search engines are asked to stay away.');
  console.log('');
  files.forEach(function (f) { console.log('    ' + f[0]); });
  console.log('    ../wrangler.jsonc   (tells Cloudflare to serve the holding page for every address)');
  console.log('');
  console.log('  Total            ' + (total / 1024).toFixed(1) + ' KB');
  console.log('');
  console.log('  To bring the real site back: in package.json change');
  console.log('    "build": "node maintenance.js"   ->   "build": "node build.js"');
  console.log('  then run  npm run build  and deploy.');
  console.log('');
}

main();
