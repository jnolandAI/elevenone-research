# research-kit

Renders research pieces for either of two brands: the page vocabulary in
`styles/deck.css`, the page family and exhibits in `components/`, the geometry
in `lib/`, and the gates in `scripts/`. Colour is named through the
token contract in `contract/`: every colour a component uses is a `--ct-*`
name, resolved from whatever adapter the consuming site's `tokens.css`
supplies. `scripts/portability.mjs` gates that claim by rendering the kit
against a site's own tokens and failing on any fallback colour.

## What a consuming site must supply

- **A contract adapter.** A `tokens.css` (or equivalent) that declares every
  `--ct-*` name in `contract/tokens.contract.json`, in terms of the site's own
  design tokens. See `tests/adapter-noland.test.ts` in the noland-advisory
  repository for the shape one takes.
- **Page geometry, for `components/Row.astro`.** `Row.astro` reads
  `--container-margin` and `--container-gutter` for its margin column width
  and text column padding. These are not contract names: page geometry has
  no contract home by design, so the kit does not supply, name, or default
  them. A site that uses `Row` must define both itself. Noland Advisory
  defines them in `src/styles/tokens.css`. **Eleven One does not define them
  today** — rendering `Row` there gets an invalid `width` and a
  `padding-left` of nothing, which `portability.mjs` cannot catch because it
  measures colour only.

- **An ordinal level-1 tint, for `styles/deck.css`.** `.s-matrix__cell--lv1`
  reads `--deck-ordinal-lv1`. This is not a contract name either, and for a
  reason the contract cannot resolve: no four-step ordinal ramp in either
  palette is simultaneously perceptible from the page and separable across its
  steps within the grey-40 cap dark body text requires. Level 1 has no contract
  role until that palette question is settled, so each site supplies the value.
  Noland Advisory defines it in `src/styles/tokens.css` as its grey-10 step. A
  site that omits it gets a transparent cell, which reads as a design choice
  rather than as a fault.

## Profiles

`profiles/` holds one file per document shape: `brief` and `report` for
published research, `deliverable` for a client readout. A profile carries the
page budget, the section template and the calibration constants for that shape.

`audit.mjs` and `density.mjs` **require** `--profile <name>` and have no
default. They used to carry one shape's constants inline and apply them to
every shape, which is wrong in the direction that matters: a published
research page runs a median of 141 words against a client page's 190, and its
titles are shorter by three words at the median. Scoring a research piece
against deliverable constants asks it to be fuller and wordier than the corpus
it is imitating, and says nothing about having done so.

    node scripts/audit.mjs   --profile brief src/pages/pieces
    node scripts/density.mjs --profile brief http://localhost:4321/pieces/001

The same page count is a fault under one profile and a form under another: 41%
of published research pages run under 120 words, so the research profiles
expect two fifths of their pages to be thin while `deliverable` allows none.

## Imagery

`generate-art.mjs` renders the images a piece references, once, from a manifest
of `{ id, role, subject, alt }`. The style half of every prompt comes from the
consuming site's `--ct-art-direction`, not from the kit: two brands must not
produce imagery that reads as the same model, so a kit that hard-coded the
style would defeat the contract. The subject leads the prompt and the direction
follows it.

    node scripts/generate-art.mjs --manifest <m> --out <dir> --adapter <css> [--dry-run]
    node scripts/artcheck.mjs     --manifest <m> --out <dir> --src <dir> [--adapter <css>]

`--dry-run` composes and prints every prompt without calling anything. Use it
before spending.

Nothing is fetched at render time. Each generated image is committed alongside
a provenance record carrying the prompt, model, size, timestamp and a prompt
hash, and an unchanged hash is skipped, so a rebuild costs nothing and changing
a subject costs one image. Provenance is recorded for tracking, not for
disclosure: generated imagery carries no visible credit on the piece.

`artcheck.mjs` fails on a missing asset, a missing provenance record, absent or
medium-naming alt text, an orphan file, a page referencing an id the manifest
does not carry, and an image whose recorded prompt no longer matches what the
manifest and adapter compose today.

## What the kit deliberately does not hold

No brand values, and no piece content. Drafts, art manifests and rendered
pieces live outside this directory. A stylesheet here may name a value the
contract does not govern only when it appears in the list above.
