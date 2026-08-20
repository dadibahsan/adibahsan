/* build.js — the generator.
 *
 * WHAT THIS DOES, IN ONE SENTENCE
 * It reads your content (content/*.json and, later, your markdown files),
 * pours it into the templates in src/templates/, and writes finished HTML
 * files into a folder called dist/. That folder is the website.
 *
 * HOW TO RUN IT
 *   npm run build     — just generate dist/
 *   npm run preview   — generate, then serve it at http://localhost:8080
 *
 * You never edit anything in dist/. It is deleted and rewritten every time
 * this script runs. To change a page, change the content or the template.
 *
 * PHASE 1 OF SPEC.md §20 — this version does the skeleton only:
 *   reads site.json and projects.json, and writes a single dist/index.html.
 * Image processing, markdown, the other page types, the video facade and the
 * feeds all arrive in later phases. Where that is the case, the code says so.
 *
 * A NOTE ON THE COMMENTS
 * They are written for someone who does not know JavaScript. If a line looks
 * cryptic, the comment above it says what it is for in plain English.
 */

'use strict';

// Node's own tools for working with files and folder paths. Nothing installed,
// nothing third-party — these ship with Node itself.
const fs = require('fs');
const path = require('path');

// Our own templates.
const { layout } = require('./src/templates/layout.js');
const { home } = require('./src/templates/home.js');

// Where everything lives. Every other path in this file is built from these,
// so the script works no matter which folder you run it from.
const ROOT = __dirname;
const CONTENT = path.join(ROOT, 'content');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');

// Collected problems. Errors stop the build; warnings do not.
const errors = [];
const warnings = [];


/* ------------------------------------------------------------------ *
 * 1. LOAD AND VALIDATE                              SPEC.md §8.2 (1)
 *
 * If anything is wrong we collect ALL the problems first, print them
 * together, and exit without writing a single file. A failed build can
 * therefore never take the live site down.
 * ------------------------------------------------------------------ */

// Read a JSON file and turn it into data the script can use. If the file has
// a syntax problem — nearly always a stray or missing comma — say so in words
// rather than showing a programmer's error.
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

// site.json — the global settings. SPEC.md §7.1.
// ("year" is the {{YEAR}} placeholder from §2. It lives here rather than being
//  read from the clock, because §8.5 requires builds to be repeatable: the same
//  input must always produce the same output, with no dates baked in at build
//  time. Change it once a year.)
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

// projects.json — every project, in the order they appear on the site.
// SPEC.md §7.2. Phase 1 checks only the things needed to render the homepage;
// Phase 3 adds the full validation table from §8.4 (media folders, poster
// files, YouTube IDs, runtime format, and so on).
const PROJECT_REQUIRED = ['slug', 'title', 'client', 'year', 'runtime', 'language', 'role', 'poster', 'summary'];

function loadProjects() {
  const projects = readJson(path.join(CONTENT, 'projects.json'), 'content/projects.json');
  if (!projects) return [];

  if (!Array.isArray(projects)) {
    errors.push('✗ content/projects.json must be a list of projects, starting with "[" and ending with "]".');
    return [];
  }

  const seenSlugs = {};

  projects.forEach(function (project, index) {
    // Humans count from 1, so "entry 1" is the first project in the file.
    const entryNumber = index + 1;
    const name = project.slug ? ' ("' + project.slug + '")' : '';
    const where = 'content/projects.json, entry ' + entryNumber + name + ':';

    PROJECT_REQUIRED.forEach(function (field) {
      if (project[field] === undefined || project[field] === '') {
        errors.push('✗ ' + where + ' missing required field "' + field + '". Add it, e.g. "' + field + '": "…".');
      }
    });

    // "youtube" is required but may be null, so it is checked separately.
    if (!('youtube' in project)) {
      errors.push('✗ ' + where + ' missing required field "youtube". Give the 11-character video ID, or null if there is no video.');
    }

    if (typeof project.slug === 'string') {
      if (!/^[a-z0-9-]+$/.test(project.slug)) {
        errors.push('✗ content/projects.json, entry ' + entryNumber + ': slug "' + project.slug + '" is invalid. Use lowercase letters, digits and hyphens only, e.g. "my-project".');
      }
      if (seenSlugs[project.slug]) {
        errors.push('✗ content/projects.json: slug "' + project.slug + '" is used twice (entries ' + seenSlugs[project.slug] + ' and ' + entryNumber + '). Slugs must be unique.');
      } else {
        seenSlugs[project.slug] = entryNumber;
      }
    }
  });

  return projects;
}


