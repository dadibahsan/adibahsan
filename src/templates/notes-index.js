// notes-index.js — the notes index, "/notes/". SPEC.md §9.4.
//
// Rows of date, title and a one-line summary. Newest first.

'use strict';

const { escapeHtml } = require('./layout.js');

function notesIndex(site, notes) {
  const rows = notes.map(function (note) {
    return [
      '<li class="note-row">',
      '<time class="note-date" datetime="' + escapeHtml(note.date) + '">' + escapeHtml(note.date) + '</time>',
      '<span class="note-body">',
      '<a href="/notes/' + escapeHtml(note.slug) + '/">' + escapeHtml(note.title) + '</a>',
      note.summary ? '<span class="note-summary">' + escapeHtml(note.summary) + '</span>' : '',
      '</span>',
      '</li>',
    ].join('');
  });

  const body = [
    '<h1>Notes</h1>',
    notes.length
      ? '<ul class="note-list note-list-full">' + rows.join('') + '</ul>'
      : '<p>Nothing written yet.</p>',
  ].join('\n');

  return {
    path: '/notes/',
    title: 'Notes',
    description: 'Writing by ' + site.name + '.',
    ogType: 'website',
    body: body,
  };
}

module.exports = { notesIndex: notesIndex };
