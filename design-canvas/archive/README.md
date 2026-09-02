# archive

Superseded by the eleven-gradient set. Kept because the reasoning is worth more
than the conclusion, and read-only: nothing here is built by `build-canvas.cjs`,
nothing here is in `canvas-directions.json`, and nothing here should be revived
without deciding first that the set was wrong.

The live system is one directory up. `gradients.json` is its source of record
and the `elevenone-design` skill is how to use it.

## The four directions

`Stack`, `Terrain`, `Instrument` and the two Ember rows were the argument that
led to the set rather than the set. A direction was ONLY colour and how colour
meets a surface: type, words, objects, layout and which grounds are dark were
held identical across all four so the comparison was clean. The write-up is in
`../README.md`.

They were also 43 of the canvas's 71 artboards and about three fifths of its
weight, and the canvas had stopped mounting. That is the second reason they are
here rather than there.

| | |
|---|---|
| `Stack*`, `Terrain*`, `Instrument*` | Three languages, four page types each |
| `EmberSteel*`, `EmberWarm*` | The two Ember candidate rows |
| `build-langs.cjs`, `build-pages.cjs` | Their generators |

## The early studies

Ran before a direction existed, on the question of what a hue is allowed to do.

| | |
|---|---|
| `SingleHue`, `Diverging`, `Achromatic`, `TwoAnchor` | Treatment, from `build-hues.cjs` |
| `Spectrum`, `HueBudget` | Hue, generators already gone |
| `Terrain`, `Wireframe`, `Planes`, `Ridges` | Objects, from `build-objects.cjs` |
| `Figure` | An early exhibit |

## The dead checks

`ramps-check`, `planes-check`, `iso-check`, `emit-check`, `simulate`, `analyse`.
Each measured something only the studies above had. The checks the live system
runs are listed in `../README.md`.

## The stale manifests and exports

`canvas.json` names `DirectionB.dc.html` and `DirectionC.dc.html`, which no
longer exist. It is not the canvas: `canvas-directions.json` is, despite the
name, which is itself a leftover from this era.

`eleven-one-design-directions.html` and `eleven-one-dispersion.html` are
seven megabytes of single-file export from the same period.

## Running one of these

They read their modules from the working directory, so run them from HERE, not
from `design-canvas/`. Four of them read `grid.js`, `kde.js` or `_lang.js`,
which stayed behind because the live system still uses them; those paths were
rewritten to `../` when the files moved and are the only edit made to any of
this.
