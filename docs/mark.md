# The mark

Version **1.0**. Decided after two rounds: four directions drawn from the system
(`prototypes/marks.html`), thirteen variations on the two that held
(`prototypes/marks-2.html`), and six derivations of the one that held best
(`prototypes/marks-3.html`).

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

| Path                                | What it is                              |
| ----------------------------------- | --------------------------------------- |
| `scripts/render_mark.py`            | The generator. The mark lives here, not in a drawing application |
| `assets/mark/mark.svg`              | Display cut, 25px and above             |
| `assets/mark/mark-small.svg`        | Small cut, below 25px                   |
| `assets/mark/mark-inverse.svg`      | Display cut for dark grounds            |
| `assets/mark/mark-small-inverse.svg`| Small cut for dark grounds              |
| `assets/mark/favicon-16.png` `-32`  | Raster favicons                         |
| `assets/mark/icon-180.png` `-512`   | Touch icon and store icon               |

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

## Two cuts, not one drawing scaled

| Cut       | Pitch | Max radius | Use            | Dots |
| --------- | ----- | ---------- | -------------- | ---- |
| `display` | 9.50  | 3.70       | 25px and above | 112  |
| `small`   | 21.38 | 7.77       | Below 25px     | 23   |

A halftone changes line screen for newsprint. A mark changes it for a favicon.
Scaling the display cut down to 16px turns 112 dots into mud, so the small cut
is a coarser drawing of the same field rather than a smaller copy of the same
drawing. Both read as the same mark, which is the test that matters.

## Rules of use

1. **Never on a plate.** The mark has no container. Putting it in a rounded
   square makes it an app tile and throws away the reason it was chosen.
2. **Clear space is the mark's own width on every side.** The field dissolves
   at its edges, so it needs air or the dissolve reads as an error.
3. **Minimum size 16px.** Below that the small cut loses the scatter and the
   idea goes with it.
4. **Never recoloured.** Ink or inverse. There is no third value.
5. **Never rotated, stretched, outlined or given a shadow.** The screen angle
   is a brand constant, not a composition choice.
6. **The lockup is mark, then space, then the name**, with the mark set to
   roughly the wordmark's cap height. "Eleven One" at 600 and "Research" at 500
   in `--g70`, which is how the name is set everywhere else.
7. **If a constant changes, bump `VERSION`** and re-export everything. A mark
   that exists in two versions in the wild is two marks.

## What it deliberately does not do

It does not encode "eleven" or "one". The earlier reticle direction hid the name
in clock positions, which nobody decodes and which had no bearing on the work.
A mark has to be true and distinctive; it does not have to be a puzzle.

It does not carry a marked point. That version exists (`marks-3.html`, V4) and
is the more legible drawing, but the point makes the mark a statement about a
result rather than about method, and the field alone is the more confident
object.
