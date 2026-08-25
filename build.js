/* build.js — the generator.
 *
 * WHAT THIS DOES, IN ONE SENTENCE
 * It reads your content (content/ and media/), pours it into the templates in
 * src/templates/, and writes a finished website into a folder called dist/.
 *
 * HOW TO RUN IT
 *   npm run build     — just generate dist/
 *   npm run preview   — generate, then serve it at http://localhost:8080
 *
 * You never edit anything in dist/. It is deleted and rewritten every time
 * this script runs. To change a page, change the content or the template.
 *
 * IF THE BUILD FAILS
 * It prints every problem it found, in plain English, and writes nothing at
 * all. A broken build can therefore never take the live site down.
 *
 * PHASE 3 OF SPEC.md §20 — this version does:
 *   loading and full validation (§8.4), image resizing with a cache (§8.3),
 *   markdown for notes and pages, and the homepage.
 * The remaining page types (§9.2-§9.8), the video facade and the feeds arrive
 * in Phases 4-6. Where that is the case, the code says so.
 *
 * A NOTE ON THE COMMENTS
 * They are written for someone who does not know JavaScript. If a line looks
 * cryptic, the comment above it says what it is for in plain English.
 */

'use strict';

// Node's own tools for working with files and folder paths. These ship with
// Node itself — nothing to install.
const fs = require('fs');
const path = require('path');

// The three installed packages, and no others. SPEC.md §5.2.
const sharp = require('sharp');          // resizes images and writes WebP
const { marked } = require('marked');    // turns markdown into HTML
const matter = require('gray-matter');   // reads the front matter block

// Our own templates.
const { layout, image } = require('./src/templates/layout.js');
const { home } = require('./src/templates/home.js');
const { workIndex } = require('./src/templates/work-index.js');
const { project: projectPage } = require('./src/templates/project.js');
const { notesIndex } = require('./src/templates/notes-index.js');
const { note: notePage } = require('./src/templates/note.js');
const { page: staticPage } = require('./src/templates/page.js');
const { notFound } = require('./src/templates/not-found.js');

// Where everything lives. Every other path is built from these, so the script
// works no matter which folder you run it from.
const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const MEDIA = path.join(ROOT, 'media');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache');
const CACHE_IMAGES = path.join(CACHE, 'images');
const CACHE_INDEX = path.join(CACHE, 'images.json');

// Collected problems. Errors stop the build; warnings do not.
const errors = [];
const warnings = [];

// Image sizes. SPEC.md §8.3.
const IMAGE_WIDTHS = [800, 1200, 1600];
const IMAGE_QUALITY = 78;
const POSTER_RATIO = 16 / 9;
const POSTER_RATIO_TOLERANCE = 0.01;   // 1%


/* ================================================================== *
 * SMALL HELPERS
 * ================================================================== */

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// Does this file or folder exist?
function exists(target) {
  return fs.existsSync(target);
}

// List what is inside a folder, marking sub-folders with a trailing slash, so
// error messages can say "Files present: hero.jpg, stills/".
function listFolder(dir) {
  if (!exists(dir)) return '';
  return fs.readdirSync(dir, { withFileTypes: true })
    .map(function (entry) { return entry.isDirectory() ? entry.name + '/' : entry.name; })
    .join(', ');
}

// Windows uses backslashes in paths; URLs and cache keys always use forward
// slashes. This keeps the two from getting mixed up.
function toUrlPath(value) {
  return value.split(path.sep).join('/');
}


/* ================================================================== *
 * 1. LOAD AND VALIDATE                              SPEC.md §8.2 (1)
 *
 * Every message names the file, the entry, the field, what was wrong,
 * what was given, and how to fix it — SPEC.md §8.4. They are written
 * to be read by a non-developer under time pressure.
 * ================================================================== */

// Read a JSON file. If it has a syntax problem — nearly always a stray or a
// missing comma — say so in words rather than showing a programmer's error.
function readJson(filePath, label) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    errors.push('✗ ' + label + ' could not be read. Expected to find it at ' + filePath + '.');
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (err) {
    // Work out which line the parser tripped on, so the message can point at it.
    const position = /position (\d+)/.exec(err.message);
    let where = '';
    if (position) {
      const line = text.slice(0, Number(position[1])).split('\n').length;
      where = ' — line ' + line + ': unexpected token.';
    }
    errors.push(
      '✗ ' + label + ' is not valid JSON' + where +
      ' Most likely a missing comma, or a trailing comma before "]" or "}".'
    );
    return null;
  }
}


/* ---- site.json — SPEC.md §7.1 ------------------------------------ */

// ("year" is the {{YEAR}} placeholder from §2. It lives here rather than being
//  read from the clock, because §8.5 requires repeatable builds: the same input
//  must always produce the same output, with no dates baked in at build time.)
const SITE_REQUIRED = ['name', 'role', 'location', 'tagline', 'email', 'domain', 'year', 'lang', 'nav'];

function loadSite() {
  const site = readJson(path.join(CONTENT, 'site.json'), 'content/site.json');
  if (!site) return null;

  SITE_REQUIRED.forEach(function (field) {
    if (site[field] === undefined || site[field] === '') {
      errors.push('✗ content/site.json: missing required field "' + field + '". Add it and rebuild.');
    }
  });

  if (typeof site.domain === 'string' && site.domain.endsWith('/')) {
    errors.push('✗ content/site.json: "domain" must not end in a slash. You gave "' + site.domain + '". Use "' + site.domain.replace(/\/+$/, '') + '".');
  }
  if (site.nav && !Array.isArray(site.nav)) {
    errors.push('✗ content/site.json: "nav" must be a list, e.g. ["work", "notes", "about", "contact"].');
  }
  if (site.elsewhere && !Array.isArray(site.elsewhere)) {
    errors.push('✗ content/site.json: "elsewhere" must be a list, or left out entirely.');
  }
  if (!site.elsewhere) site.elsewhere = [];

  return site;
}


