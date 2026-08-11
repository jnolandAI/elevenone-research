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
| `public/assets/mark/favicon-16.png` `-32`   | Raster favicons                                                   |
| `public/assets/mark/icon-180.png` `-512`    | Touch icon and store icon                                         |

```bash
python scripts/render_mark.py           # rebuild everything
python scripts/render_mark.py --check   # fail if anything has drifted
```

The drawing is deterministic: the PRNG is seeded on lattice position, so the
same constants always produce the same file. `--check` is the guard against a
mark that quietly changes.

## Constants

| Parameter     | Value     | Controls                                        |
| ------------- | --------- | ----------------------------------------------- |
| Screen angle  | 15°       | Shared with the imagery engine                  |
| Jitter        | 0.85      | Disorder at the open end, in units of pitch     |
| Gamma         | 1.20      | Curve from field value to dot area              |
| Edge dissolve | 0.13      | Fraction of the frame over which the field thins |
| Ink           | `#131312` | The interface ink exactly                       |
| Inverse       | `#FAFAF9` | On dark grounds only                            |

These four are what `display` and `small` draw from unmodified. `micro`
carries its own values for all four except screen angle, for the reason
given below.

## Version history

- **1.1** A third cut. The small cut served everything below 25px, which is
  every place a reader actually meets the mark: `Nav` at 19px, `Footer` at
  17px and both PNG favicons. At 16px its 23 dots were not a resolution
  problem, since the lattice gives roughly 3.4px of spacing. The problem was
  count combined with three settings that each removed dots at the wrong
  moment: jitter scattered the open end into what read as dirt, gamma pulled
  mid-field dots below `RMIN` so they were never drawn, and the edge dissolve
  removed an outer ring of a drawing five dots across. `micro` is a coarser
  drawing of the same field with its own settings for all three. The icon
  family also gained a full-bleed ink ground, and `icon-180.png` moved off
  the small cut, which the doc had always reserved for below 25px. The
  display and small drawings ship byte-identical, so there is one display
  mark in the wild, not two.
- **1.0** Initial. Four directions, thirteen variations on the two that held,
  six derivations of the one that held best.

## Three cuts, not one drawing scaled

| Cut       | Pitch | Max radius | Band           | Dots |
| --------- | ----- | ---------- | -------------- | ---- |
| `display` | 9.50  | 3.70       | 33px and above | 112  |
| `small`   | 21.38 | 7.77       | 21 to 32px     | 23   |
| `micro`   | 30.0  | 11.0       | 16 to 20px     | 11   |

The micro cut also carries its own gamma, jitter, edge dissolve and field
ramp, because at roughly a dozen dots the settings that serve 23 do not serve
11: the scatter reads as dirt, the mid-field dots fall below `RMIN` and are
never drawn, and dissolving 13 percent of a four-dot-wide drawing removes an
entire ring. `display` and `small` carry only a pitch and a radius, so they
draw from the module constants and are byte-identical to what shipped at 1.0.

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

| Cut       | Consumers                                                    |
| --------- | ------------------------------------------------------------ |
| `micro`   | `Nav` at 19px, `Footer` at 17px, `favicon-16.png`, `icon.svg` |
| `small`   | `favicon-32.png`                                              |
| `display` | `icon-180.png`, `icon-512.png`                                |

`display`'s live consumer is `icon-180.png`. `icon-512.png` is generated
alongside it as a store icon, sized for a web app manifest this site does
not currently ship, so nothing in `src/` references the file. It stays in
the build because generating it is cheap and having it ready is correct;
it is not wired up, and this table should not be read as claiming it is.

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
