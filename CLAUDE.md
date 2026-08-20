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