/* ---- projects.json — SPEC.md §7.2 and §8.4 ----------------------- */

// Every field a project must have, with an example used in the error message
// when one is missing.
const PROJECT_REQUIRED = {
  slug: '"slug": "my-project"',
  title: '"title": "My Project Title"',
  client: '"client": "Client Name"',
  year: '"year": 2026',
  runtime: '"runtime": "4:12"',
  language: '"language": "English"',
  role: '"role": "Director, Edit"',
  poster: '"poster": "poster.jpg"',
  summary: '"summary": "Two to four sentences about the problem this piece had to solve."',
};

// A YouTube ID is 11 characters: letters, digits, hyphens and underscores.
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// A runtime is "4:12" or "12:30" — minutes, a colon, two digits of seconds.
const RUNTIME = /^\d{1,3}:[0-5]\d$/;

// Alt text that says nothing. Read aloud, these are worse than silence.
const PLACEHOLDER_ALT = /^(n\/?a|na|none|-+|\.+|image|images|img|photo|picture|still|frame|tbd|todo|xxx*|test|alt|description|untitled)$/i;

// Formats a browser can play from a plain file. MP4 is the safe choice.
// SPEC.md §7.2, §23.4.
const VIDEO_FILE = /\.(mp4|webm|mov)$/i;

const VIDEO_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

function loadProjects() {
  const projects = readJson(path.join(CONTENT, 'projects.json'), 'projects.json');
  if (!projects) return [];

  if (!Array.isArray(projects)) {
    errors.push('✗ projects.json must be a list of projects, starting with "[" and ending with "]".');
    return [];
  }

  const seenSlugs = {};

  projects.forEach(function (project, index) {
    // Humans count from 1, so "entry 1" is the first project in the file.
    const number = index + 1;
    const named = project.slug ? ' ("' + project.slug + '")' : '';
    const at = 'projects.json, entry ' + number + named + ':';
    const entry = 'Entry "' + (project.slug || '?') + '":';

    // -- required fields --
    Object.keys(PROJECT_REQUIRED).forEach(function (field) {
      if (project[field] === undefined || project[field] === '') {
        errors.push('✗ ' + at + ' missing required field "' + field + '". Add it, e.g. ' + PROJECT_REQUIRED[field] + '.');
      }
    });

    // "youtube" is required but is allowed to be null, so it is checked apart
    // from the others (a missing key is an error; a null value is fine).
    //
    // A project carrying a self-hosted "video" is the exception: there is no
    // YouTube ID to give, so the field can simply be left out rather than
    // written as null. SPEC.md §7.2.
    if (!('youtube' in project) && project.video) {
      // nothing to check — the film is served from this site
    } else if (!('youtube' in project)) {
      errors.push('✗ ' + at + ' missing required field "youtube". Give the 11-character video ID, or null if there is no video.');
    } else if (project.youtube !== null) {
      if (typeof project.youtube !== 'string' || !YOUTUBE_ID.test(project.youtube)) {
        const given = String(project.youtube);
        // If they pasted a whole URL, pull the ID out and show them.
        const fromUrl = /(?:youtu\.be\/|[?&]v=|embed\/)([A-Za-z0-9_-]{11})/.exec(given);
        if (fromUrl) {
          errors.push('✗ projects.json, entry ' + number + ': "youtube" must be the 11-character video ID, not a URL. You gave "' + given + '". Use "' + fromUrl[1] + '".');
        } else {
          errors.push('✗ projects.json, entry ' + number + ': "youtube" must be the 11-character video ID, e.g. "dQw4w9WgXcQ". You gave "' + given + '".');
        }
      }
    }

    // -- slug --
    if (typeof project.slug === 'string' && project.slug !== '') {
      if (!/^[a-z0-9-]+$/.test(project.slug)) {
        errors.push('✗ projects.json, entry ' + number + ': slug "' + project.slug + '" is invalid. Use lowercase letters, digits and hyphens only, e.g. "my-project".');
      }
      if (seenSlugs[project.slug]) {
        errors.push('✗ projects.json: slug "' + project.slug + '" is used twice (entries ' + seenSlugs[project.slug] + ' and ' + number + '). Slugs must be unique.');
      } else {
        seenSlugs[project.slug] = number;
      }
    }

    // -- year --
    if (project.year !== undefined && !/^\d{4}$/.test(String(project.year))) {
      errors.push('✗ ' + entry + ' "year" must be four digits, e.g. 2026. You gave "' + project.year + '".');
    }

    // -- runtime --
    if (project.runtime !== undefined && project.runtime !== '' &&
        project.runtime !== '—' && !RUNTIME.test(String(project.runtime))) {
      errors.push('✗ ' + entry + ' "runtime" must look like "4:12" or "12:30", or "—" if there is no video. You gave "' + project.runtime + '".');
    }

    // -- video: an optional self-hosted film, instead of YouTube. §7.2, §23.4 --
    if (project.video !== undefined && project.video !== null && project.video !== '') {
      if (typeof project.video !== 'string') {
        errors.push('✗ ' + entry + ' "video" must be a filename inside media/' + project.slug + '/, e.g. "film.mp4".');
      } else if (project.youtube) {
        errors.push('✗ ' + entry + ' has both "youtube" and "video" set. A project can use one or the other, not both. ' +
          'To use the self-hosted file, set "youtube": null. To use YouTube, remove "video".');
      } else if (!VIDEO_FILE.test(project.video)) {
        errors.push('✗ ' + entry + ' video "' + project.video + '" is not a supported format. Use .mp4 (best), .webm, or .mov.');
      }
    }

    // -- the media folder, the poster, the video, and the stills --
    if (typeof project.slug === 'string' && project.slug !== '') {
      const folder = path.join(MEDIA, project.slug);

      if (!exists(folder)) {
        errors.push('✗ projects.json, entry ' + number + named + ': no folder found at media/' + project.slug + '/. Create it and add poster.jpg.');
      } else {
        if (project.poster && !exists(path.join(folder, project.poster))) {
          errors.push('✗ ' + entry + ' poster "' + project.poster + '" not found in media/' + project.slug + '/. Files present: ' + listFolder(folder));
        }

        if (typeof project.video === 'string' && project.video !== '') {
          const videoPath = path.join(folder, project.video);
          if (!exists(videoPath)) {
            errors.push('✗ ' + entry + ' video "' + project.video + '" not found in media/' + project.slug + '/. Files present: ' + listFolder(folder));
          } else {
            // Cloudflare Pages refuses to serve any single file over 25 MiB, so
            // warn well before that. SPEC.md §23.4.
            // "runtime" is the length of the work, not of this file. Hosting a
            // short extract of a long piece is normal and expected — a 41
            // minute film cannot fit under Cloudflare's 25 MB ceiling — so a
            // file SHORTER than the runtime is never flagged.
            //
            // A file LONGER than the stated runtime is different: the work
            // cannot be shorter than the thing you are showing of it, so that
            // is a genuine contradiction and worth saying out loud.
            const actual = videoDurationSeconds(videoPath);
            const declared = runtimeSeconds(project.runtime);
            if (actual !== null && declared !== null && actual > declared + 2) {
              const shown = function (s) {
                const m = Math.floor(s / 60);
                return m + ':' + String(Math.round(s - m * 60)).padStart(2, '0');
              };
              warnings.push('⚠ Entry "' + project.slug + '": ' + project.video + ' runs ' + shown(actual) +
                ', which is longer than the ' + project.runtime + ' given as the runtime. ' +
                'Check whether "runtime" is right.');
            }

            const megabytes = fs.statSync(videoPath).size / (1024 * 1024);
            if (megabytes > 24) {
              warnings.push('⚠ Entry "' + project.slug + '": video "' + project.video + '" is ' + megabytes.toFixed(1) +
                ' MB. Cloudflare refuses to serve anything over 25 MB, so this will not play once published. ' +
                'Export it smaller, or put it on YouTube instead.');
            }
          }
        }

        // Stills may be written as plain filenames or as {file, alt} objects.
        normaliseStills(project).forEach(function (still) {
          if (!exists(path.join(folder, 'stills', still.file))) {
            errors.push('✗ ' + entry + ' still "' + still.file + '" listed but not found in media/' + project.slug + '/stills/.');
          }
        });
      }
    }

    // -- warnings: the build still succeeds. SPEC.md §8.4 --
    if (typeof project.summary === 'string' && project.summary.length > 400) {
      warnings.push('⚠ Entry "' + project.slug + '": summary is ' + project.summary.length + ' characters. Under 400 reads better.');
    }
    if (!project.youtube && !project.video && normaliseStills(project).length === 0) {
      warnings.push('⚠ Entry "' + project.slug + '": no video and no stills, so the page will be text only.');
    }
    normaliseStills(project).forEach(function (still) {
      if (still.generatedAlt) {
        warnings.push('⚠ Entry "' + project.slug + '": still "' + still.file + '" has no alt text. Real alt text helps blind visitors and search.');
      } else if (PLACEHOLDER_ALT.test(String(still.alt).trim())) {
        // "N/A", "-", "image", "TODO" and the like are worse than nothing: a
        // screen reader reads them aloud in place of the picture. Describe
        // what is in the frame, or delete the alt line and let the build
        // generate a plain one.
        warnings.push('⚠ Entry "' + project.slug + '": still "' + still.file + '" has "' + still.alt +
          '" as its description, which a screen reader will read out loud. Describe what is in the frame instead.');
      }
    });
  });

  return projects;
}

