// page.js — the plain markdown pages: about and contact.
// SPEC.md §9.6 and §9.7.

'use strict';

const { escapeHtml } = require('./layout.js');

// The contact page gets three extra things the about page does not: the email
// address as a large mono mailto link, and the "elsewhere" links underneath.
// There is deliberately no form — a form implies a server. SPEC.md §9.7.
function contactExtras(site, position) {
  if (position === 'top') {
    return '<p class="email"><a href="mailto:' + escapeHtml(site.email) + '">' + escapeHtml(site.email) + '</a></p>';
  }

  if (!site.elsewhere.length) return '';

  const links = site.elsewhere.map(function (item) {
    return '<a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.label) + '</a>';
  });

  return '<h2 class="label">Elsewhere</h2><p class="elsewhere-list">' +
    links.join('<span class="sep" aria-hidden="true"> · </span>') + '</p>';
}

/**
 * @param {object} site  Parsed content/site.json
 * @param {object} data  { slug, title, summary, html }
 */
function page(site, data) {
  const isContact = data.slug === 'contact';

  const body = [
    '<h1>' + escapeHtml(data.title) + '</h1>',
    isContact ? contactExtras(site, 'top') : '',
    '<div class="prose">' + data.html + '</div>',
    isContact ? contactExtras(site, 'bottom') : '',
  ].filter(function (line) { return line !== ''; }).join('\n');

  return {
    path: '/' + data.slug + '/',
    title: data.title,
    description: data.summary,
    ogType: 'website',
    body: body,
  };
}

module.exports = { page: page };
