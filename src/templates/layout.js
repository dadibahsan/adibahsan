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

  // Descriptions are capped at 160 characters — SPEC.md §14.1.
  const description = escapeHtml(String(page.description || site.tagline).slice(0, 160));
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
    '<link rel="stylesheet" href="/site.css">',
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

module.exports = { layout: layout, escapeHtml: escapeHtml, REGISTRATION_MARK: REGISTRATION_MARK };