// Stills come in two shapes — a plain filename, or an object with alt text.
// This turns both into the same thing so the rest of the code has one case to
// handle. SPEC.md §7.2.
/* Remove /* ... *​/ comments from a stylesheet.
 *
 * Written as a scan rather than a regular expression because a comment marker
 * can legitimately appear inside a quoted value — a url("a/*b.png") — and a
 * regular expression would happily cut the file in half there.
 */
function stripCssComments(css) {
  let out = '';
  let i = 0;
  let quote = null;

  while (i < css.length) {
    const ch = css[i];

    if (quote) {
      out += ch;
      if (ch === '\\') { out += css[i + 1] || ''; i += 2; continue; }
      if (ch === quote) quote = null;
      i++;
      continue;
    }

    if (ch === '"' || ch === "'") { quote = ch; out += ch; i++; continue; }

    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end === -1) break;                 // unterminated: drop the remainder
      i = end + 2;
      continue;
    }

    out += ch;
    i++;
  }

  // Tidy the blank lines the comments leave behind, without reflowing rules.
  return out
    .split('\n')
    .map(function (line) { return line.replace(/[ \t]+$/, ''); })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '');
}

/* How long is this film, actually?
 *
 * An .mp4 (and a .mov, which uses the same layout) records its own length in a
 * small header near the start of the file. Reading it takes no extra software:
 * the file is a series of labelled boxes, and the one called "mvhd" holds a
 * timescale and a duration. Divide one by the other and you have seconds.
 *
 * This exists so the build can notice when the runtime written in
 * projects.json does not match the film that is actually there — a mistake
 * that is otherwise invisible until someone presses play. Returns null for
 * formats it cannot read, which is never treated as a problem.
 */
