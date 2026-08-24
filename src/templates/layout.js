// layout.js — the <html> shell wrapped around every page on the site.
//
// This is a "template": a plain JavaScript file that returns a string of HTML.
// There is no template language to learn. The backtick strings below are
// ordinary text, and anything inside ${ ... } is a value dropped into the text.
//
// Page order is fixed by SPEC.md §9.0: header, main, footer. Do not rearrange.

'use strict';

// Turns characters that mean something in HTML (< > & " ') into safe versions,
// so a project title containing, say, an ampersand can never break the page.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Strip the HTML tags out of a string, for places that need plain text —
// the <title> tag, meta descriptions, the RSS feed.
//
// Entities have to be turned back into real characters here. The summary has
// already been through the markdown converter, which writes an apostrophe as
// "&#39;". Left alone, the escaping step that follows would turn that into
// "&amp;#39;" and a search result would literally read "don&#39;t speak".
function plainText(html) {
  return String(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, function (_, code) { return String.fromCharCode(Number(code)); })
    .replace(/&#[xX]([0-9a-fA-F]+);/g, function (_, code) { return String.fromCharCode(parseInt(code, 16)); })
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // "&amp;" last, so "&amp;lt;" becomes "&lt;" and not "<".
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

// Shorten text to a length without slicing a word in half.
function truncate(text, limit) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:—-]+$/, '') + '…';
}

// "4:12" becomes "0:04:12" — SPEC.md §9.2. The site's grammar is a delivery
// manifest, so runtimes are rendered as full timecode. "—" passes through
// unchanged, for projects that are stills only.
function toTimecode(runtime) {
  if (runtime === '—') return '—';
  const parts = String(runtime).split(':');
  const minutes = parseInt(parts[0], 10);
  const seconds = parts[1];
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours + ':' + String(remainingMinutes).padStart(2, '0') + ':' + seconds;
}

/**
 * Build a responsive <img> tag. SPEC.md §8.3.
 *
 * The browser is given three sizes and picks whichever suits the screen it is
 * on. width and height are always present so the page never jumps around as
 * images load.
 *
 * @param {object} record   From the build's image list: { width, height, outputs }
 * @param {object} options  { alt, eager, sizes }
 */
function image(record, options) {
  const opts = options || {};
  if (!record) return '';

  const outputs = record.outputs;
  const largest = outputs[outputs.length - 1];

  // Display width/height describe the shape, not the file actually loaded.
  const displayWidth = largest.width;
  const displayHeight = Math.round(largest.width * record.height / record.width);

  // Prefer the 1200px file as the default source, or the largest if smaller.
  const preferred = outputs.filter(function (o) { return o.width <= 1200; }).pop() || outputs[0];

  const srcset = outputs.map(function (o) {
    return '/m/' + o.file + ' ' + o.width + 'w';
  }).join(', ');

  // The first image on a page is loaded immediately; everything below the fold
  // waits until the visitor scrolls near it.
  const loadingAttrs = opts.eager
    ? 'loading="eager" fetchpriority="high"'
    : 'loading="lazy"';

  return '<img src="/m/' + preferred.file + '"' +
    ' srcset="' + srcset + '"' +
    ' sizes="' + (opts.sizes || '(max-width: 700px) 100vw, 896px') + '"' +
    ' width="' + displayWidth + '" height="' + displayHeight + '"' +
    ' alt="' + escapeHtml(opts.alt || '') + '"' +
    ' ' + loadingAttrs + ' decoding="async">';
}

// One row of the work manifest: title on the left, client / year / timecode on
// the right. The whole row is the click target. SPEC.md §9.2.
function manifestRow(project) {
  return [
    '<li class="row">',
    '<a class="row-link" href="/work/' + escapeHtml(project.slug) + '/">',
    '<span class="row-title">' + escapeHtml(project.title) + '</span>',
    '<span class="row-meta">',
    '<span class="row-client">' + escapeHtml(project.client) + '</span>',
    '<span class="row-year">' + escapeHtml(project.year) + '</span>',
    '<span class="row-runtime">' + escapeHtml(toTimecode(project.runtime)) + '</span>',
    '</span>',
    '</a>',
    '</li>',
  ].join('');
}

// The registration mark — SPEC.md §10.10.
// A printer's crosshair: a circle of radius 5 with a 1px stroke, plus lines
// extending 2px past the circle on all four sides. 14x14, drawn in currentColor
// so the stylesheet decides its colour. Hidden from screen readers, because the
// name sitting next to it already labels the link.
const REGISTRATION_MARK = [
  '<svg class="mark" width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">',
  '<circle cx="7" cy="7" r="5" fill="none" stroke="currentColor" stroke-width="1"/>',
  '<line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" stroke-width="1"/>',
  '<line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" stroke-width="1"/>',
  '</svg>',
].join('');

