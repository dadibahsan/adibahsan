# PORTFOLIO SITE — BUILD SPECIFICATION

**Version:** 1.1
**Status:** Locked for build
**Document type:** Implementation spec. Precise enough for an AI coding agent to build without asking questions. Plain enough for a non-developer to operate afterwards.

---

## 0. HOW TO USE THIS DOCUMENT

**If you are the site owner:** read §1, §2, §3, §16, §17, §18, §24. Skim the rest. You never need to understand §7–§15 to run the site — but the AI does, so don't delete them.

**If you are an AI coding agent:** this document is the contract. Build exactly what is written. Where a value is specified (a hex code, a filename, a pixel width), use that exact value. Where §20 gives phases, build in that order and stop at each phase gate. Do not add dependencies not listed in §5. Do not add features not listed here. If something here is genuinely impossible, say so rather than substituting.

### Markers used throughout

| Marker | Meaning |
|---|---|
| `{{LIKE_THIS}}` | A placeholder. The owner fills it in. Full list in §2. |
| `LOAD-BEARING` | Changing this breaks something else. Don't, unless you understand what. |
| `TASTE CALL` | A design opinion. Safe to overrule. §3 explains how. |

**No real project, client, or personal content appears anywhere in this document.** Every example is invented filler using names like `example-project-one`. Replace all of it.

---

## 1. THE BRIEF

### 1.1 What this site is

A portfolio for a motion / documentary director. It looks like an early-web document — plain HTML, real links, no cards, no scroll animations — but every typographic and spacing decision is deliberate, so it reads as *restraint*, not *neglect*.

### 1.2 What it must do

1. Show video work fast, with no waiting.
2. Survive being updated once a month for five years without decaying.
3. Position the owner as a **director**, not a vendor.
4. Cost nothing to run beyond the domain.

### 1.3 Hard constraints

| Constraint | Value |
|---|---|
| Backend | None. Fully static output. |
| Paid services | None. Domain only. |
| Video host | YouTube (unlisted or public) |
| Hosting | Cloudflare Pages |
| Owner's technical level | Non-developer. Can edit text files and run a terminal command. |

### 1.4 Explicitly out of scope for v1

Hover video loops. Self-hosted video. Contact forms. Analytics. Comments. Search. Dark mode toggle. CMS dashboard. Client-side filtering. Newsletter. Any JavaScript framework.

Several of these are cheap to add later; §23 records how, so no decision here forecloses them.

---

## 2. PLACEHOLDERS — FILL THESE IN FIRST

Every blank in this document, in one table. Fill it in before handing the spec to a coding agent. Nothing else in the spec needs editing to get a working site.

| Placeholder | What it is | Example format |
|---|---|---|
| `{{NAME}}` | Your name as it appears on the site | `Jane Doe` |
| `{{ROLE}}` | One short line under your name | `Director — documentary, motion` |
| `{{LOCATION}}` | City | `Lisbon` |
| `{{TAGLINE}}` | One sentence, under 120 characters | — |
| `{{EMAIL}}` | Contact email | `you@yourdomain.com` |
| `{{DOMAIN}}` | Full site URL, no trailing slash | `https://yourdomain.com` |
| `{{YEAR}}` | Current year, for the footer | `2026` |
| `{{DEPLOY_COMMAND}}` | Your existing Cloudflare Pages deploy command | `npx wrangler pages deploy dist` |
| `{{ELSEWHERE}}` | Social / platform links, or an empty list | — |
| `{{FOOTER_NOTE}}` | Optional one-liner in the footer | `Built by hand. No trackers.` |
| `{{PRIMARY_LANGUAGE}}` | Main language of the site | `en` |
| `{{EXTRA_LANGUAGES}}` | Other languages your titles use, so fonts subset correctly | `French, Arabic` — or `none` |

If you don't know `{{DEPLOY_COMMAND}}`, use `npx wrangler pages deploy dist` and let the coding agent verify it against your existing setup.

---

## 3. HOW TO ADJUST THIS SPEC YOURSELF

You will want to change things. Here is what's safe.

### 3.1 Safe to change any time — no side effects

- Any placeholder value in §2
- Colour values in §10.2, as long as you keep exactly six tokens and keep contrast (§15)
- The typefaces in §10.3 — swap in any two fonts, one serif, one monospace
- Type sizes in §10.3, spacing values in §10.4, column widths in §10.5
- Anything marked `TASTE CALL`
- Whether `/notes/` exists at all
- Page content — everything in `content/`

**How to make the change:** tell your coding agent, *"In `src/site.css`, change `--paper` to `#F0EFEA`. Rebuild and show me."* You do not edit HTML files. You edit one CSS file or one template file, rebuild, and every page updates.

### 3.2 Change only with a reason

- Adding a fourth or fifth image size (§8.3)
- Adding a second breakpoint (§10.6)
- Adding a field to the project data model (§7.2) — requires a matching template edit

### 3.3 Do not change

Anything marked `LOAD-BEARING`. Specifically: trailing-slash URLs, the spacing-scale rule, the "no colour outside the six tokens" rule, slugs of already-published projects, and the requirement that the site works with JavaScript disabled.

### 3.4 If you want a fundamentally different look

Don't patch this spec. Rewrite §10 as a whole and hand the agent the new §10 alone, saying *"replace the design system with this; leave everything else."* The design is deliberately isolated in one CSS file precisely so it can be swapped without touching the machinery.

---

## 4. SYSTEM ARCHITECTURE — PLAIN ENGLISH

Three things exist:

**1. Your content.** One file called `projects.json` listing every project. Markdown files for written notes. That's what you edit.

**2. The templates.** Files describing what a project page looks like. Edited once, then rarely.

**3. The build script.** A program that reads (1), pours it into (2), and writes finished HTML files into a folder called `dist/`.

```
content/projects.json  ─┐
content/notes/*.md     ─┤
media/<slug>/*.jpg     ─┼──▶  node build.js  ──▶  dist/  ──▶  Cloudflare Pages
src/templates/*        ─┤
src/site.css           ─┘
```

`dist/` is what the world sees. You never edit anything in `dist/` — it is overwritten on every build. To change a page, change the content or the template and rebuild.

**Your entire update loop is:** edit a file → run one command → done.

