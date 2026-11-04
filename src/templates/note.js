// note.js — a single note, "/notes/<slug>/". SPEC.md §9.5.
//
// The body is markdown rendered at text width. Any pictures or films inside it
// break out of the text column and run at full media width.

'use strict';

const { escapeHtml, plainText } = require('./layout.js');

// Previous and next by date. Notes are held newest first, so the entry before
// this one is newer and the entry after it is older. Unlike projects, this
// list does not wrap around.
function prevNext(entry) {
  const links = [];

  if (entry.prev) {
    links.push('<a class="prev" href="/notes/' + escapeHtml(entry.prev.slug) + '/">← ' + escapeHtml(entry.prev.title) + '</a>');
  }
  if (entry.next) {
    links.push('<a class="next" href="/notes/' + escapeHtml(entry.next.slug) + '/">' + escapeHtml(entry.next.title) + ' →</a>');
  }
  if (!links.length) return '';

  return '<nav class="prevnext" aria-label="Other notes">' + links.join('') + '</nav>';
}

/**
 * @param {object} site   Parsed content/site.json
 * @param {object} entry  { note, html, prev, next, ogImage, head }
 */
function note(site, entry) {
  const n = entry.note;
  const nav = prevNext(entry);

  const body = [
    '<h1>' + escapeHtml(n.title) + '</h1>',
    '<p class="note-date"><time datetime="' + escapeHtml(n.date) + '">' + escapeHtml(n.date) + '</time></p>',
    '<div class="prose note-prose">' + entry.html + '</div>',
    // The hairline only exists to sit above the links. With nothing to link to,
    // it would float alone over an empty strip above the footer.
    nav ? '<hr>' : '',
    nav,
  ].filter(function (line) { return line !== ''; }).join('\n');

  return {
    path: '/notes/' + n.slug + '/',
    title: n.title,
    description: n.summary || plainText(entry.html),
    ogType: 'article',
    ogImage: entry.ogImage,
    head: entry.head,
    body: body,
  };
}

module.exports = { note: note };