function videoDurationSeconds(file) {
  let handle;
  try {
    handle = fs.openSync(file, 'r');
    const size = fs.fstatSync(handle).size;

    // Walk the top-level boxes looking for "moov", then walk inside it for
    // "mvhd". Only the first megabyte or so is ever touched.
    function findBox(start, end, wanted) {
      let offset = start;
      const header = Buffer.alloc(8);
      while (offset + 8 <= end) {
        fs.readSync(handle, header, 0, 8, offset);
        let boxSize = header.readUInt32BE(0);
        const type = header.toString('latin1', 4, 8);
        if (boxSize === 1) {                       // 64-bit size follows
          const big = Buffer.alloc(8);
          fs.readSync(handle, big, 0, 8, offset + 8);
          boxSize = Number(big.readBigUInt64BE(0));
        }
        if (boxSize < 8) return null;              // malformed; give up quietly
        if (type === wanted) return { start: offset, size: boxSize };
        offset += boxSize;
      }
      return null;
    }

    const moov = findBox(0, size, 'moov');
    if (!moov) return null;
    const mvhd = findBox(moov.start + 8, moov.start + moov.size, 'mvhd');
    if (!mvhd) return null;

    const head = Buffer.alloc(32);
    fs.readSync(handle, head, 0, 32, mvhd.start + 8);
    const version = head.readUInt8(0);
    const timescale = version === 1 ? head.readUInt32BE(20) : head.readUInt32BE(12);
    const duration = version === 1
      ? Number(head.readBigUInt64BE(24))
      : head.readUInt32BE(16);

    if (!timescale || !duration) return null;
    return duration / timescale;
  } catch (err) {
    return null;                                   // unreadable: not an error
  } finally {
    if (handle !== undefined) try { fs.closeSync(handle); } catch (err) { /* ignore */ }
  }
}

// "4:12" as a number of seconds, for comparing against a real film.
function runtimeSeconds(runtime) {
  if (!RUNTIME.test(String(runtime))) return null;
  const parts = String(runtime).split(':');
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function normaliseStills(project) {
  if (!Array.isArray(project.stills)) return [];
  return project.stills.map(function (still, index) {
    if (typeof still === 'string') {
      return {
        file: still,
        alt: (project.title || '') + ' — still ' + (index + 1),
        generatedAlt: true,
      };
    }
    return {
      file: still.file,
      alt: still.alt || (project.title || '') + ' — still ' + (index + 1),
      generatedAlt: !still.alt,
    };
  });
}


/* ---- notes and pages — SPEC.md §7.3, §7.4 ------------------------ */

// Turn a YAML date into the plain "2026-08-14" text the site displays.
// Always read in UTC, so the same file produces the same string everywhere.
function formatDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function loadNotes() {
  const dir = path.join(CONTENT, 'notes');
  if (!exists(dir)) return [];

  const notes = [];

  fs.readdirSync(dir).sort().forEach(function (fileName) {
    if (!fileName.endsWith('.md')) return;

    const where = 'content/notes/' + fileName;
    const parsed = matter(fs.readFileSync(path.join(dir, fileName), 'utf8'));
    const data = parsed.data;

    if (!data.title) {
      errors.push('✗ ' + where + ': front matter is missing "title". Add: title: Title of the note');
    }
    if (!data.date) {
      errors.push('✗ ' + where + ': front matter is missing "date". Add: date: 2026-08-14');
      return;
    }

    const date = formatDate(data.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push('✗ ' + where + ': "date" must be written as year-month-day, e.g. 2026-08-14. You gave "' + data.date + '".');
      return;
    }

    notes.push({
      slug: fileName.replace(/\.md$/, ''),      // the filename becomes the URL
      title: data.title,
      date: date,
      summary: data.summary || '',
      draft: data.draft === true,
      html: marked.parse(parsed.content),
    });
  });

  // Newest first. SPEC.md §7.3.
  notes.sort(function (a, b) {
    if (a.date === b.date) return a.slug < b.slug ? -1 : 1;   // stable, for §8.5
    return a.date < b.date ? 1 : -1;
  });

  return notes;
}

function loadPages() {
  const dir = path.join(CONTENT, 'pages');
  const pages = {};
  if (!exists(dir)) return pages;

  fs.readdirSync(dir).sort().forEach(function (fileName) {
    if (!fileName.endsWith('.md')) return;

    const where = 'content/pages/' + fileName;
    const parsed = matter(fs.readFileSync(path.join(dir, fileName), 'utf8'));

    if (!parsed.data.title) {
      errors.push('✗ ' + where + ': front matter is missing "title". Add: title: About');
    }

    const name = fileName.replace(/\.md$/, '');
    pages[name] = {
      slug: name,
      title: parsed.data.title,
      summary: parsed.data.summary || '',
      html: marked.parse(parsed.content),
    };
  });

  return pages;
}


/* ================================================================== *
 * 2. IMAGES                                            SPEC.md §8.3
 *
 * You drop full-resolution originals into media/. This turns each one
 * into WebP copies at 800, 1200 and 1600 pixels wide, and never makes
 * an image bigger than it started.
 *
 * THE CACHE
 * Resizing is the slow part of the build, so finished WebP files are
 * kept in .cache/images/ and simply copied into dist/ next time. A
 * source is only re-encoded when its modification time or its size
 * changes — i.e. when you actually edited it. .cache/ is not committed
 * and can be deleted at any time; the next build just rebuilds it.
 * ================================================================== */

let imagesProcessed = 0;
let imagesCached = 0;

// Load the record of what has already been encoded.
function loadImageCache() {
  if (!exists(CACHE_INDEX)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_INDEX, 'utf8'));
  } catch (err) {
    return {};   // an unreadable cache is not an error; just start fresh
  }
}

