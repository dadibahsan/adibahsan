// not-found.js — the 404 page. SPEC.md §9.8.
//
// Cloudflare Pages serves dist/404.html automatically when a URL does not
// exist. Nothing needs configuring.

'use strict';

function notFound(site) {
  const body = [
    '<h1>Not here</h1>',
    '<p>That page does not exist, or it moved.</p>',
    '<p class="more"><a href="/">Home</a> · <a href="/work/">Work</a></p>',
  ].join('\n');

  return {
    path: '/404.html',
    title: 'Not here',
    description: 'Page not found.',
    ogType: 'website',
    body: body,
  };
}

module.exports = { notFound: notFound };