---

## 5. TECH STACK

### 5.1 Runtime
Node.js 20 LTS or newer. Check with `node --version`.

### 5.2 Dependencies — exactly three

| Package | Purpose |
|---|---|
| `sharp` | Image resizing and WebP encoding |
| `marked` | Markdown → HTML |
| `gray-matter` | Reads front matter from note files |

No build tool. No bundler. No framework. No CSS preprocessor. No template engine — templates are plain JavaScript files using template literals.

### 5.3 Why so few

Every dependency is a thing that breaks in three years. Three packages, all mature, none with heavy transitive churn. In 2030 this still runs.

---

## 6. REPOSITORY STRUCTURE

Exact tree. The agent creates this.

```
portfolio/
├── content/
│   ├── site.json                 # global settings, nav, contact
│   ├── projects.json             # ALL projects — the main file you edit
│   ├── pages/
│   │   ├── about.md
│   │   └── contact.md
│   └── notes/
│       └── example-note.md
│
├── media/                        # you drop full-resolution originals here
│   ├── example-project-one/
│   │   ├── poster.jpg
│   │   └── stills/
│   │       ├── 01.jpg
│   │       ├── 02.jpg
│   │       └── 03.jpg
│   └── example-project-two/
│       └── ...
│
├── src/
│   ├── templates/
│   │   ├── layout.js             # <html> shell used by every page
│   │   ├── home.js
│   │   ├── work-index.js
│   │   ├── project.js
│   │   ├── notes-index.js
│   │   ├── note.js
│   │   ├── page.js               # about, contact
│   │   └── not-found.js
│   ├── site.css                  # the entire stylesheet, one file
│   ├── video.js                  # the facade player, one file
│   └── fonts/
│       ├── serif-var.woff2
│       └── mono-400.woff2
│
├── dist/                         # GENERATED — never edit by hand
├── .cache/                       # GENERATED — image build cache
│
├── build.js                      # the generator
├── serve.js                      # local preview server
├── package.json
├── .gitignore
├── CLAUDE.md                     # notes for the coding agent (see §21.3)
└── SPEC.md                       # this document
```

### 6.1 `.gitignore`

```
node_modules/
.cache/
.DS_Store
```

`dist/` is **committed**. `media/` is **committed** — originals are the source of truth and should be backed up by version control.

### 6.2 `package.json` scripts

```json
{
  "scripts": {
    "build":   "node build.js",
    "preview": "node build.js && node serve.js",
    "deploy":  "node build.js && {{DEPLOY_COMMAND}}"
  }
}
```

---

## 7. CONTENT DATA MODEL

### 7.1 `content/site.json`

```json
{
  "name": "{{NAME}}",
  "role": "{{ROLE}}",
  "location": "{{LOCATION}}",
  "tagline": "{{TAGLINE}}",
  "email": "{{EMAIL}}",
  "domain": "{{DOMAIN}}",
  "lang": "{{PRIMARY_LANGUAGE}}",
  "nav": ["work", "notes", "about", "contact"],
  "elsewhere": [
    { "label": "Platform name", "url": "https://..." }
  ],
  "footerNote": "{{FOOTER_NOTE}}"
}
```

All fields required except `elsewhere` (may be an empty array) and `footerNote`.

### 7.2 `content/projects.json`

An array of project objects, in the order they should appear. **Order in the file = order on the site.** No sorting logic, no date arithmetic — you control sequence by moving lines. This is deliberate: it is the one thing a non-developer can always reason about.

#### Full field reference

| Field | Type | Required | Rules |
|---|---|---|---|
| `slug` | string | ✅ | Lowercase letters, digits, hyphens only. Unique. Becomes the URL: `/work/<slug>/`. **Never change a slug after publishing** — it breaks any link anyone has shared. |
| `title` | string | ✅ | Display title. Any characters, including accents. |
| `client` | string | ✅ | Client name, or `"Personal"`. |
| `year` | number | ✅ | Four digits. |
| `runtime` | string | ✅ | `M:SS` or `MM:SS`. Rendered as timecode. Use `"—"` for stills-only projects. |
| `language` | string | ✅ | e.g. `"English"`, `"Silent"`. |
| `role` | string | ✅ | Comma-separated: `"Director, Animation, Edit"`. |
| `youtube` | string \| null | ✅ | The 11-character video ID **only** — not a URL. `null` if there's no video. May be omitted entirely when `video` is used. |
| `video` | string | ➖ | Self-host the film instead of using YouTube. See below. |
| `poster` | string | ✅ | Filename inside `media/<slug>/`. Usually `"poster.jpg"`. |
| `summary` | string | ✅ | 2–4 sentences. Markdown allowed. **Write about the problem, not the process.** |
| `technical` | string | ➖ | One paragraph. Pipeline, constraint, what was hard. Markdown allowed. Omit if there's nothing real to say. |
| `stills` | array | ➖ | See below. |
| `featured` | boolean | ➖ | `true` puts it on the homepage. |
| `credits` | array | ➖ | `[{ "role": "Sound", "name": "Someone" }]` |
| `link` | object | ➖ | `{ "label": "Watch on ...", "url": "https://..." }` |
| `draft` | boolean | ➖ | `true` = excluded from the build entirely. Use for work in progress. |

#### `video` — self-hosting a film (§23.4)

For a piece that cannot live on YouTube: a music copyright claim, or a client who will not have it there.

Put the file in `media/<slug>/` and name it in the entry:

```json
{
  "slug": "athar",
  "video": "athar.mp4",
  "poster": "poster.jpg"
}
```

The page then renders a normal `<video>` player with the browser's own controls, instead of the YouTube facade. Nothing downloads until the visitor presses play, so a page with a self-hosted film costs the same to open as any other.

| Rule | Detail |
|---|---|
| Formats | `.mp4` (use this), `.webm`, `.mov`. Anything else is an error. |
| Mutually exclusive with `youtube` | A project uses one or the other. Setting both is an error. When `video` is set, `youtube` may be left out entirely. |
| Missing file | Build fails with the filename and a list of what *is* in the folder. |
| **Size limit** | **Cloudflare refuses to serve any single file over 25 MiB.** The build warns above 24 MB. Over the limit, the film simply will not play once published. |
| Poster | Required, as for any project. It is what the player shows before play, and what a shared link previews with. |
| Filenames | Spaces are handled correctly, but lowercase-and-hyphens is still easier to live with. |