// Builds the nav. The page you are currently on is NOT a link — it renders as
// plain text carrying aria-current="page", so screen readers announce it.
function renderNav(site, currentPath) {
  const items = site.nav.map(function (item) {
    const href = '/' + item + '/';
    const label = escapeHtml(item);
    if (href === currentPath) {
      return '<span aria-current="page">' + label + '</span>';
    }
    return '<a href="' + href + '">' + label + '</a>';
  });
  return '<nav aria-label="Sections">' + items.join('<span class="sep" aria-hidden="true"> · </span>') + '</nav>';
}

function renderElsewhere(site) {
  if (!Array.isArray(site.elsewhere) || site.elsewhere.length === 0) return '';
  const links = site.elsewhere.map(function (entry) {
    return '<a href="' + escapeHtml(entry.url) + '">' + escapeHtml(entry.label) + '</a>';
  });
  return '<p class="elsewhere">' + links.join('<span class="sep" aria-hidden="true"> · </span>') + '</p>';
}

/**
 * Wrap page content in the site shell.
 *
 * @param {object} site     Parsed content/site.json
 * @param {object} page     { path, title, description, ogType, ogImage, head, body }
 * @returns {string}        A complete HTML document
 */
function layout(site, page) {
  const path = page.path;                       // e.g. "/" or "/work/"
  const canonical = site.domain + path;
  const title = page.title
    ? escapeHtml(page.title) + ' — ' + escapeHtml(site.name)
    : escapeHtml(site.name);

  // Descriptions are capped at 160 characters — SPEC.md §14.1. Cut at the
  // last whole word rather than mid-word, and mark the cut with an ellipsis.
  const description = escapeHtml(truncate(String(page.description || site.tagline), 160));
  const ogImage = page.ogImage ? site.domain + page.ogImage : '';

  return [
    '<!doctype html>',
    '<html lang="' + escapeHtml(site.lang) + '">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>' + title + '</title>',
    '<meta name="description" content="' + description + '">',
    '<link rel="canonical" href="' + escapeHtml(canonical) + '">',
    '<meta property="og:type" content="' + escapeHtml(page.ogType || 'website') + '">',
    '<meta property="og:title" content="' + escapeHtml(page.title || site.name) + '">',
    '<meta property="og:description" content="' + description + '">',
    ogImage ? '<meta property="og:image" content="' + escapeHtml(ogImage) + '">' : '',
    '<meta property="og:url" content="' + escapeHtml(canonical) + '">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="theme-color" content="#EDEBE4">',
    // The browser-tab icon. Without these, browsers ask for /favicon.ico,
    // fail to find it, and show a blank page icon in the tab.
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
    '<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png">',
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    // Lets a feed reader find the notes feed from any page on the site.
    '<link rel="alternate" type="application/rss+xml" title="' + escapeHtml(site.name) + ' — Notes" href="/feed.xml">',
    // Tell the browser to start fetching the two fonts immediately, rather
    // than waiting until it has read the stylesheet. SPEC.md §10.3.
    // Only the "latin" files are preloaded: the "-ext" files cover accents
    // most pages never use, so they load on demand instead of on every visit.
    '<link rel="preload" as="font" type="font/woff2" href="/f/serif-var.woff2" crossorigin>',
    '<link rel="preload" as="font" type="font/woff2" href="/f/mono-400.woff2" crossorigin>',
    '<link rel="stylesheet" href="/site.css">',
    // The only JavaScript on the site. "defer" means it never blocks the page
    // from rendering, and it runs after the HTML is in place. SPEC.md §12.2.
    '<script src="/video.js" defer></script>',
    page.head || '',
    '</head>',
    '<body>',

    // ---- header (SPEC.md §9.0) ----
    '<header class="site-head">',
    '<a class="wordmark" href="/">' + REGISTRATION_MARK + '<span>' + escapeHtml(site.name) + '</span></a>',
    renderNav(site, path),
    '</header>',

    // ---- page content ----
    '<main>',
    page.body,
    '</main>',

    // ---- footer (SPEC.md §9.0) ----
    '<footer class="site-foot">',
    '<p>© ' + escapeHtml(site.year) + ' ' + escapeHtml(site.name) + '<span class="sep" aria-hidden="true"> · </span>' + escapeHtml(site.location) + '</p>',
    renderElsewhere(site),
    site.footerNote ? '<p class="foot-note">' + escapeHtml(site.footerNote) + '</p>' : '',
    '</footer>',

    '</body>',
    '</html>',
    '',
  ].filter(function (line) { return line !== ''; }).join('\n');
}

module.exports = {
  layout: layout,
  escapeHtml: escapeHtml,
  plainText: plainText,
  toTimecode: toTimecode,
  image: image,
  manifestRow: manifestRow,
  REGISTRATION_MARK: REGISTRATION_MARK,
};
