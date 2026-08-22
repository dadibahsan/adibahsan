// project.js — a single project page, "/work/<slug>/". SPEC.md §9.3.
//
// The order of the blocks below is fixed by the spec. Do not rearrange them.

'use strict';

const { escapeHtml, plainText, toTimecode, image } = require('./layout.js');

// The mono definition list under the title: YEAR / RUNTIME / LANGUAGE /
// CLIENT / ROLE. Labels are uppercase mono in muted grey; values are in ink.
function metadata(project) {
  const rows = [
    ['Year', project.year],
    ['Runtime', toTimecode(project.runtime)],
    ['Language', project.language],
    ['Client', project.client],
    ['Role', project.role],
  ];

  const items = rows.map(function (row) {
    return '<div class="meta-row">' +
      '<dt>' + escapeHtml(row[0]) + '</dt>' +
      '<dd>' + escapeHtml(row[1]) + '</dd>' +
      '</div>';
  });

  return '<dl class="meta-list">' + items.join('') + '</dl>';
}

// The video block. SPEC.md §11.2.
//
// Before anyone clicks, this page contains a poster image and a button and
// nothing else — no YouTube code, and not a single request to Google. The
// real player is only fetched if a visitor actually presses play, which
// src/video.js handles. With JavaScript switched off, the <noscript> link
// still takes them to the video.
function video(project, posterRecord) {
  // No video on this project: show the poster on its own, with no play button.
  if (!project.youtube) {
    if (!posterRecord) return '';
    return '<figure class="v v-still">' +
      image(posterRecord, { alt: project.title + ' — poster frame', eager: true }) +
      '</figure>';
  }

  const id = escapeHtml(project.youtube);

  return [
    '<figure class="v" data-yt="' + id + '" data-title="' + escapeHtml(project.title) + '">',
    image(posterRecord, { alt: '', eager: true }),
    '<button type="button" class="v-play" aria-label="Play video: ' + escapeHtml(project.title) + '">',
    '<span aria-hidden="true">▶</span>',
    '</button>',
    '<noscript>',
    '<a href="https://www.youtube.com/watch?v=' + id + '">Watch on YouTube</a>',
    '</noscript>',
    '</figure>',
  ].join('');
}

// Stills: full media width, stacked vertically. No captions, no lightbox,
// no grid. SPEC.md §9.3 step 5.
function stills(entry) {
  if (!entry.stills.length) return '';

  const items = entry.stills.map(function (still) {
    return image(still.record, { alt: still.alt });
  });

  return '<div class="stills">' + items.join('') + '</div>';
}

function credits(project) {
  if (!Array.isArray(project.credits) || project.credits.length === 0) return '';

  const items = project.credits.map(function (credit) {
    return '<li>' +
      '<span class="credit-role">' + escapeHtml(credit.role) + '</span>' +
      '<span class="credit-name">' + escapeHtml(credit.name) + '</span>' +
      '</li>';
  });

  return '<h2 class="label">Credits</h2><ul class="credits">' + items.join('') + '</ul>';
}

// Previous and next, taken from the neighbouring entries in projects.json.
// The list wraps around: the last project's "next" is the first one.
// SPEC.md §9.3 step 10.
function prevNext(entry) {
  const links = [];

  if (entry.prev) {
    links.push('<a class="prev" href="/work/' + escapeHtml(entry.prev.slug) + '/">← ' + escapeHtml(entry.prev.title) + '</a>');
  }
  if (entry.next) {
    links.push('<a class="next" href="/work/' + escapeHtml(entry.next.slug) + '/">' + escapeHtml(entry.next.title) + ' →</a>');
  }
  if (!links.length) return '';

  return '<nav class="prevnext" aria-label="Other projects">' + links.join('') + '</nav>';
}

// "4:12" becomes "PT4M12S" — the ISO 8601 duration format search engines
// expect. SPEC.md §14.2.
function isoDuration(runtime) {
  if (runtime === '—') return null;
  const parts = String(runtime).split(':');
  const totalMinutes = parseInt(parts[0], 10);
  const seconds = parseInt(parts[1], 10);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return 'PT' +
    (hours ? hours + 'H' : '') +
    (minutes ? minutes + 'M' : '') +
    (seconds ? seconds + 'S' : '');
}

/* Structured data — SPEC.md §14.2.
 *
 * This is how a search engine knows the page holds a video, and how it ends up
 * in video results. It is a block of data, not code: the type below is
 * application/ld+json, which no browser ever executes. It is built entirely
 * from fields already in projects.json.
 *
 * Only projects that actually have a video get one.
 */
function structuredData(site, entry) {
  const p = entry.project;
  if (!p.youtube) return '';

  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: p.title,
    description: plainText(entry.summaryHtml),
    // projects.json records a year, not a full date, so the first of that year
    // stands in for it. Search engines only need it to be a valid date.
    uploadDate: p.year + '-01-01',
    embedUrl: 'https://www.youtube-nocookie.com/embed/' + p.youtube,
  };

  if (entry.ogImage) data.thumbnailUrl = site.domain + entry.ogImage;

  const duration = isoDuration(p.runtime);
  if (duration) data.duration = duration;

  // Escaping "<" stops a title containing "</script>" from breaking the page.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">' + json + '</script>';
}

/**
 * @param {object} site   Parsed content/site.json
 * @param {object} entry  Prepared by build.js:
 *                        { project, poster, stills, summaryHtml, technicalHtml,
 *                          prev, next, ogImage }
 */
function project(site, entry) {
  const p = entry.project;

  const body = [
    // 1. title
    '<h1>' + escapeHtml(p.title) + '</h1>',

    // 2. metadata
    metadata(p),

    // 3. video, or the poster on its own
    video(p, entry.poster),

    // 4. summary
    '<div class="prose">' + entry.summaryHtml + '</div>',

    // 5. stills
    stills(entry),

    // 6. technical note
    entry.technicalHtml
      ? '<h2 class="label">Notes</h2><div class="prose">' + entry.technicalHtml + '</div>'
      : '',

    // 7. credits
    credits(p),

    // 8. external link
    p.link && p.link.url
      ? '<p class="external"><a href="' + escapeHtml(p.link.url) + '">' + escapeHtml(p.link.label || p.link.url) + '</a></p>'
      : '',

    // 9. hairline
    '<hr>',

    // 10. previous / next
    prevNext(entry),
  ].filter(function (line) { return line !== ''; }).join('\n');

  return {
    path: '/work/' + p.slug + '/',
    title: p.title,
    description: plainText(entry.summaryHtml),
    ogType: 'article',
    ogImage: entry.ogImage,
    head: structuredData(site, entry),
    body: body,
  };
}

module.exports = { project: project };
