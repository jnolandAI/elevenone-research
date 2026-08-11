# The mark

Version **1.1**. Decided after two rounds: four directions drawn from the system
(`prototypes/marks.html`), thirteen variations on the two that held
(`prototypes/marks-2.html`), and six derivations of the one that held best
(`prototypes/marks-3.html`). 1.1 added a third cut, chosen from
`prototypes/marks-micro.html` on the same contact-sheet method.

## What it is

An unbounded halftone field on the imagery engine's own staggered lattice at
15°. **The lattice is scattered wherever the field is open and locks into the
screen wherever it is dense.**

That is the whole idea: noise resolving into order. It is what analysis is, it
is true of the work, and it is the one thing on the page a stranger can feel
without being told. They read "it tightens up," which is close enough that the
story holds when you tell it.

There is no container, no boundary and no marked point. The dissolve is the
silhouette.

## Files

| Path                                        | What it is                                                        |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `scripts/render_mark.py`                    | The generator. The mark lives here, not in a drawing application. `--sheet` regenerates the contact sheet below |
| `prototypes/marks-micro.html`               | Contact sheet of micro-cut candidates, generated, not hand-edited |
| `public/assets/mark/mark.svg`               | Display cut, 33px and above                                       |
| `public/assets/mark/mark-small.svg`         | Small cut, 21 to 32px                                             |
| `public/assets/mark/mark-micro.svg`         | Micro cut, 16 to 20px                                             |
| `public/assets/mark/mark-inverse.svg`       | Display cut for dark grounds                                      |
| `public/assets/mark/mark-small-inverse.svg` | Small cut for dark grounds                                        |
| `public/assets/mark/mark-micro-inverse.svg` | Micro cut for dark grounds                                        |
| `public/assets/mark/icon.svg`               | Micro cut, inverse dots on a full-bleed ground: the SVG favicon   |
| `public/assets/mark/favicon-16.png` `-32`   | Raster favicons, both drawn from the micro cut                    |
| `public/assets/mark/icon-180.png` `-512`    | Touch icon and store icon                                         |
| `public/assets/mark/manifest.json`          | The parameters every file above was drawn from, machine-readable  |

```bash
python scripts/render_mark.py             # rebuild everything
python scripts/render_mark.py --check     # fail if any generated file has drifted
python scripts/render_mark.py --check --no-raster   # the same, minus the four PNGs
python scripts/render_mark.py --sheet     # rebuild the contact sheet
python scripts/render_mark.py --metrics   # score the three shipped cuts
```

The drawing is deterministic: the PRNG is seeded on lattice position, so the
same constants always produce the same file. `--check` re-derives all thirteen
generated files, the seven SVGs and the four PNGs and `manifest.json` and the
contact sheet, and compares each against disk. `--no-raster` drops the four
PNGs and says so in the output, so the count printed is always the count
verified. The rasters need Playwright; without it `--check` fails rather than
reporting a pass it did not earn.

`--check` compares disk against what the current code generates, so it catches
a hand-edited file and not a changed constant. The guard against a changed
constant is `tests/mark.test.ts`, which holds the four 1.0 drawings against
committed SHA-256 digests.

Nothing reads `manifest.json` at runtime. It exists because rule 7 turns on
being able to tell one version of the mark from another once files are in the
wild, and it is the only artifact that carries the parameters a given file was
drawn from. Every cut is written out resolved. Jitter, gamma and edge were
top-level keys at 1.0, when all three cuts drew from them; they are not
top-level now, because a `jitter` beside `cuts` would read as the mark's
jitter while being untrue of the cut a reader most often sees.

## Constants

Two kinds of value live in the generator, and the difference is the whole
reason there are three cuts.

Global, true of every cut:

| Parameter     | Value     | Controls                                             |
| ------------- | --------- | ---------------------------------------------------- |
| Screen angle  | 15°       | Shared with the imagery engine                       |
| `RMIN`        | 0.22      | Below this radius a dot is not drawn at all          |
| Ink           | `#131312` | The interface ink exactly                            |
| Inverse       | `#FAFAF9` | On dark grounds only                                 |

Per cut. `display` and `small` name neither, so both take the module default
shown here, which is what keeps them byte-identical to 1.0. `micro` names all
five:

| Parameter        | `display`, `small` | `micro` | Controls                                        |
| ---------------- | ------------------ | ------- | ----------------------------------------------- |
| Jitter           | 0.85               | 0.45    | Disorder at the open end, in units of pitch     |
| Gamma            | 1.20               | 1.20    | Curve from field value to dot area              |
| Edge dissolve    | 0.13               | 0.06    | Fraction of the frame over which the field thins |
| `LO`, field ramp | 0.06               | 0.00    | The diagonal ramp's foot                        |
| `SPAN`           | 0.90               | 0.78    | The diagonal ramp's range                       |

Screen angle is global because it is a brand constant under rule 5. Ink and
inverse are global under rule 4. `RMIN` is global because it is a property of
the renderer rather than of a cut: a dot smaller than that is not a smaller
dot, it is a speck.

## Version history

- **1.1** A third cut. The small cut served everything below 25px, which is
  every place a reader actually meets the mark: `Nav` at 19px, `Footer` at
  17px and both PNG favicons. At 16px its 23 dots were not a resolution
  problem, since the lattice gives roughly 3.4px of spacing. The problem was
  count combined with three settings that each removed dots at the wrong
  moment: jitter scattered the open end into what read as dirt, gamma pulled
  mid-field dots below `RMIN` so they were never drawn, and the edge dissolve
  removed an outer ring of a drawing four dots across. `micro` is a coarser
  drawing of the same field with its own settings for all three. The icon
  family also gained a full-bleed ink ground, and `icon-180.png` moved off
  the small cut, which the doc had always reserved for below 25px. The
  display and small drawings ship byte-identical, so there is one display
  mark in the wild, not two.

  `favicon-32.png` moved to `micro` as well. It and `icon.svg` serve the same
  tab-icon slot, and which of the two a reader gets is the browser's decision:
  Chromium and Firefox take the SVG, Safari falls back to the PNG. Drawing
  them from different cuts would have put two versions of the mark in the wild
  and split them by browser, which is what rule 7 forbids. The consequence is
  that `small` now has no consumer. Nothing renders the mark between 21 and
  32px and every icon file is drawn from `micro` or `display`, so the cut
  exists to hold the 1.0 drawing byte-identical rather than because anything
  reads it, in the same way `icon-512.png` stays in the build without being
  wired up.
- **1.0** Initial. Four directions, thirteen variations on the two that held,
  six derivations of the one that held best.

## Three cuts, not one drawing scaled

| Cut       | Pitch | Max radius | Band           | Dots |
| --------- | ----- | ---------- | -------------- | ---- |
| `display` | 9.50  | 3.70       | 33px and above | 112  |
| `small`   | 21.38 | 7.77       | 21 to 32px     | 23   |
| `micro`   | 30.0  | 11.0       | 16 to 20px     | 11   |

The ladder is not monotonic at the 20-to-21 boundary. Measured by the
generator's own criterion, a dot whose diameter reaches one device pixel:
`micro` at 20px draws 11 dots, 10 of which clear a pixel, the largest 4.4px
across. `small` at 21px draws 23, only 12 of which clear a pixel, the largest
2.4px. Crossing that boundary upward makes the mark worse, not better.
Nothing renders in 21 to 32 today, which is the only reason this costs
nothing. Anyone writing `<Mark size={24} />` should expect a thinner drawing
than at 20px, and should treat that as a reason to reopen the boundary rather
than a surprise.

The micro cut also carries its own gamma, jitter, edge dissolve and field
ramp, because at roughly a dozen dots the settings that serve 23 do not serve
11: the scatter reads as dirt, the mid-field dots fall below `RMIN` and are
never drawn, and dissolving 13 percent of a four-dot-wide drawing removes an
entire ring. `display` and `small` carry only a pitch and a radius, so they
draw from the module constants and are byte-identical to what shipped at 1.0.

`icon.svg` is the one place in the system where "three cuts, not one drawing
scaled" cannot hold. It is resolution-independent and it carries exactly one
cut, so whichever cut it is pinned to is the drawing a browser scales to every
size it wants a favicon at, from a 16px tab strip to a bookmark bar to a
pinned tile. It is pinned to `micro`, because the tab strip is where it is
almost always seen and because `favicon-32.png` shares that slot. The cost is
real: a browser rendering `icon.svg` large gets 11 dots at large size, which
is the sparse-specks problem that moved `icon-180.png` off the small cut. The
raster icons at 180 and 512 exist so that the large slots have a display-cut
file to prefer.