The file is copied to `dist/m/<slug>/` untouched — no re-encoding. What you export is what gets served, so export sensibly: 1080p, H.264, AAC audio, and a bitrate that keeps the whole file under 24 MB. A four-minute film inside that budget means roughly 700 kbps, which is modest — **for anything longer than about two minutes, YouTube will look better.** Self-hosting is the exception, not the default.

Keep total self-hosted media under ~200 MB across the whole repository.

#### `stills` accepts two forms

```json
"stills": ["01.jpg", "02.jpg"]
```
or, preferred:
```json
"stills": [
  { "file": "01.jpg", "alt": "Describe what is in the frame" },
  { "file": "02.jpg", "alt": "Describe what is in the frame" }
]
```

If a plain string is given, the build generates `alt` as `"<title> — still <n>"`. Acceptable, but real alt text is better for both blind users and search.

#### Example entry — filler content, replace entirely

```json
{
  "slug": "example-project-one",
  "title": "Example Project Title",
  "client": "Example Client",
  "year": 2026,
  "runtime": "4:12",
  "language": "English",
  "role": "Director, Animation, Edit",
  "youtube": "dQw4w9WgXcQ",
  "poster": "poster.jpg",
  "featured": true,
  "summary": "Two to four sentences describing the problem this piece had to solve. Not the software used — the constraint, the brief, the thing that made it hard.",
  "technical": "One paragraph on how it was actually made. Pipeline, tools, the workaround you had to invent.",
  "stills": [
    { "file": "01.jpg", "alt": "Description of the first frame" },
    { "file": "02.jpg", "alt": "Description of the second frame" },
    { "file": "03.jpg", "alt": "Description of the third frame" }
  ],
  "credits": [
    { "role": "Example role", "name": "Example Name" }
  ]
}
```

### 7.3 Notes — `content/notes/<slug>.md`

```markdown
---
title: Title of the note
date: 2026-08-14
summary: One sentence shown on the notes index.
draft: false
---

Body in markdown. Headings, paragraphs, lists, links, images.

Images reference `media/notes/<slug>/filename.jpg` and are processed
identically to project stills.
```

Filename becomes the URL: `content/notes/foo.md` → `/notes/foo/`. Sorted by `date`, newest first.

### 7.4 Static pages — `content/pages/about.md`, `contact.md`

Same front-matter shape (`title`, `summary`), markdown body, rendered with `page.js`.

---

## 8. BUILD PIPELINE

### 8.1 Commands

| Command | Effect |
|---|---|
| `npm run build` | Generate `dist/` |
| `npm run preview` | Generate, then serve at `http://localhost:8080` |
| `npm run deploy` | Generate, then push live |

### 8.2 Build sequence — exact order

1. **Load & validate** `site.json`, `projects.json`, all notes, all pages. On any validation failure: print all errors, exit code 1, write nothing.
2. **Filter** entries where `draft === true`.
3. **Wipe** `dist/` completely, then recreate it.
4. **Copy** `src/fonts/` → `dist/f/`, `src/site.css` → `dist/site.css`, `src/video.js` → `dist/video.js`.
5. **Process images** (§8.3) → `dist/m/<slug>/`.
6. **Render pages**: home, work index, every project, notes index, every note, about, contact, 404.
7. **Generate** `sitemap.xml`, `robots.txt`, `feed.xml`, `_headers`.
8. **Report**: pages written, images processed vs. cached, total `dist/` size, largest single page. Warn if any HTML page exceeds 30 KB.

### 8.3 Image processing spec

**Input:** any JPEG, PNG, or WebP in `media/`. Any size. Do not pre-resize — feed it the full-resolution export.

**Output:** WebP only, at three widths: **800**, **1200**, **1600** px. Quality **78**. No upscaling — if a source is 1000 px wide, emit 800 and 1000 and stop.

**Naming:** `dist/m/<slug>/poster-800.webp`, `poster-1200.webp`, `poster-1600.webp`.

**Poster rule:** posters must be 16:9. If a source deviates by more than 1%, print a warning naming the file and its actual ratio, then centre-crop to 16:9. Do not fail the build.

**Stills:** any aspect ratio preserved.

**Cache:** maintain `.cache/images.json` mapping source path → `{ mtimeMs, size, outputs }`. Skip any source whose mtime and size are unchanged. Keeps a 60-project rebuild to a few seconds.

**Markup emitted:**
```html
<img src="/m/<slug>/poster-1200.webp"
     srcset="/m/<slug>/poster-800.webp 800w,
             /m/<slug>/poster-1200.webp 1200w,
             /m/<slug>/poster-1600.webp 1600w"
     sizes="(max-width: 700px) 100vw, 896px"
     width="1600" height="900"
     alt="..." loading="lazy" decoding="async">
```

`width`/`height` are always present — this prevents layout shift. The first image on any page uses `loading="eager"` and `fetchpriority="high"`.

### 8.4 Validation rules & error messages

Every error must name the file, the entry, the field, what was wrong, what was given, and how to fix it. These are read by a non-developer under time pressure.

| Check | Example message |
|---|---|
| Required field missing | `✗ projects.json, entry 4 ("example-project-one"): missing required field "runtime". Add it, e.g. "runtime": "4:12".` |
| Duplicate slug | `✗ projects.json: slug "example-project-one" is used twice (entries 2 and 7). Slugs must be unique.` |
| Bad slug characters | `✗ projects.json, entry 3: slug "My Project" is invalid. Use lowercase letters, digits and hyphens only, e.g. "my-project".` |
| YouTube URL instead of ID | `✗ projects.json, entry 1: "youtube" must be the 11-character video ID, not a URL. You gave "https://youtu.be/dQw4w9WgXcQ". Use "dQw4w9WgXcQ".` |
| Missing media folder | `✗ projects.json, entry 5 ("example-project-two"): no folder found at media/example-project-two/. Create it and add poster.jpg.` |
| Missing poster file | `✗ Entry "example-project-two": poster "poster.jpg" not found in media/example-project-two/. Files present: hero.jpg, stills/` |
| Missing still | `✗ Entry "example-project-two": still "04.jpg" listed but not found in media/example-project-two/stills/.` |
| Malformed JSON | `✗ projects.json is not valid JSON — line 42: unexpected token. Most likely a missing comma, or a trailing comma before "]".` |
| Bad runtime format | `✗ Entry "x": "runtime" must look like "4:12" or "12:30", or "—" if there is no video. You gave "4 min 12".` |
| Note missing date | `✗ content/notes/foo.md: front matter is missing "date". Add: date: 2026-08-14` |

