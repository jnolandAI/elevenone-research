# Eleven One Research

The site for Eleven One Research (1101 Research), part of Eleven Hundred LLC. Astro, deployed
to Netlify at [elevenoneresearch.com](https://elevenoneresearch.com).

Two things here are unusual enough to be worth naming. The brand mark and the homepage's field
are generated from source in this repository rather than drawn in a design
application, and the brief format puts each load-bearing claim's source, assumption and
falsifier on the page.

## Layout

| Path | What it holds |
|---|---|
| `src/` | The Astro site: pages, components, layouts, chart modules |
| `src/content/briefs/` | Briefs, authored in MDX |
| `public/assets/field/` | The homepage band's field, two sizes, rendered from `design-canvas` |
| `public/assets/mark/` | Generated mark, in three cuts, plus the icon family |
| `prototypes/dot-engine.js` | The imagery engine. Single source of truth |
| `scripts/render_mark.py` | The mark generator. Single source of truth |
| `scripts/render_field.mjs` | The field bake. `--check` proves the shipped render is what `design-canvas` draws |
| `docs/` | The contracts the generators and the brief format are held to |
| `references/legacy-imagery/` | Superseded imagery, kept for reference and never published |
| `design-canvas/` | The eleven-gradient set, its generators and its checks |
| `design-canvas/archive/` | The four directions and the early hue studies the set replaced |
| `prototypes/archive/` | Colour-system prototypes the set replaced, all of them accent-based |

## Contracts

Four documents in `docs/` are the contracts the code is written against, not commentary about
it. Where a test or a generator enforces one of their rules, it cites the document by name.

- [`docs/dot-imagery.md`](docs/dot-imagery.md): the imagery engine's constants, roles, and rules
  of use, at version 1.2
- [`docs/mark.md`](docs/mark.md): the mark's three cuts, their size bands, and their consumers,
  at version 1.1
- [`docs/field.md`](docs/field.md): the homepage band's field, what draws it and what the checks prove, at version 1.0
- [`docs/the-working.md`](docs/the-working.md): the claim block, the three standings, and the
  load path

## Working on it

```
npm install
npm run dev            # local server
npm test               # vitest, unit and contract tests
npm run test:e2e       # playwright, needs the dev port free
npm run check          # astro check
npm run build          # writes dist/
```

Regenerating the generated assets needs Python and Playwright:

```
python scripts/render_mark.py --check      # verify the shipped mark matches its source
node scripts/render_field.mjs --check      # verify the shipped field matches design-canvas
python scripts/render_dot.py --list        # subjects, roles, and engine version
python scripts/build_dot_pages.py          # rebuild the two generated pages
```

Edit `prototypes/dot-engine.js` and you must run `build_dot_pages.py`, or the two generated
pages go stale without any test noticing. Edit `design-canvas/_fx.js`, `_applied.cjs` or
`gradients.json` and you must run `render_field.mjs`, or `npm test` fails on the sha.

## Deployment

Netlify builds `main` on push. `netlify.toml` carries the build command and the publish
directory.
