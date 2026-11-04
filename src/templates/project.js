// project.js — a single project page, "/work/<slug>/". SPEC.md §9.3.
//
// The order of the blocks below is fixed by the spec. Do not rearrange them.

'use strict';

const { escapeHtml, plainText, image, film, posterPreload, displayYear } = require('./layout.js');

// The mono definition list under the title: YEAR / LANGUAGE / CLIENT /
// ROLE. Labels are uppercase mono in muted grey; values are in ink.
function metadata(project) {
  const rows = [
    ['Year', displayYear(project.year)],
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

/* ---- Media -------------------------------------------------------
 *
 * A project's pictures and films arrive as one ordered list, prepared by
 * build.js. Each item is one of three kinds:
 *
 *   youtube — a poster and a play button; the real player is only fetched
 *             if a visitor presses play (src/video.js). SPEC.md §11.2.
 *   video   — a film served from this site, in the browser's own player.
 *             Nothing downloads until play is pressed. SPEC.md §23.4.
 *   image   — a picture, at its natural shape.
 *   links   — a block of links out: Instagram reels, a longer cut on
 *             YouTube. Never the lead.
 *
 * The first item is the lead: it sits above the summary and is loaded at
 * once. Everything after it follows the summary and loads as the visitor
 * scrolls near it. SPEC.md §9.3.
 * ------------------------------------------------------------------ */

// Before anyone clicks, this block is a poster image and a button and nothing
// else — no YouTube code, and not a single request to Google. With JavaScript
// switched off, the <noscript> link still takes them to the video.
function youtubeFacade(project, item, isLead) {
  const id = escapeHtml(item.id);
  return [
    '<figure class="v" data-yt="' + id + '" data-title="' + escapeHtml(project.title) + '">',
    image(item.poster, { alt: '', eager: isLead }),
    '<button type="button" class="v-play" aria-label="Play video: ' + escapeHtml(project.title) + '">',
    '<span aria-hidden="true">▶</span>',
    '</button>',
    '<noscript>',
    '<a href="https://www.youtube.com/watch?v=' + id + '">Watch on YouTube</a>',
    '</noscript>',
    '</figure>',
  ].join('');
}

// Where a link goes, in one word, from its address.
function platform(url) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (err) { return 'Link'; }
  if (/(^|\.)instagram\.com$/.test(host)) return 'Instagram';
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return 'YouTube';
  if (/(^|\.)tiktok\.com$/.test(host)) return 'TikTok';
  if (/(^|\.)vimeo\.com$/.test(host)) return 'Vimeo';
  if (/(^|\.)behance\.net$/.test(host)) return 'Behance';
  return host;
}

/* A block of links out, made to be clicked.
 *
 * Each link is a full-width row with a large title, so the whole row is an
 * easy target on a phone. The destination is named on the right with an
 * arrow, and the rows sit under a heavy rule that sets the block apart from
 * the pictures around it.
 *
 * Links open in a new tab, so the portfolio is still there when the visitor
 * comes back from Instagram or YouTube. Screen readers are told so.
 */
function linksBlock(item, number) {
  const links = item.links;
  if (!links.length) return '';

  // Without a heading of its own, the block is named after where the links go.
  const places = links.map(function (l) { return platform(l.url); });
  const same = places.every(function (p) { return p === places[0]; });
  const heading = item.heading || (same ? 'On ' + places[0] : 'Elsewhere');
  const id = 'links-' + number;
  const numbered = links.length > 1;

  const rows = links.map(function (link, i) {
    return [
      '<li>',
      '<a class="links-row" href="' + escapeHtml(link.url) + '" target="_blank" rel="noopener">',
      numbered ? '<span class="links-num" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span>' : '',
      '<span class="links-head">',
      '<span class="links-title">' + escapeHtml(link.title) + '</span>',
      link.note ? '<span class="links-note">' + escapeHtml(link.note) + '</span>' : '',
      '</span>',
      '<span class="links-where">' + escapeHtml(places[i]) +
        ' <span class="links-arrow" aria-hidden="true">↗</span>' +
        '<span class="vis-hidden"> (opens in a new tab)</span></span>',
      '</a>',
      '</li>',
    ].join('');
  });

  return [
    '<section class="links" aria-labelledby="' + id + '">',
    '<h2 class="label" id="' + id + '">' + escapeHtml(heading) + '</h2>',
    item.text ? '<p class="links-text">' + escapeHtml(item.text) + '</p>' : '',
    '<ol class="links-list">' + rows.join('') + '</ol>',
    '</section>',
  ].join('');
}

// One item, whichever kind it is.
function renderMedia(project, item, isLead, number) {
  if (item.type === 'youtube') return youtubeFacade(project, item, isLead);
  if (item.type === 'video') return film(item, { label: project.title });
  if (item.type === 'links') return linksBlock(item, number);
  if (item.type === 'image') {
    return isLead
      ? '<figure class="lead">' + image(item.record, { alt: item.alt, eager: true }) + '</figure>'
      : image(item.record, { alt: item.alt });
  }
  return '';
}

// The first item, above the summary.
// When the lead is a film served from here, name its cover in <head> so it
// loads early. (A YouTube or picture lead is an ordinary <img>, loaded straight
// away already.)
function leadPreload(entry) {
  const first = entry.media[0];
  if (!first || first.type !== 'video') return '';
  return posterPreload(first.poster);
}

function lead(entry) {
  if (!entry.media.length) return '';
  return renderMedia(entry.project, entry.media[0], true);
}

// Everything after the first, below the summary: full media width, stacked
// vertically. No captions, no lightbox, no grid. SPEC.md §9.3 step 5.
function mediaStack(entry) {
  const rest = entry.media.slice(1).map(function (item, i) {
    return renderMedia(entry.project, item, false, i + 1);
  }).filter(function (html) { return html !== ''; });
  if (!rest.length) return '';
  return '<div class="media">' + rest.join('') + '</div>';
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
  const film = entry.media.find(function (m) { return m.type === 'youtube' || m.type === 'video'; });
  if (!film) return '';

  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: p.title,
    description: plainText(entry.summaryHtml),
    // projects.json records a year, not a full date, so the first of that year
    // stands in for it. Search engines only need it to be a valid date. For a
    // span ("2025-2026") the last year is used — when the work was finished.
    uploadDate: String(p.year).match(/\d{4}/g).pop() + '-01-01',
  };

  // A YouTube piece is embedded; a self-hosted one is a file served from this
  // site. Search engines want a different property for each. SPEC.md §14.2.
  if (film.type === 'youtube') {
    data.embedUrl = 'https://www.youtube-nocookie.com/embed/' + film.id;
  } else {
    data.contentUrl = site.domain + film.file.url;
  }

  if (entry.ogImage) data.thumbnailUrl = site.domain + entry.ogImage;

  // No duration is given. "runtime" describes the whole work, and the film on
  // the page is often a short extract of it — telling search engines a
  // one-minute clip runs forty minutes would be worse than saying nothing.

  // Escaping "<" stops a title containing "</script>" from breaking the page.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return '<script type="application/ld+json">' + json + '</script>';
}

/**
 * @param {object} site   Parsed content/site.json
 * @param {object} entry  Prepared by build.js:
 *                        { project, media, summaryHtml, technicalHtml,
 *                          prev, next, ogImage }
 */
function project(site, entry) {
  const p = entry.project;

  const nav = prevNext(entry);

  const body = [
    // 1. what kind of work this is, then the title
    p.category ? '<p class="kicker">' + escapeHtml(p.category) + '</p>' : '',
    '<h1>' + escapeHtml(p.title) + '</h1>',

    // 2. metadata
    metadata(p),

    // 3. the lead — a film, or the first picture
    lead(entry),

    // 4. summary
    '<div class="prose">' + entry.summaryHtml + '</div>',

    // 5. the rest of the media, in the order written
    mediaStack(entry),

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
    nav ? '<hr>' : '',

    // 10. previous / next
    nav,
  ].filter(function (line) { return line !== ''; }).join('\n');

  return {
    path: '/work/' + p.slug + '/',
    title: p.title,
    description: plainText(entry.summaryHtml),
    ogType: 'article',
    ogImage: entry.ogImage,
    head: leadPreload(entry) + structuredData(site, entry),
    body: body,
  };
}

module.exports = { project: project };