**Warnings (build still succeeds):** poster not 16:9; `summary` over 400 characters; a project with `youtube: null` and no stills; any HTML page over 30 KB; a still without hand-written `alt`.

### 8.5 Determinism

Two builds from identical input must produce byte-identical output. No timestamps in generated HTML, no random IDs, no build dates. This keeps version-control diffs meaningful — when you rebuild, the only files that change are the ones you actually changed.

---

## 9. PAGE SPECIFICATIONS

### 9.0 Shared shell (`layout.js`)

Every page, in this exact order:

```
<header>
  [registration mark glyph, links to /]  {{NAME}}
  nav: work · notes · about · contact
</header>

<main>
  ... page content ...
</main>

<footer>
  © {{YEAR}} {{NAME}} · {{LOCATION}}
  elsewhere links
  {{FOOTER_NOTE}}
</footer>
```

- The header is plain text, ~13 px mono, on a hairline rule. It does not stick, shrink, or animate.
- The current page's nav item renders as plain text (not a link) with `aria-current="page"`.
- The registration mark is an inline SVG crosshair (§10.10) — the only graphic element on the site.

### 9.1 Home — `/`

Deliberately short. Should be fully readable without scrolling on a laptop.

1. `<h1>` — the name. Large serif.
2. Role + location, mono, one line.
3. Tagline — one sentence, serif, italic. Maximum one.
4. Hairline rule.
5. **Selected work** — `featured` projects only, as manifest rows (§9.2). Aim for 5–8.
6. A single text link: `All work →`
7. If notes exist: the three most recent, title + date only.

No hero image. No showreel autoplay. No "scroll for more" affordance. The restraint is the pitch.

### 9.2 Work index — `/work/`

`<h1>Work</h1>`, then every non-draft project as a manifest row:

```
┌─────────────────────────────────────────────────────────────┐
│ Example Project Title                 Client   2026  0:04:12 │
│ ─────────────────────────────────────────────────────────── │
│ Another Example Title                 Client   2026  0:01:30 │
│ ─────────────────────────────────────────────────────────── │
│ A Third One                         Personal   2026  0:00:45 │
└─────────────────────────────────────────────────────────────┘
```

- Title: serif, links to the project. The whole row is the click target.
- Client, year, runtime: mono, right-aligned, tabular figures.
- **Runtime renders as full timecode** — `4:12` becomes `0:04:12`. `LOAD-BEARING` for the concept: the site's structural grammar is a delivery manifest, not a gallery.
- Hairline rule between rows. No thumbnails. `TASTE CALL` — thumbnails can be added later (§23.3), but their absence is what makes the page read as a catalogue rather than a portfolio grid.
- On mobile (< 700 px), metadata drops to a second line under the title, still mono, still left-aligned.

### 9.3 Project page — `/work/<slug>/`

Exact order. Do not rearrange.

1. **`<h1>`** — title.
2. **Metadata block** — mono definition list: `YEAR / RUNTIME / LANGUAGE / CLIENT / ROLE`. Labels uppercase mono at 12 px in muted grey; values in ink.
3. **Video** — the facade player (§11) at media width. If `youtube` is `null`, show the poster image instead, with no play button.
4. **Summary** — serif, constrained to text width.
5. **Stills** — full media width, stacked vertically, one spacing unit apart. No captions, no lightbox, no grid.
6. **Technical note** — if present. Preceded by a small mono label: `NOTES`.
7. **Credits** — if present. Mono list.
8. **External link** — if present. Plain text link.
9. **Hairline rule.**
10. **Prev / next** — `← Previous title` and `Next title →`, mono, from adjacent entries in `projects.json`. Wraps around: the last project's "next" is the first.

### 9.4 Notes index — `/notes/`

`<h1>Notes</h1>`, then rows: date (mono, `2026-08-14`) + title (serif, linked) + summary (one line, muted). Newest first.

### 9.5 Note page — `/notes/<slug>/`

`<h1>`, date in mono, then rendered markdown at **text width** (not media width). Images inside notes render at media width, breaking out of the text column. Prev/next by date at the bottom.

### 9.6 About — `/about/`

Rendered markdown at text width. Content is yours to write: what you do, how you work, your pipeline, languages you deliver in, where you are. A portrait is optional and — `TASTE CALL` — probably better omitted; its absence suits the register.

### 9.7 Contact — `/contact/`

The email as a `mailto:` link at h2 size, in mono. One line about response time and what to include in a first email (project, length, language, timeline, budget range). `elsewhere` links. **No form** — a form implies a server; an exposed email costs a little spam and buys a lot of directness.

### 9.8 404 — `/404.html`

`<h1>Not here</h1>`, one line, links to `/` and `/work/`. Cloudflare Pages serves `dist/404.html` automatically.

---

## 10. DESIGN SYSTEM

### 10.1 Concept

**Delivery manifest, not gallery.** The site's grammar is borrowed from the paperwork of film — spec sheets, timecode, archive catalogue cards. Serif carries the writing; monospace carries every number and label. That single contrast does the majority of the art direction, and it happens to be exactly the register a documentary commissioner recognises.

**The signature:** every image on the site sits in a desaturated, slightly contrast-lifted state — a printed-matter reading. On hover or keyboard focus it resolves to full colour over 180 ms. Nothing else on the site moves, ever. On touch devices images render in full colour permanently. `TASTE CALL`, but a cheap one: two lines of CSS, no extra assets, and it delivers "still page, living work" without producing a single video loop.

**Two things to actively avoid**, because they are what makes minimal sites look generic: multi-column broadsheet layouts, and warm-cream-plus-terracotta palettes. This site is cooler and greyer than that, and strictly single-column.

