# Claude context

One line per decision: what we decided, and why. Newest at the bottom. Updated at the end of every finished task.

## Foundations
- Custom build script with only sharp, marked and gray-matter: few moving parts, nothing to break, easy to keep for years.
- Content lives in content/ and media/, the site is generated into dist/: the owner edits plain files and never touches the output.
- dist/ is committed and Cloudflare publishes it as-is (it does not build): what was checked on this computer is exactly what goes live.
- Builds are repeatable, byte for byte: the same input always gives the same site, so any change shows up clearly.
- No JavaScript except src/video.js, and the site works with it off: fast, private, nothing to maintain.
- Six colours, one spacing scale, no rounded corners: keeps every page consistent without design decisions each time.
- All error messages in plain English: the owner is not a developer.

## Hosting and speed
- Never use a _redirects file: a catch-all one blocked every deployment for days with a loop error.
- Wrong addresses go to the 404 page through not_found_handling in wrangler.jsonc: the safe way that works with this host.
- _headers rules must never overlap: Cloudflare merges overlapping values into broken ones.
- Every file address carries a fingerprint (?v=...): files can be cached for a year and still update the moment they change.
- Videos stay under 25 MB (warning at 23 MB): one bigger file makes Cloudflare reject the whole deployment.
- Videos are compressed only if they stay at least 99% visually identical: the owner's rule, smaller files start sooner.
- Originals are never edited; backups live in D:\Personal Brand\media-originals: compression is always undoable.
- Cloudflare loads whole video files rather than parts: accepted, so smaller files matter more.
- Images are served as WebP only: decided by the owner, small and widely supported.
- Link previews are made from the page's own picture, padded with its most common edge colour: avoids streaky edges.

## Layout and design
- Text column is 42rem wide, about 75% of the column: the narrower 30rem looked like a cheap workaround.
- A thin red line sits on the inside right edge beside text blocks, padded from other elements: balances the composition.
- The animated signature replaces the name visually, the real heading stays underneath, and it holds still for reduced motion: looks good without hurting access.
- Vertical films are centred; film sizes come from the video file itself: no manual sizing, no layout jumps.
- A divider above previous/next links only appears when there are links: an empty divider left a blank strip.
- Notes list has a fixed date column: a long summary pushed a title out of line.
- Notes stay plain sentences, no mono label rows (CLIENT / TOOLS): the rows looked too techy, the owner preferred plain text.

## Projects
- Projects use a tagged media list (YouTube, video file, image, links): any mix per project without new code.
- Each project can show a category line, e.g. "Documentary · Animation & Compositing": visitors see what kind of work it is first.
- Runtime is not shown anywhere: clips are excerpts, so a runtime number was misleading.
- Year can be a span, e.g. 2025–2026: some work was made over time.
- Athar copy says "video" and "series", never "film" or "episode": the owner's wording, it is not a film.
- "A longer look" links to the 3-minute YouTube cut: it is a longer view, not the whole project.
- Edits for the Feed: six Instagram links, reels named Edit 01–06, copy says old personal projects: honest and simple; owner does not want them renamed.
- Éclipse was removed: not ready to show.
- Work page has one grey line under the list, "A small selection of recent work. More is being added.", from workNote in site.json: honest about a small selection without bragging; only on the Work page, not on each project.

## Notes
- Notes can hold a video with a same-named cover image: for scene breakdowns.
- Scene breakdowns are client work and say "Client work. All rights reserved to Athar.fr.": clear about ownership.
- Titles stay neutral, e.g. "Scene Breakdown: The Day Baghdad Fell": "Taken Apart: Baghdad" felt clickbait.
- No art credit to Ahnaf Tahmid Rafid on breakdowns: the owner's call.
- "The Map" note is dated 2026-11-03, the day it was made, and says "dangerously simple composition": the owner's wording and timing.

## Pages and copy
- Copy is short, plain and not self-praising: visitors are potential clients and it must not sound AI-written.
- About page: who he is, what he does, tools (After Effects, Premiere Pro, Photoshop, AI), bilingual: the long version was boring.
- Contact is just the email and a reply time: nothing else needed.
- Empty Notes page said "Nothing here for now": subtle, not cliche.

## Analytics
- Cloudflare Web Analytics only, no extra tracking scripts: enough for a portfolio and keeps the no-script rule.

## Working rules
- Never publish until the owner says "publish": the live site is public.
- Never recursively delete content/: it once deleted real content during testing.
- Explain changes briefly in plain English: long technical replies were not understood.
- Every decision and its reason is logged here in one line when a task finishes: the owner's ground rule.
- Auto-compact is set to 500k tokens (owner ran /autocompact 500000): saves usage; claude-context.md keeps decisions safe through compaction.
- Link preview for home, work, about and contact uses the owner's artwork in src/og.jpg (1200x630 JPG), falling back to the signature card if removed: a recognisable face and name stand out in chats.
