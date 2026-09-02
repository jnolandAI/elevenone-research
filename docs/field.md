# The field

The homepage band's image, at version 1.0. The one place on the site proper
where colour appears, and it appears as an image rather than as a value in
the CSS, which is why `tests/tokens.test.ts` can go on holding every
stylesheet to greyscale and be telling the truth.

Judgement about when a Field is the right device, and what the other three
devices are, lives in the `elevenone-design` skill. The gradient set lives in
`design-canvas/gradients.json`. This document is the contract between those
two and the site: what is rendered, from what, and what the checks prove.

## Files

| Path | What it is |
|---|---|
| `scripts/render_field.mjs` | The bake. Render, `--check`, `--measure` |
| `public/assets/field/home-wide.png` | 2400 × 900, the render of record for 900px and up |
| `public/assets/field/home-narrow.png` | 1200 × 1200, the render of record under 900px |
| `public/assets/field/*.webp` | What ships. Lossy, quality 0.80, same pixels |
| `public/assets/field/manifest.json` | Sizes, the member, grain, seed, and every sha |
| `src/lib/field.ts` | `fieldAsset(name)`, throws on a miss |
| `src/components/home/HomeHero.astro` | The band |
| `tests/field.test.ts`, `e2e/field.spec.ts` | The checks |

## What is drawn

Exactly what `design-canvas/AppHomeField.dc.html` draws, because it is drawn
by the same code:

    ctx.fillStyle = '#131312'; ctx.fillRect(0, 0, W, H);
    fxField(ctx, W, H, ramp, 1, BLOBS_HOME, 'lighter');
    fxGrain(ctx, W, H, 0.06, 17, 1);

- **One member, `cobalt-iris`.** A site is one piece and a piece is one
  gradient. `render_field.mjs` requires `A_SITE` from
  `design-canvas/_applied.cjs` and refuses to run if it is not the
  `cobalt-iris` anchors in `gradients.json`, so the manifest's claim is
  checked rather than typed.
- **Four masses, `BLOBS_HOME`.** Required from `_applied.cjs`, not copied.
  Three sit off the right and bottom edges and one faint one off the top
  left, which is what keeps the left third quiet for the headline.
- **Additive, on ink.** `lighter` compositing on `#131312`, which is also
  `--ink`, so the band's CSS ground and the image's ground are the same
  value and there is no seam where one meets the other.
- **Grain in the pixels.** Amplitude 0.06, seed 17, one device pixel.
  `_fx.js` records that CSS grain at this amplitude is invisible.

## Two sizes, and why

An image cannot follow the viewport. A single wide render squeezed into a
portrait phone would show a sliver of the right-hand masses and nothing of
the quiet third, so a second render is drawn tall. `<picture>` picks the
narrow one under 900px. Both are cropped with `object-fit: cover` anchored
left, which holds the quiet edge under the headline at any width.

## Lossy, and why

The dot renders ship lossless WebP because lossy smears a lattice. A field
is the opposite case: it is smooth colour plus noise, and lossless WebP of
noise runs to megabytes. Measured before choosing:

| Quality | `home-wide` | `home-narrow` |
|---|---|---|
| 0.70 | 75 KB | 52 KB |
| 0.80 | 183 KB | 125 KB |
| 0.85 | 299 KB | 200 KB |
| 0.90 | 449 KB | 299 KB |

0.85 was the first choice and put the narrow render at 200 KB against a
160 KB ceiling; 0.80 was chosen after looking at both, because at 1200 wide
they cannot be told apart.

At 0.80 the grain is visible at 100 per cent and the sizes are as above.
Ceilings in `tests/field.test.ts` are set at 220 KB wide and 150 KB narrow,
which is the measured size times 1.2, rounded up to the nearest 10 KB. The
next render that breaches a ceiling should be answered by looking at the
render, not by raising the number.

## What the checks prove

| Check | Proves | Cannot prove |
|---|---|---|
| `render_field.mjs --check` | The PNG is what `_fx.js`, `_applied.cjs` and `gradients.json` draw today | That the WebP encoder has not changed |
| `tests/field.test.ts` | Every file exists at its stated size and sha; `_fx.js` matches the sha the render recorded; WebP is lossy and under its ceiling | Anything about how it looks |
| `e2e/field.spec.ts` | The image covers the band at 1440 and 390; the h1 sits on a patch no brighter than 0.8 of the brightest third | That the quiet third is quiet enough to read on a screen you have not looked at |

`--check` runs before any commit that touches `design-canvas/_fx.js`,
`_lang.js`, `_applied.cjs` or `gradients.json`. The sha half runs on every
`npm test`. The lossy check walks the WebP's RIFF chunks to the image chunk
rather than reading a fixed offset, because Chromium writes the extended
container, VP8X first, and the dot pipeline's guard assumed the simple one.

## Rules of use

1. **Re-render, never edit.** The PNG is output. A change to the band is a
   change to `BLOBS_HOME` or the member, followed by `render_field.mjs`.
2. **One device on the page.** The band is the homepage's device. Nothing
   else on the page carries colour; Working is greyscale and stays so.
3. **Furniture stays grey.** The nav on the band uses `--band-text` and
   `--band-rule`, which are greys. The field is the only colour.
4. **The field is decorative.** `alt=""`. It is weather, not a subject; a
   subject would be a Hero, which is a different device with its own rules.
5. **Version bumps re-render everything.** As with the dot library: a change
   to `_fx.js` that alters the drawing is a 1.x bump here and both renders
   are redone in the same commit, so the site never carries two versions.