### 10.2 Colour tokens

Declared once as CSS custom properties. No colour may appear anywhere in the stylesheet except as one of these.

```css
--paper:      #EDEBE4;  /* background — bone, cool-neutral newsprint */
--ink:        #1A1917;  /* body text — near-black, faintly warm */
--ink-muted:  #6B6862;  /* metadata, labels, dates */
--rule:       #C9C5BB;  /* hairlines, 1px */
--mark:       #B0281F;  /* registration red */
--paper-lift: #F4F2EC;  /* image placeholder background only */
```

`--mark` appears at most **twice per page**: the registration glyph in the header, and the link underline on hover. That scarcity is what gives it weight. `LOAD-BEARING` — using it for headings or borders collapses the scheme into ordinary.

Pure `#000` and pure `#FFF` appear nowhere.

### 10.3 Typography

| Role | Suggested family | Licence | Weight | Notes |
|---|---|---|---|---|
| Serif — everything written | **Newsreader** | OFL (Google Fonts) | Variable 300–700 | Optical-size axis, genuine editorial character |
| Mono — every number and label | **IBM Plex Mono** | OFL | 400 only | Spec-sheet register, naturally tabular |

Both are `TASTE CALL`. Any serif + mono pair works, provided the serif is a text face (not a display-only face) and both cover the character sets you need. Subset to `latin` + `latin-ext` at minimum; if `{{EXTRA_LANGUAGES}}` includes non-Latin scripts, add those ranges and verify the family supports them.

**Self-host both.** Download once, subset, convert to WOFF2, place in `src/fonts/`. Never link to Google's CDN — it adds a DNS lookup, a third party, and a privacy problem.

```css
@font-face {
  font-family: "SiteSerif";
  src: url("/f/serif-var.woff2") format("woff2-variations");
  font-weight: 300 700;
  font-display: swap;
}
```

Both fonts get `<link rel="preload" as="font" type="font/woff2" crossorigin>` in the `<head>`.

**Fallback stacks** — metrically close, so `swap` doesn't jolt:
```css
--serif: "SiteSerif", Charter, "Bitstream Charter", Georgia, serif;
--mono:  "SiteMono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
```

#### Type scale

| Element | Desktop | Mobile | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| `h1` | 2.25 rem | 1.75 rem | 500 | 1.1 | −0.015 em |
| `h2` | 1.375 rem | 1.25 rem | 600 | 1.25 | −0.005 em |
| `h3` | 1.0625 rem | 1.0625 rem | 600 | 1.4 | 0 |
| body | 1.0625 rem | 1.0625 rem | 400 | 1.65 | 0 |
| mono meta | 0.8125 rem | 0.8125 rem | 400 | 1.5 | 0.02 em |
| mono label | 0.75 rem | 0.75 rem | 400 | 1.4 | 0.08 em, uppercase |
| footer | 0.75 rem | 0.75 rem | 400 | 1.5 | 0.02 em |

Root font-size stays at browser default (16 px). Never set `html { font-size: 62.5% }` — it breaks user accessibility settings.

**Uppercase is used for mono labels only.** Never for headings.

### 10.4 Spacing scale

```css
--s1: 0.25rem;  --s2: 0.5rem;   --s3: 0.75rem;  --s4: 1rem;
--s5: 1.5rem;   --s6: 2rem;     --s7: 3rem;     --s8: 4rem;
--s9: 6rem;     --s10: 8rem;
```

**No margin or padding value anywhere in the stylesheet may fall outside this scale.** `LOAD-BEARING` — inconsistent spacing is the single most reliable tell of an amateur minimal site.

Vertical rhythm: paragraphs `--s4` apart. Sections `--s7`. Major blocks `--s8`. Page top padding `--s6`, bottom `--s9`.

### 10.5 Layout

```css
--w-text:  36rem;   /* 576px — the reading column, ~65 characters */
--w-media: 56rem;   /* 896px — video and stills */
--gutter:  1.5rem;  /* mobile; 2.5rem at ≥700px */
```

The page container is centred at `--w-media`. Text blocks are constrained to `--w-text` and **align to the container's left edge, not centred within it.** That deliberate asymmetry — narrow text, wide media, shared left margin — is what stops the page reading as a default document.

Single column throughout. No grid, no sidebar, no two-up.

### 10.6 Responsive

One breakpoint: **700 px**. Below it: single gutter, metadata wraps to its own line, media goes edge-to-edge within the gutter, type scale shifts per §10.3. That is the entire responsive strategy. More breakpoints would be more code and no more quality.

### 10.7 Links & states

```css
a          { color: var(--ink); text-decoration: underline;
             text-underline-offset: 0.18em;
             text-decoration-thickness: 1px;
             text-decoration-color: var(--rule); }
a:hover    { text-decoration-color: var(--mark); }
a:visited  { color: var(--ink); }          /* no purple */
a:focus-visible { outline: 2px solid var(--mark); outline-offset: 3px; }
```

Real underlines everywhere. No buttons, no pills, no icons, no chevrons, and no `border-radius` anywhere on the site — `border-radius: 0` is the global default and there are no exceptions.

### 10.8 Motion policy

The complete list of things that move on this site:

1. Image desaturation resolving on hover/focus — 180 ms, `ease-out`.
2. Link underline colour on hover — 120 ms.
3. Facade → iframe swap on click — instant, no transition.