// Find every image inside media/, at any depth.
function findImages(dir, base) {
  const found = [];
  if (!exists(dir)) return found;

  fs.readdirSync(dir, { withFileTypes: true }).sort(function (a, b) {
    return a.name < b.name ? -1 : 1;      // sorted, so builds stay repeatable
  }).forEach(function (item) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      found.push.apply(found, findImages(full, base));
    } else if (/\.(jpe?g|png|webp)$/i.test(item.name)) {
      found.push(toUrlPath(path.relative(base, full)));
    }
  });

  return found;
}

/**
 * Resize one source image into WebP copies.
 *
 * @param {string} relative   e.g. "example-project-one/poster.jpg"
 * @param {Set}    posters    the relative paths that must be 16:9
 * @param {object} cache      the record from .cache/images.json
 * @returns {object}          { width, height, outputs: [{ width, file }] }
 */
async function processImage(relative, posters, cache) {
  const source = path.join(MEDIA, relative);
  const stat = fs.statSync(source);
  const previous = cache[relative];

  // Has it changed since last time, and are all its outputs still on disk?
  const unchanged = previous &&
    previous.mtimeMs === stat.mtimeMs &&
    previous.size === stat.size &&
    previous.outputs.every(function (out) { return exists(path.join(CACHE_IMAGES, out.file)); });

  if (unchanged) {
    imagesCached += 1;
    // Re-issue the 16:9 warning, since it describes the file, not the build.
    if (previous.ratioWarning) warnings.push(previous.ratioWarning);
    return previous;
  }

  const image = sharp(source);
  const meta = await image.metadata();
  let sourceWidth = meta.width;
  let sourceHeight = meta.height;
  let pipeline = image;
  let ratioWarning = null;

  // Posters must be 16:9. If a source is off by more than 1%, say so and
  // centre-crop rather than failing the build. SPEC.md §8.3.
  if (posters.has(relative)) {
    const ratio = sourceWidth / sourceHeight;
    if (Math.abs(ratio - POSTER_RATIO) / POSTER_RATIO > POSTER_RATIO_TOLERANCE) {
      ratioWarning = '⚠ media/' + relative + ' is not 16:9 (it is ' +
        ratio.toFixed(3) + ':1, or roughly ' + sourceWidth + '×' + sourceHeight +
        '). It has been centre-cropped. Re-export at 1920×1080 to control the crop yourself.';
      warnings.push(ratioWarning);

      // Keep the full width and trim the height, or vice versa, whichever
      // loses less of the frame.
      let cropWidth = sourceWidth;
      let cropHeight = Math.round(sourceWidth / POSTER_RATIO);
      if (cropHeight > sourceHeight) {
        cropHeight = sourceHeight;
        cropWidth = Math.round(sourceHeight * POSTER_RATIO);
      }
      pipeline = image.extract({
        left: Math.round((sourceWidth - cropWidth) / 2),
        top: Math.round((sourceHeight - cropHeight) / 2),
        width: cropWidth,
        height: cropHeight,
      });
      sourceWidth = cropWidth;
      sourceHeight = cropHeight;
    }
  }

  // Which widths to emit. Never upscale: if a source is 1000px wide, emit 800
  // and 1000 and stop. SPEC.md §8.3.
  const widths = IMAGE_WIDTHS.filter(function (w) { return w <= sourceWidth; });
  if (widths.indexOf(sourceWidth) === -1 && sourceWidth < IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1]) {
    widths.push(sourceWidth);
  }
  widths.sort(function (a, b) { return a - b; });

  const outputs = [];
  const baseName = relative.replace(/\.[^.]+$/, '');   // drop the extension

  for (const width of widths) {
    const outFile = baseName + '-' + width + '.webp';
    const outPath = path.join(CACHE_IMAGES, outFile);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });

    await pipeline
      .clone()
      .resize({ width: width, withoutEnlargement: true })
      .webp({ quality: IMAGE_QUALITY })
      .toFile(outPath);

    outputs.push({ width: width, file: outFile });
  }

  imagesProcessed += 1;

  const record = {
    mtimeMs: stat.mtimeMs,
    size: stat.size,
    width: sourceWidth,
    height: sourceHeight,
    outputs: outputs,
  };
  if (ratioWarning) record.ratioWarning = ratioWarning;

  cache[relative] = record;
  return record;
}

// Markdown in a note is written with ordinary image links, like
// ![A caption](media/notes/my-note/frame.jpg). Those point at the original
// full-resolution file, which must never be served. This swaps each one for
// the resized WebP set, so note images get the same treatment as project
// stills and break out to full media width. SPEC.md §7.3, §9.5.
function rewriteNoteImages(html, images) {
  return html.replace(/<img\s+src="([^"]+)"([^>]*)>/g, function (whole, src, rest) {
    const key = decodeURIComponent(src).replace(/^\/?media\//, '');
    const record = images[key];
    if (!record) return whole;      // not one of ours — leave it alone

    const altMatch = /alt="([^"]*)"/.exec(rest);
    return '<figure class="wide">' + image(record, { alt: altMatch ? altMatch[1] : '' }) + '</figure>';
  })
  // Markdown puts an image on its own line inside a paragraph. Lift it out,
  // so the figure can be wider than the paragraph it was sitting in.
  .replace(/<p>(<figure class="wide">[\s\S]*?<\/figure>)<\/p>/g, '$1');
}

/* ================================================================== *
 * SITEMAP, ROBOTS, FEED AND HEADERS                    SPEC.md §14.3
 * ================================================================== */

