# research-kit

Renders research pieces for either of two brands. Colour is named through the
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
