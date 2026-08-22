// work-index.js — the work index, "/work/". SPEC.md §9.2.
//
// Every non-draft project as a manifest row. No thumbnails: their absence is
// what makes the page read as a catalogue rather than a portfolio grid.

'use strict';

const { manifestRow } = require('./layout.js');

/**
 * @param {object} site      Parsed content/site.json
 * @param {Array}  projects  Non-draft projects, in file order
 */
function workIndex(site, projects) {
  const body = [
    '<h1>Work</h1>',
    projects.length
      ? '<ul class="manifest">' + projects.map(manifestRow).join('') + '</ul>'
      : '<p>Nothing published yet.</p>',
  ].join('\n');

  return {
    path: '/work/',
    title: 'Work',
    description: 'Selected work by ' + site.name + '.',
    ogType: 'website',
    body: body,
  };
}

module.exports = { workIndex: workIndex };