Nothing else. No scroll-triggered anything. No fade-in on load. No page transitions.

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition-duration: 0.01ms !important; }
}
```

### 10.9 Print stylesheet

Small, but exactly the kind of detail that signals care. On print: `--paper` → white, hide nav and the play button, print the poster image, and expose link targets:

```css
@media print {
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.75em; }
}
```

### 10.10 The registration mark

Inline SVG, 14 × 14 px, `currentColor`, immediately left of the name in the header, wrapped in a link to `/`. A printer's crosshair: a circle of radius 5 with a 1 px stroke, plus horizontal and vertical lines extending 2 px past the circle on all four sides. Rendered in `--mark`. `aria-hidden="true"`, with the adjacent name providing the accessible link text.

It is the only non-photographic graphic on the entire site.

---

## 11. VIDEO EMBED — FACADE SPEC

### 11.1 Behaviour

**Before click:** the page contains a poster image, a play control, and a `data-yt` attribute. Zero YouTube code has loaded. Zero requests have gone to Google. No YouTube branding is visible anywhere.

**On click or Enter/Space:** the block is replaced by a YouTube iframe with autoplay, which begins playing immediately.

### 11.2 Markup emitted by the build

```html
<figure class="v" data-yt="VIDEO_ID">
  <img src="/m/<slug>/poster-1200.webp" srcset="..." sizes="..."
       width="1600" height="900" alt="" loading="lazy" decoding="async">
  <button type="button" class="v-play" aria-label="Play video: TITLE">
    <span aria-hidden="true">▶</span>
  </button>
  <noscript>
    <a href="https://www.youtube.com/watch?v=VIDEO_ID">Watch on YouTube</a>
  </noscript>
</figure>
```

### 11.3 Iframe injected on activation

```
https://www.youtube-nocookie.com/embed/<ID>
  ?autoplay=1
  &rel=0
  &modestbranding=1
  &playsinline=1
  &color=white
  &iv_load_policy=3
```

- `youtube-nocookie.com` — no tracking cookie until playback.
- `rel=0` — end-screen related videos are restricted to the same channel rather than the open internet. The strongest available guard against a competitor's reel appearing after yours.
- `iv_load_policy=3` — annotations off.

Iframe attributes: `allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"`, `allowfullscreen`, `title="<project title>"`, `loading="lazy"`, no border.

### 11.4 Warm-up

On `mouseenter` or `focus` of a `.v` block — **not on page load** — inject once:

```html
<link rel="preconnect" href="https://www.youtube-nocookie.com">
<link rel="preconnect" href="https://i.ytimg.com">
```

Shaves roughly 100–200 ms off click-to-play, at no cost to visitors who never click.

### 11.5 Play control appearance

A 64 px square, centred, `--paper` at 90% opacity, no radius, a solid `--ink` triangle inside. On hover the fill goes to `--mark`. `TASTE CALL` — it should look like a physical button on a deck, not a YouTube play button. Specifically, not a rounded rectangle and not a circle.

### 11.6 Aspect ratio

`.v { aspect-ratio: 16/9; }` with `--paper-lift` as background. The box never collapses or shifts, image loaded or not.

---

## 12. JAVASCRIPT

### 12.1 The complete inventory

One file, `src/video.js`, doing exactly three things:

1. Attach click and keyboard handlers to `.v` blocks.
2. Inject preconnect hints on first hover/focus.
3. Swap facade for iframe on activation, and move keyboard focus into the iframe.

**Budget: 3 KB uncompressed.** If a future feature needs JavaScript, it justifies itself against this line first.

### 12.2 Rules

- Loaded with `defer`. Never blocking.
- Vanilla. No libraries, no build step, no modules requiring a bundler.
- **The site must be fully functional with JavaScript disabled.** Every page readable, every project reachable, every video watchable via the `<noscript>` link. `LOAD-BEARING` — a static portfolio that dies without JS is a portfolio that dies.
- No inline `<script>` anywhere.
- No third-party script of any kind. No analytics. §23.5 covers analytics if ever wanted.

---

## 13. PERFORMANCE BUDGET

| Metric | Ceiling | How to check |
|---|---|---|
| HTML + CSS per page | 30 KB uncompressed | Build script reports it |
| JavaScript total | 3 KB | File size |
| Fonts total | 80 KB | Size of `dist/f/` |
| Requests before first paint | ≤ 4 | Browser DevTools, Network tab |
| Largest Contentful Paint | < 1.0 s on 4G | PageSpeed Insights |
| Cumulative Layout Shift | 0.00 | PageSpeed Insights |
| Third-party requests before click | **0** | DevTools, Network tab |

That last row is the one that matters most and the one nearly every portfolio fails.

**Verification:** run the live site through PageSpeed Insights on both mobile and desktop after the first deploy. Target 100/100/100/100. This site has no excuse not to hit it.

---

## 14. METADATA, SEO, FEEDS

### 14.1 Per-page `<head>`

```html
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{page title} — {{NAME}}</title>
<meta name="description" content="{summary, ≤160 chars}">
<link rel="canonical" href="{{DOMAIN}}{path}">
<meta property="og:type"        content="website|article">
<meta property="og:title"       content="{title}">
<meta property="og:description" content="{summary}">
<meta property="og:image"       content="{{DOMAIN}}/m/<slug>/poster-1200.webp">
<meta property="og:url"         content="{{DOMAIN}}{path}">
<meta name="twitter:card"       content="summary_large_image">
<meta name="theme-color"        content="#EDEBE4">
```

`<html lang="{{PRIMARY_LANGUAGE}}">`.

Every project page gets its poster as the OG image — so a link pasted into WhatsApp or Slack unfurls with the actual work. That single detail does more for sharing than any social button ever would.

### 14.2 Structured data

On project pages only, a `VideoObject` JSON-LD block: `name`, `description`, `thumbnailUrl`, `uploadDate`, `duration` (ISO 8601, e.g. `PT4M12S`), `embedUrl`. This is how search engines surface video results. Generated automatically from fields already present.

### 14.3 Generated files

- `sitemap.xml` — every page, no `lastmod` (determinism, §8.5)
- `robots.txt` — allow all, point at the sitemap
- `feed.xml` — RSS 2.0 for `/notes/` only, not for projects
- `_headers` (Cloudflare Pages): cache `/m/*` and `/f/*` for one year immutable; HTML for one hour

### 14.4 URL rules

Every URL ends in a trailing slash and is served from `<path>/index.html`. `LOAD-BEARING` — mixing trailing-slash conventions creates duplicate URLs and breaks relative paths.

---

## 15. ACCESSIBILITY

Non-negotiable floor:

- Semantic HTML: one `<h1>` per page, headings in order, `<nav>`, `<main>`, `<footer>`, `<figure>`.
- Every image has an `alt`. Decorative posters inside a labelled figure use `alt=""`.
- Visible focus ring on every interactive element (§10.7). Never `outline: none`.
- Full keyboard operability, including the video facade.
- Contrast: `--ink` on `--paper` is roughly 15:1. `--ink-muted` on `--paper` clears 4.5:1. Verify both before shipping, and re-verify after any colour change.
- `prefers-reduced-motion` respected.
- `lang` set on `<html>`; inline `lang` on any title or quotation in another language.
- Text resizes to 200% without breaking layout.