// Characters that would otherwise break an XML file.
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Tells search engines where every page is. No <lastmod> dates: they would
// change on every build and make version-control diffs meaningless (§8.5).
function sitemapXml(site, paths) {
  const urls = paths.map(function (p) {
    return '  <url><loc>' + escapeXml(site.domain + p) + '</loc></url>';
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') + '\n' +
    '</urlset>\n';
}

function robotsTxt(site) {
  return 'User-agent: *\n' +
    'Allow: /\n' +
    '\n' +
    'Sitemap: ' + site.domain + '/sitemap.xml\n';
}

// RSS dates have to be in the old email format: "Thu, 14 Aug 2026 00:00:00 GMT".
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function rssDate(isoDate) {
  const d = new Date(isoDate + 'T00:00:00Z');
  return DAYS[d.getUTCDay()] + ', ' +
    String(d.getUTCDate()).padStart(2, '0') + ' ' +
    MONTHS[d.getUTCMonth()] + ' ' +
    d.getUTCFullYear() + ' 00:00:00 GMT';
}

// An RSS 2.0 feed of the notes only — not the projects. SPEC.md §14.3.
function feedXml(site, notes) {
  const items = notes.map(function (note) {
    const url = site.domain + '/notes/' + note.slug + '/';
    return [
      '  <item>',
      '    <title>' + escapeXml(note.title) + '</title>',
      '    <link>' + escapeXml(url) + '</link>',
      '    <guid isPermaLink="true">' + escapeXml(url) + '</guid>',
      '    <pubDate>' + rssDate(note.date) + '</pubDate>',
      note.summary ? '    <description>' + escapeXml(note.summary) + '</description>' : '',
      '  </item>',
    ].filter(function (line) { return line !== ''; }).join('\n');
  });

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n' +
    '<channel>\n' +
    '  <title>' + escapeXml(site.name) + ' — Notes</title>\n' +
    '  <link>' + escapeXml(site.domain) + '/notes/</link>\n' +
    '  <description>' + escapeXml(site.tagline) + '</description>\n' +
    '  <language>' + escapeXml(site.lang) + '</language>\n' +
    '  <atom:link href="' + escapeXml(site.domain) + '/feed.xml" rel="self" type="application/rss+xml"/>\n' +
    (items.length ? items.join('\n') + '\n' : '') +
    '</channel>\n' +
    '</rss>\n';
}

// Cloudflare Pages reads this file to decide what to serve when a URL matches
// no real page. Without it, a mistyped address returns an empty 404 and the
// visitor sees the browser's own grey error screen instead of our page.
//
// The "/*" rule only ever applies to addresses that match nothing else — real
// pages, images and fonts are served before redirects are considered — so this
// cannot swallow a page that exists. The trailing 404 keeps the correct
// "not found" status, which matters so search engines drop dead links.
function redirectsFile() {
  return '/*  /404.html  404\n';
}

// Cloudflare Pages reads this file and sets these response headers.
// Images and fonts never change once published — their filenames carry the
// size — so they can be cached for a year. HTML changes whenever you rebuild,
// so it is cached for an hour.
function headersFile() {
  return '/*\n' +
    '  Cache-Control: public, max-age=3600\n' +
    '\n' +
    '/m/*\n' +
    '  Cache-Control: public, max-age=31536000, immutable\n' +
    '\n' +
    '/f/*\n' +
    '  Cache-Control: public, max-age=31536000, immutable\n';
}


// Copy a finished WebP out of the cache and into dist/m/.
function publishImage(record, written) {
  record.outputs.forEach(function (out) {
    const from = path.join(CACHE_IMAGES, out.file);
    const to = path.join(DIST, 'm', out.file);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.copyFileSync(from, to);
    written.push({ file: toUrlPath(path.join('m', out.file)), bytes: fs.statSync(to).size });
  });
}


/* ================================================================== *
 * 3. WRITING FILES
 * ================================================================== */

const written = [];

function writeFile(relativePath, contents) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  written.push({ file: toUrlPath(relativePath), bytes: Buffer.byteLength(contents) });
}

function folderSize(dir) {
  let total = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (item) {
    const full = path.join(dir, item.name);
    total += item.isDirectory() ? folderSize(full) : fs.statSync(full).size;
  });
  return total;
}


/* ================================================================== *
 * 4. THE BUILD ITSELF                                   SPEC.md §8.2
 * ================================================================== */