/* ------------------------------------------------------------------ *
 * 2. WRITE FILES
 * ------------------------------------------------------------------ */

// Remember every file we write, so the report at the end can describe them.
const written = [];

function writeFile(relativePath, contents) {
  const target = path.join(DIST, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  written.push({ file: relativePath, bytes: Buffer.byteLength(contents) });
}

// Add up the size of everything inside a folder, including sub-folders.
function folderSize(dir) {
  let total = 0;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? folderSize(full) : fs.statSync(full).size;
  });
  return total;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}


/* ------------------------------------------------------------------ *
 * 3. THE BUILD ITSELF                                    SPEC.md §8.2
 * ------------------------------------------------------------------ */

function build() {
  // --- Step 1: load and validate everything. ---
  const site = loadSite();
  const allProjects = loadProjects();

  // If anything is wrong, print every problem at once and stop. Nothing has
  // been written at this point, so dist/ is left exactly as it was.
  if (errors.length) {
    console.error('\nBuild failed. ' + errors.length + ' problem' + (errors.length === 1 ? '' : 's') + ' found:\n');
    errors.forEach(function (message) { console.error('  ' + message); });
    console.error('\nNothing was written. Fix the above and run the build again.\n');
    process.exit(1);
  }

  // --- Step 2: drop anything marked as a draft. SPEC.md §8.2 (2) ---
  const projects = allProjects.filter(function (project) { return project.draft !== true; });
  const draftCount = allProjects.length - projects.length;

  // --- Step 3: wipe dist/ completely and recreate it. SPEC.md §8.2 (3) ---
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });

  // --- Step 4: copy the static files across. SPEC.md §8.2 (4) ---
  // Phase 2 adds the fonts (src/fonts/ → dist/f/) and Phase 5 adds video.js.
  writeFile('site.css', fs.readFileSync(path.join(SRC, 'site.css'), 'utf8'));

  // --- Step 5: images. Phase 3. ---
  // Nothing happens here yet. Full-resolution originals sit in media/ and are
  // resized into dist/m/<slug>/ once the image pipeline (SPEC.md §8.3) is built.

  // --- Step 6: render the pages. SPEC.md §8.2 (6) ---
  // Phase 1 renders the homepage only. The work index, project pages, notes,
  // about, contact and 404 arrive in Phase 4.
  const page = home(site, projects);
  writeFile('index.html', layout(site, page));

  // --- Step 7: sitemap, robots, feed, _headers. Phase 6. ---

  // --- Step 8: the report. SPEC.md §8.2 (8) ---
  const largest = written.reduce(function (biggest, entry) {
    return entry.bytes > biggest.bytes ? entry : biggest;
  }, { file: '—', bytes: 0 });

  // 30 KB per page is the performance ceiling from SPEC.md §13.
  written.forEach(function (entry) {
    if (entry.file.endsWith('.html') && entry.bytes > 30 * 1024) {
      warnings.push('⚠ ' + entry.file + ' is ' + formatBytes(entry.bytes) + ', over the 30 KB page budget.');
    }
  });

  const htmlPages = written.filter(function (entry) { return entry.file.endsWith('.html'); });

  console.log('');
  console.log('  Built dist/');
  console.log('  Pages written    ' + htmlPages.length);
  console.log('  Projects         ' + projects.length + (draftCount ? ' (' + draftCount + ' draft skipped)' : ''));
  console.log('  Images           0 processed, 0 cached  (Phase 3)');
  console.log('  Total size       ' + formatBytes(folderSize(DIST)));
  console.log('  Largest page     ' + largest.file + '  ' + formatBytes(largest.bytes));

  if (warnings.length) {
    console.log('');
    warnings.forEach(function (message) { console.log('  ' + message); });
  }
  console.log('');
}

build();