The micro cut's inverse is drawn at 9.68, a shade under its 11.0 radius,
rather than reusing the same radius the way `display` and `small` do for
theirs. Light dots on a dark ground read visually larger than dark dots on
light at the same radius, so the inverse is drawn a shade smaller to match.
The contact sheet's guess was 0.92 of the drawn radius; the shipped value is
0.88, one step below the guess, chosen after a true-16px side-by-side rather
than trusted on sight.

A halftone changes line screen for newsprint. A mark changes it for a
favicon. All three cuts read as the same mark, which is the test that
matters.

| Cut       | Consumers                                                                        |
| --------- | --------------------------------------------------------------------------------- |
| `micro`   | `Nav` at 19px, `Footer` at 17px, `favicon-16.png`, `favicon-32.png`, `icon.svg` |
| `small`   | none                                                                              |
| `display` | `icon-180.png`, `icon-512.png`                                                    |

`display`'s live consumer is `icon-180.png`. `icon-512.png` is generated
alongside it as a store icon, sized for a web app manifest this site does
not currently ship, so nothing in `src/` references the file. It stays in
the build because generating it is cheap and having it ready is correct;
it is not wired up, and this table should not be read as claiming it is.

`small` has no consumer at all, which is worth saying plainly rather than
leaving to be inferred from an empty cell. `favicon-32.png` was its last one
until 1.1 moved it to `micro`, and nothing in the site renders the mark in
the 21-to-32px band the cut is named for. What `small` does now is hold the
1.0 drawing byte-identical, which is a real job under rule 7 and the reason
it is not deleted: `mark-small.svg` and `mark-small-inverse.svg` are two of
the four files a checksum test pins, and deleting the cut would delete the
baseline the display cut's own guard is measured beside. It is a preserved
drawing rather than a live one. If a consumer ever lands in that band, read
the note above the cuts table first: the 20-to-21 boundary hands it a worse
drawing than the size below.

The display floor moved from 25px to 33px at 1.1. Nothing rendered the mark
between 25 and 32px, so no consumer moved.

## Rules of use

1. **Never on a plate.** The mark has no container. Putting it in a rounded
   square makes it an app tile and throws away the reason it was chosen. The
   icon family carries a ground, not a plate; rule 8 is why those are not
   the same thing.
2. **Clear space is the mark's own width on every side.** The field dissolves
   at its edges, so it needs air or the dissolve reads as an error.
3. **Minimum size 16px.** Below that the micro cut loses the scatter and the
   idea goes with it.
4. **Never recoloured.** Ink or inverse. There is no third value.
5. **Never rotated, stretched, outlined or given a shadow.** The screen angle
   is a brand constant, not a composition choice.
6. **The lockup is mark, then space, then the name**, with the mark set to
   roughly the wordmark's cap height. "Eleven One" at 600 and "Research" at 500
   in `--g70`, which is how the name is set everywhere else.
7. **If a constant changes, bump `VERSION`** and re-export everything. A mark
   that exists in two versions in the wild is two marks.
8. **A ground is an icon-file property and never a page one.** SVGs used on a
   page carry ink dots and no ground. Icon files carry `#FAFAF9` dots on a
   full-bleed `#131312` ground, because an icon slot is an opaque square
   whether we supply the ground or not: iOS composites transparency to black
   on the home screen, so the old `icon-180.png` had a ground we did not
   control. Nothing is drawn around the mark and there is no inset shape it
   sits inside, so rule 1 survives. The browser or the operating system
   applies its own rounding, as it does to every icon. There are no
   theme-scoped variants: a mark with two appearances in the wild is two
   marks, which is what rule 7 is about.

## What it deliberately does not do

It does not encode "eleven" or "one". The earlier reticle direction hid the name
in clock positions, which nobody decodes and which had no bearing on the work.
A mark has to be true and distinctive; it does not have to be a puzzle.

It does not carry a marked point. That version exists (`marks-3.html`, V4) and
is the more legible drawing, but the point makes the mark a statement about a
result rather than about method, and the field alone is the more confident
object.
