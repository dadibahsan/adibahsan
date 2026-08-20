// home.js — the homepage, "/". SPEC.md §9.1.
//
// Deliberately short: name, role, tagline, a rule, the featured projects as
// manifest rows, and one link to the full work index. No hero image, no
// showreel, no "scroll for more".

'use strict';

const { escapeHtml } = require('./layout.js');

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

// One row of the manifest: title on the left, client / year / timecode on the
// right. The whole row is the click target.
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

/**
 * @param {object} site      Parsed content/site.json
 * @param {Array}  projects  Non-draft projects, in file order
 * @returns {object}         A page object for layout()
 */
function home(site, projects) {
  const featured = projects.filter(function (project) { return project.featured === true; });

  const body = [
    '<h1 class="name">' + escapeHtml(site.name) + '</h1>',
    '<p class="role">' + escapeHtml(site.role) + '<span class="sep" aria-hidden="true"> · </span>' + escapeHtml(site.location) + '</p>',
    '<p class="tagline">' + escapeHtml(site.tagline) + '</p>',
    '<hr>',
    featured.length
      ? '<h2 class="label">Selected work</h2><ul class="manifest">' + featured.map(manifestRow).join('') + '</ul>'
      : '',
    '<p class="more"><a href="/work/">All work →</a></p>',
  ].filter(function (line) { return line !== ''; }).join('\n');

  return {
    path: '/',
    title: null,                 // the homepage title is just the site name
    description: site.tagline,
    ogType: 'website',
    body: body,
  };
}

module.exports = { home: home, toTimecode: toTimecode };
