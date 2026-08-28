# Staging directory for hand-generated art

Drop `<id>.png` files here, matching the ids in `art/piece-001.manifest.json`,
then run `npm run art:import`. The importer copies each file into
`public/assets/art/` and writes the provenance record beside it.

Get the prompts with `npm run art:prompts`. PNG only: the pages reference
`.png`, and the importer refuses a `.webp` or `.jpg` by name rather than
skipping it silently.

This directory is gitignored. Only the imported result is committed.