---

## 16. AUTHOR RUNBOOK — ADDING A PROJECT

Written for the version of you doing this at 2 a.m. after a delivery.

**Step 1 — Export your media.**
- One poster frame: 1920×1080 JPEG, quality 90. Pick a frame that reads at thumbnail size.
- Three to six stills: 1920 px wide minimum, JPEG quality 90.
- Don't resize. The build handles it.

**Step 2 — Upload the video to YouTube.** Settings in §18.

**Step 3 — Make the folder.**
```
media/your-project-slug/
    poster.jpg
    stills/01.jpg  02.jpg  03.jpg
```
Folder name must exactly match the `slug` you're about to write.

**Step 4 — Add the entry.** Open `content/projects.json`, copy the nearest existing entry, paste it where you want the project to appear in the order, and change the values. Watch the commas.

**Step 5 — Look at it.**
```
npm run preview
```
Open `http://localhost:8080`. Ctrl-C to stop.

**Step 6 — Ship it.**
```
npm run deploy
```

**If the build fails:** it prints exactly what's wrong and in which file. Fix it and run again. Nothing is written to `dist/` on a failed build, so a broken build can never take the live site down.

**Other jobs:**

| Job | What to do |
|---|---|
| Reorder the homepage | Move entries up or down in `projects.json` |
| Take a project off the homepage | Delete its `"featured": true` line |
| Hide a project entirely | Add `"draft": true` |
| Rewrite the about page | Edit `content/pages/about.md` |
| Publish a note | New `.md` file in `content/notes/` with front matter |
| Change the whole site's look | Edit `src/site.css`, rebuild — all pages update |
| Change what's on every project page | Edit `src/templates/project.js`, rebuild |

---

## 17. MEDIA PREPARATION

### 17.1 Poster frames

Choose a frame with a clear focal subject and visible depth. The frame will be **desaturated until hovered** — pick something that reads on **tonal contrast**, not on colour. A frame that only works because of a colour pop will look dead in its resting state.

Export: 1920×1080, JPEG, quality 90, sRGB, no sharpening (the WebP re-encode handles it).

### 17.2 Stills

Treat these as the argument for your craft. Three excellent stills beat eight decent ones. Prefer frames that show composition and lighting decisions over frames that show plot.

### 17.3 Colour management

Export everything as **sRGB**. A Display-P3 or Rec.709-tagged export will shift on the web. This is the most common way good work looks wrong online.

### 17.4 Filenames

Lowercase, no spaces, zero-padded: `01.jpg`, `02.jpg`. Not `Still 1 final_v3 FINAL.jpg`.

---

## 18. YOUTUBE CONVENTIONS

| Setting | Value | Why |
|---|---|---|
| Visibility | **Unlisted** for client work, **Public** for showreel and personal work | Unlisted keeps your channel from becoming the front door; public work is discoverable |
| Title | `Project Title — Client (Year)` | Appears if someone opens it on YouTube |
| Description | First line = your site URL | The only backlink you get |
| Comments | Off | |
| Category | Film & Animation | |
| Thumbnail | The same file as your `poster.jpg` | Consistency between site and YouTube |
| Language | Set correctly | Affects auto-captions |
| Captions | Upload an SRT for narrated pieces | Real accessibility gain, and many clients watch muted |
| End screens | **None** | They cover your final frame |
| Cards | **None** | |

### 18.1 The one risk to know about

Unlisted videos are still scanned by Content ID. A piece using licensed music can be claimed and occasionally region-blocked. **Check every upload plays in an incognito window** before you link it.

If one is ever blocked: put that single file in `media/<slug>/video.mp4` and use the fallback path in §23.4. One self-hosted file is not a problem. Sixty would have been.

---

## 19. ACCEPTANCE CHECKLIST

Run before declaring the build finished.

**Build**
- [ ] `npm run build` succeeds from a clean clone
- [ ] Deliberately breaking `projects.json` produces a clear, plain-English error and writes nothing
- [ ] Two consecutive builds are byte-identical (§8.5)
- [ ] Second build reuses the image cache (visibly faster)
- [ ] Adding a project requires touching only `projects.json` and `media/`

**Rendering**
- [ ] Every page in §9 renders
- [ ] Prev/next links are correct on the first and last project
- [ ] A project with `youtube: null` renders without a broken player
- [ ] A project with no stills renders without an empty gap
- [ ] `draft: true` entries appear nowhere, including sitemap and prev/next chains
- [ ] Accented characters render correctly

**Behaviour**
- [ ] With JavaScript disabled: all pages readable, all videos reachable via the noscript link
- [ ] Zero requests to any Google domain before clicking play (verify in DevTools)
- [ ] Video plays on click; keyboard Enter and Space also work
- [ ] Tab order is logical; focus ring always visible
- [ ] No layout shift on load (CLS 0.00)

**Design**
- [ ] No `border-radius` anywhere
- [ ] No colour outside the six tokens
- [ ] No spacing value outside the scale
- [ ] `--mark` red appears at most twice per page
- [ ] Text column never exceeds ~65 characters
- [ ] Readable at 320 px width and at 200% zoom

**Performance**
- [ ] Every page under 30 KB HTML+CSS
- [ ] PageSpeed Insights 100 on mobile and desktop

---

## 20. BUILD PHASES FOR THE CODING AGENT

Build in this order. Stop at each gate and get confirmation before continuing.

**Phase 1 — Skeleton.** Repo structure, `package.json`, `.gitignore`, `serve.js`, and a `build.js` that reads `site.json` and writes a single `dist/index.html` with the shell from §9.0. Two filler projects in `projects.json`, both fully populated, plus placeholder images so the pipeline can be exercised.
*Gate:* `npm run preview` serves a page at localhost.

**Phase 2 — Design system.** Complete `src/site.css` implementing §10 in full. Fonts downloaded, subset, self-hosted, preloaded.
*Gate:* homepage matches §9.1 and §10 exactly at 375 px, 700 px, and 1400 px.