async function build() {
  // --- Step 1: load and validate everything. ---
  const site = loadSite();
  const allProjects = loadProjects();
  const allNotes = loadNotes();
  const pages = loadPages();

  // If anything is wrong, print every problem at once and stop. Nothing has
  // been written at this point, so dist/ is left exactly as it was.
  if (errors.length) {
    console.error('\nBuild failed. ' + errors.length + ' problem' + (errors.length === 1 ? '' : 's') + ' found:\n');
    errors.forEach(function (message) { console.error('  ' + message); });
    console.error('\nNothing was written. Fix the above and run the build again.\n');
    process.exit(1);
  }

  // --- Step 2: drop anything marked as a draft. SPEC.md §8.2 (2) ---
  const projects = allProjects.filter(function (p) { return p.draft !== true; });
  const notes = allNotes.filter(function (n) { return !n.draft; });
  const draftProjects = allProjects.length - projects.length;
  const draftNotes = allNotes.length - notes.length;

  // --- Step 3: wipe dist/ completely and recreate it. SPEC.md §8.2 (3) ---
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // --- Step 4: copy the static files across. SPEC.md §8.2 (4) ---
  // src/site.css is heavily commented, because it is the file you are meant to
  // read and change. Those comments are for you, not for visitors — shipping
  // them means every page carries them, on every visit. They are stripped on
  // the way out. Nothing else is touched: the rules, the order and the
  // formatting are left exactly as written, so the published file is still
  // readable if you ever look at it. SPEC.md §13.
  writeFile('site.css', stripCssComments(fs.readFileSync(path.join(SRC, 'site.css'), 'utf8')));

  // The browser-tab icon: the registration mark, in the site's own colours.
  // Modern browsers use the SVG; the PNGs cover older Safari and the icon
  // shown when someone saves the site to a phone home screen.
  // Turning the SVG into PNGs needs sharp to be able to draw SVG, which
  // depends on a graphics library that is present on this machine but is not
  // guaranteed on the server that builds the site. If it is missing, the SVG
  // icon alone is published — every current browser uses that one anyway —
  // rather than failing the whole build over a browser-tab icon.
  const faviconSvg = fs.readFileSync(path.join(SRC, 'favicon.svg'));
  writeFile('favicon.svg', faviconSvg);
  try {
    for (const icon of [['favicon-32.png', 32], ['apple-touch-icon.png', 180]]) {
      const png = await sharp(faviconSvg, { density: 384 })
        .resize(icon[1], icon[1])
        .png()
        .toBuffer();
      writeFile(icon[0], png);
    }
  } catch (err) {
    warnings.push('⚠ Could not turn favicon.svg into PNG icons here (' + err.message.split('\n')[0] + '). ' +
      'The SVG icon is published on its own, which every current browser uses. Nothing else is affected.');
  }

  // The homepage wordmark: a hand-drawn signature that draws itself on.
  // Two files, both made once from the After Effects render and committed to
  // src/ — the build only copies them, so no video tooling is needed to build
  // the site. wordmark-static.webp is the finished signature at full detail and
  // is what stays on screen; wordmark.webp is the one-second animation that
  // plays over it and then fades away. Together they are under the 80 KB
  // budget. See src/site.css for how the two are layered.
  for (const asset of ['wordmark.webp', 'wordmark-static.webp']) {
    writeFile(asset, fs.readFileSync(path.join(SRC, asset)));
  }
  // The one and only JavaScript file on the site. SPEC.md §12.
  const videoJs = fs.readFileSync(path.join(SRC, 'video.js'), 'utf8');
  writeFile('video.js', videoJs);
  if (Buffer.byteLength(videoJs) > 3 * 1024) {
    warnings.push('⚠ video.js is ' + formatBytes(Buffer.byteLength(videoJs)) + ', over the 3 KB budget in SPEC.md §13.');
  }

  // The fonts live in src/fonts/ and are served from /f/ — a short path
  // because it appears in every page's preload tags.
  const fontsDir = path.join(SRC, 'fonts');
  let fontBytes = 0;
  fs.readdirSync(fontsDir).sort().forEach(function (fileName) {
    if (!fileName.endsWith('.woff2')) return;
    const data = fs.readFileSync(path.join(fontsDir, fileName));
    writeFile(path.join('f', fileName), data);
    fontBytes += data.length;
  });
  if (fontBytes > 80 * 1024) {
    warnings.push('⚠ Fonts total ' + formatBytes(fontBytes) + ', over the 80 KB budget in SPEC.md §13.');
  }

  // --- Step 5: process the images. SPEC.md §8.2 (5), §8.3 ---
  fs.mkdirSync(CACHE_IMAGES, { recursive: true });
  const cache = loadImageCache();

  // Which files are posters? Those, and only those, must be 16:9.
  const posters = new Set();
  projects.forEach(function (project) {
    posters.add(project.slug + '/' + project.poster);
  });

  // A lookup the page templates use later: "slug/poster.jpg" → its sizes.
  const images = {};

  // Only media belonging to something actually published gets copied into
  // dist/. Anything else — a draft project, a draft note, or a folder for a
  // project you have not written into projects.json yet — is left alone.
  // Without this, unpublished work would quietly go live.
  const publishedProjectSlugs = new Set(projects.map(function (p) { return p.slug; }));
  const publishedNoteSlugs = new Set(notes.map(function (n) { return n.slug; }));
  const skippedFolders = new Set();

  function isPublished(relative) {
    const parts = relative.split('/');
    if (parts[0] === 'notes') return publishedNoteSlugs.has(parts[1]);
    return publishedProjectSlugs.has(parts[0]);
  }

  for (const relative of findImages(MEDIA, MEDIA)) {
    if (!isPublished(relative)) {
      const parts = relative.split('/');
      skippedFolders.add(parts[0] === 'notes' ? 'notes/' + parts[1] : parts[0]);
      continue;
    }

    const record = await processImage(relative, posters, cache);
    images[relative] = record;
    publishImage(record, written);
  }

  // Self-hosted films are copied across untouched — no resizing, no re-encoding.
  // The file you exported is the file that gets served. Only projects that are
  // actually published reach this loop, so a draft's film stays private in the
  // same way its stills do. SPEC.md §23.4.
  const videos = {};
  projects.forEach(function (project) {
    if (!project.video) return;
    const relative = project.slug + '/' + project.video;
    const from = path.join(MEDIA, project.slug, project.video);
    writeFile(path.join('m', project.slug, project.video), fs.readFileSync(from));
    videos[relative] = {
      // The filename is percent-encoded for the address bar — a film called
      // "Yacine Athar Series.mp4" has spaces in it, and a raw space in a URL
      // is not valid. The file on disk keeps its real name.
      url: '/m/' + encodeURIComponent(project.slug) + '/' + encodeURIComponent(project.video),
      type: VIDEO_TYPES[path.extname(project.video).toLowerCase()] || 'video/mp4',
    };
  });

  // Tell the owner what was left out, so a folder never sits there being
  // silently ignored when they expected it to appear.
  Array.from(skippedFolders).sort().forEach(function (folder) {
    warnings.push('⚠ media/' + folder + '/ was skipped — nothing published refers to it. ' +
      'Either it belongs to a draft, or there is no matching entry in projects.json.');
  });

  // Save the cache index, with keys in a fixed order so the file does not
  // churn between builds.
  const ordered = {};
  Object.keys(cache).sort().forEach(function (key) { ordered[key] = cache[key]; });
  fs.writeFileSync(CACHE_INDEX, JSON.stringify(ordered, null, 2) + '\n');

  // --- Step 6: render the pages. SPEC.md §8.2 (6) ---
  // Every URL ends in a slash and is written as <path>/index.html, except the
  // 404 page which Cloudflare Pages looks for at the top level. SPEC.md §14.4.
  // Collected as we go, so the sitemap lists exactly what was built. The 404
  // page is deliberately left out — it is not a destination.
  const sitemapPaths = [];

  function writePage(page) {
    const target = page.path === '/404.html'
      ? '404.html'
      : path.join(page.path.replace(/^\/|\/$/g, ''), 'index.html');
    writeFile(target, layout(site, page));
    if (page.path !== '/404.html') sitemapPaths.push(page.path);
  }

  // -- home --
  writePage(home(site, projects, notes));

  // -- work index --
  writePage(workIndex(site, projects));

  // -- one page per project --
  projects.forEach(function (item, index) {
    // Previous and next wrap around, so the last project's "next" is the
    // first one. Draft projects were already removed, so they never appear
    // in this chain. SPEC.md §9.3 step 10.
    const previous = projects[(index - 1 + projects.length) % projects.length];
    const following = projects[(index + 1) % projects.length];

    const posterKey = item.slug + '/' + item.poster;
    const posterRecord = images[posterKey];

    // The social-sharing image: the poster, so a link pasted into WhatsApp or
    // Slack unfurls with the actual work. SPEC.md §14.1.
    let ogImage = null;
    if (posterRecord) {
      const pick = posterRecord.outputs.filter(function (o) { return o.width <= 1200; }).pop()
        || posterRecord.outputs[0];
      ogImage = '/m/' + pick.file;
    }

    writePage(projectPage(site, {
      project: item,
      poster: posterRecord,
      video: item.video ? videos[item.slug + '/' + item.video] : null,
      stills: normaliseStills(item).map(function (still) {
        return { alt: still.alt, record: images[item.slug + '/stills/' + still.file] };
      }).filter(function (still) { return still.record; }),
      summaryHtml: marked.parse(item.summary),
      technicalHtml: item.technical ? marked.parse(item.technical) : '',
      // A project on its own would otherwise link to itself both ways.
      prev: projects.length > 1 ? previous : null,
      next: projects.length > 1 ? following : null,
      ogImage: ogImage,
    }));
  });

  // -- notes index and one page per note --
  writePage(notesIndex(site, notes));

  notes.forEach(function (item, index) {
    writePage(notePage(site, {
      note: item,
      html: rewriteNoteImages(item.html, images),
      prev: notes[index - 1] || null,      // the newer note
      next: notes[index + 1] || null,      // the older note
    }));
  });

  // -- about, contact, and anything else in content/pages/ --
  Object.keys(pages).sort().forEach(function (name) {
    writePage(staticPage(site, pages[name]));
  });

  // -- 404 --
  writePage(notFound(site));

  // --- Step 7: sitemap, robots, feed, _headers. SPEC.md §8.2 (7), §14.3 ---
  writeFile('sitemap.xml', sitemapXml(site, sitemapPaths));
  writeFile('robots.txt', robotsTxt(site));
  writeFile('feed.xml', feedXml(site, notes));
  writeFile('_headers', headersFile());
  writeFile('_redirects', redirectsFile());

  // --- Step 8: the report. SPEC.md §8.2 (8) ---
  const htmlPages = written.filter(function (e) { return e.file.endsWith('.html'); });

  // The ceiling in SPEC.md §13 is 30 KB of HTML *plus* CSS, because both have
  // to arrive before the page can paint. The stylesheet is the same on every
  // page, so it counts against every page.
  const cssBytes = written.filter(function (e) { return e.file === 'site.css'; })
    .reduce(function (total, e) { return total + e.bytes; }, 0);

  htmlPages.forEach(function (entry) {
    if (entry.bytes + cssBytes > 30 * 1024) {
      warnings.push('⚠ ' + entry.file + ' plus site.css is ' + formatBytes(entry.bytes + cssBytes) +
        ', over the 30 KB budget in SPEC.md §13.');
    }
  });

  const largest = htmlPages.reduce(function (biggest, entry) {
    return entry.bytes > biggest.bytes ? entry : biggest;
  }, { file: '—', bytes: 0 });

  console.log('');
  console.log('  Built dist/');
  console.log('  Pages written    ' + htmlPages.length);
  console.log('  Projects         ' + projects.length + (draftProjects ? ' (' + draftProjects + ' draft skipped)' : ''));
  console.log('  Notes            ' + notes.length + (draftNotes ? ' (' + draftNotes + ' draft skipped)' : ''));
  console.log('  Images           ' + imagesProcessed + ' processed, ' + imagesCached + ' reused from cache');
  console.log('  Fonts            ' + formatBytes(fontBytes) + '  (budget 80 KB)');
  console.log('  Total size       ' + formatBytes(folderSize(DIST)));
  console.log('  Largest page     ' + largest.file + '  ' + formatBytes(largest.bytes) +
    '  (+ ' + formatBytes(cssBytes) + ' CSS = ' + formatBytes(largest.bytes + cssBytes) + ' of 30 KB)');

  if (warnings.length) {
    console.log('');
    warnings.forEach(function (message) { console.log('  ' + message); });
  }
  console.log('');
}

// Image work happens in the background, so the whole build is wrapped in a
// promise. If anything unexpected goes wrong, show it and stop.
build().catch(function (err) {
  console.error('\n✗ The build stopped unexpectedly:\n  ' + err.message + '\n');
  process.exit(1);
});
