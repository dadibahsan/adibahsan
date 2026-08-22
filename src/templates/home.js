// home.js — the homepage, "/". SPEC.md §9.1.
//
// Deliberately short: name, role, tagline, a rule, the featured projects as
// manifest rows, one link to the full work index, and the three most recent
// notes. No hero image, no showreel, no "scroll for more".

'use strict';

const { escapeHtml, manifestRow } = require('./layout.js');

// The three most recent notes, title and date only. SPEC.md §9.1.
function recentNotes(notes) {
  if (!notes.length) return '';

  const rows = notes.slice(0, 3).map(function (note) {
    return [
      '<li class="note-row">',
      '<time class="note-date" datetime="' + escapeHtml(note.date) + '">' + escapeHtml(note.date) + '</time>',
      '<a href="/notes/' + escapeHtml(note.slug) + '/">' + escapeHtml(note.title) + '</a>',
      '</li>',
    ].join('');
  });

  return '<h2 class="label">Notes</h2><ul class="note-list">' + rows.join('') + '</ul>';
}

/**
 * @param {object} site      Parsed content/site.json
 * @param {Array}  projects  Non-draft projects, in file order
 * @param {Array}  notes     Non-draft notes, newest first
 * @returns {object}         A page object for layout()
 */
function home(site, projects, notes) {
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
    recentNotes(notes || []),
  ].filter(function (line) { return line !== ''; }).join('\n');

  return {
    path: '/',
    title: null,                 // the homepage title is just the site name
    description: site.tagline,
    ogType: 'website',
    body: body,
  };
}

module.exports = { home: home };
