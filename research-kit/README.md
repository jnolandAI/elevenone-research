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

## What the kit deliberately does not hold

No brand values, and no piece content. Drafts, art manifests and rendered
pieces live outside this directory. A stylesheet here may name a value the
contract does not govern only when it appears in the list above.