**Phase 3 — Content pipeline.** Full validation (§8.4), image processing with cache (§8.3), markdown for notes and pages.
*Gate:* every error in the §8.4 table produces its specified message. Cache demonstrably works.

**Phase 4 — All page types.** Every template in §9. Prev/next. 404.
*Gate:* the rendering block of §19 passes.

**Phase 5 — Video facade.** `src/video.js` per §11 and §12.
*Gate:* the behaviour block of §19 passes, especially the zero-Google-requests check.

**Phase 6 — Metadata & feeds.** §14 in full.
*Gate:* a project URL unfurls correctly with its poster in a link preview.

**Phase 7 — Audit.** Full §19 checklist. Deploy. PageSpeed on both platforms.
*Gate:* all boxes ticked.

---

## 21. HANDOFF

### 21.1 The prompt

Paste this above the spec when giving it to a coding agent:

> Build the static site described in the attached specification. It is complete and authoritative — implement exactly what it says, using the exact values given. Do not add dependencies beyond `sharp`, `marked`, and `gray-matter`. Do not add features, animations, or libraries not specified. Do not substitute an off-the-shelf static site generator for the custom `build.js`.
>
> Work through §20 phase by phase and stop at each gate for review.
>
> All project content in the spec is invented filler. Do not treat any example project, client, or credit as real. Build the machinery; I will supply the real content myself.
>
> The person operating this site is not a developer. Every error message must be plain English naming the file, the field, what's wrong, and how to fix it. Comment `build.js` for a reader who does not know JavaScript.

### 21.2 What the agent should ask for

Only two things: `{{DEPLOY_COMMAND}}`, and the §2 placeholder values. Everything else is in this document.

### 21.3 `CLAUDE.md`

Create a file called `CLAUDE.md` in the project root. Coding agents read it automatically at the start of every session, so it saves you re-explaining. Contents:

```markdown
# Project rules

This is a static portfolio site. The full specification is in SPEC.md — read it before making changes.

- Never edit files in dist/ — it is generated. Edit src/ or content/ and rebuild.
- Do not add npm dependencies beyond sharp, marked, gray-matter. Ask first.
- Do not add JavaScript beyond src/video.js. The site must work with JS disabled.
- All colours come from the six CSS custom properties in site.css. No other colours.
- All spacing comes from the --s1..--s10 scale. No other values.
- No border-radius anywhere.
- The owner is not a developer. Explain changes in plain English and keep error
  messages plain English.
- After any change, run `npm run build` and confirm it succeeds before saying you're done.
```

---

## 22. TROUBLESHOOTING

| Symptom | Cause | Fix |
|---|---|---|
| Build fails with "not valid JSON" | A trailing comma, or a missing one | Look at the line number printed; usually the comma before `]` or `}` |
| A project doesn't appear | `"draft": true` is still set | Remove the line |
| Images look washed out | Exported in Display-P3 | Re-export as sRGB (§17.3) |
| Poster is cropped wrong | Source wasn't 16:9 | Re-export at 1920×1080 |
| Video shows "unavailable" | Set to Private, not Unlisted | Change on YouTube |
| Video blocked in some countries | Content ID claim on licensed music | §18.1 |
| Text looks too wide | `--w-text` was changed | Return it to 36 rem |
| Changed the CSS, nothing happened | Forgot to rebuild | `npm run build` |
| Page loads slowly | Something third-party got added | Check DevTools for non-your-domain requests before click |
| Fonts flash then change | Normal `font-display: swap` behaviour | Fine. Fixing it costs more than it's worth. |

**When stuck:** paste the full terminal output plus this document into an AI and ask it to fix the specific error. The spec gives it everything it needs to answer correctly.

---

## 23. FUTURE EXTENSIONS

Each is deliberately cheap because the data model already anticipates it.

**23.1 Client grouping.** `client` already exists on every project. Group `/work/` by it, or generate `/work/client/<slug>/` pages. No data migration.

**23.2 Hover loops for the top few pieces.** Add an optional `loop` field pointing at a 6-second, muted, 720p, ~400 KB MP4 in `media/<slug>/`. Commit it to the repo — Cloudflare Pages serves it free. Play on hover, poster otherwise. Roughly 15 extra lines. The halftone-resolve signature already occupies this design space, so add loops only if they earn their production time.

**23.3 Thumbnails on `/work/`.** Data is already there. Purely a template and CSS change. Weigh against §9.2's argument for the catalogue feel.

**23.4 Self-hosting a single blocked video.** Add an optional `video` field. If present, render a native `<video controls poster>` instead of the facade. Roughly 20 lines. Keep total self-hosted media under ~200 MB.

**23.5 Analytics.** If ever needed, use a script-free server-side option — Cloudflare Web Analytics is free and requires no client script. Never add a tracking library; it would violate §12 and §13.

**23.6 Case studies.** Long-form project pages: add an optional `body` field pointing at a markdown file, rendered after the summary.

**23.7 Second language.** Would require a `lang` field per page and duplicated content files. Non-trivial — plan properly rather than bolting it on.

---

## 24. GLOSSARY

**Static site** — a folder of finished HTML files. No server does any thinking when someone visits. The fastest, cheapest, most durable kind of website.

**Build / generate** — running `build.js`, which turns your content into finished HTML.

**`dist/`** — the finished folder that gets uploaded. Regenerated every build. Never edit it.

**Slug** — the URL-safe short name of a project. `example-project-one` → `yoursite.com/work/example-project-one/`.

**Front matter** — the block between `---` lines at the top of a markdown file, holding the title and date.

**Facade** — a fake player. A poster and a play button that only load the real YouTube player when clicked.

**WebP** — a modern image format, roughly 30% smaller than JPEG at the same quality. Universally supported.

**CDN** — a network of servers worldwide that keeps a copy of your files near each visitor.

**Custom property / token** — a named value in CSS, like `--paper`. Change it once, it changes everywhere.

**Measure** — the width of a column of text, counted in characters. Around 65 is the comfortable maximum.

**Hairline** — a 1 px rule. The main structural device on this site.

**LCP / CLS** — how fast the main content appears; how much the page jumps while loading. Both should be excellent here.

---

*End of specification.*
