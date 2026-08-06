# Dot imagery

The brand's subject imagery. It occupies the slot where a firm like McKinsey
commissions custom illustration, and it exists so that Eleven One Research never
needs a photographer, a stock licence, or an image carrying the visual tells of
AI generation.

## The principle

**The renderer is the brand, not the source.**

Every image, whatever it started as, is reduced to a luminance field and pushed
through one halftone screen at fixed constants. A procedural 3D scene, a
public-domain photograph and a generated image all come out belonging to the
same house, because the screen does the work rather than the subject.

## Files

| Path                            | What it is                                                    |
| ------------------------------- | ------------------------------------------------------------- |
| `prototypes/dot-engine.js`      | Single source of truth: constants, roles, subjects, the screen |
| `prototypes/dot-foundry.html`   | Tuning rig and library viewer, built from the engine           |
| `prototypes/dot-render.html`    | Headless render page, built from the engine                    |
| `scripts/build_dot_pages.py`    | Rebuilds both pages after any engine change                    |
| `scripts/render_dot.py`         | Production CLI                                                 |
| `public/assets/dot/`            | Rendered output plus `manifest.json`                           |

Both pages are generated from the same engine, so the foundry and the renderer
cannot drift apart. After editing `dot-engine.js`, run
`python scripts/build_dot_pages.py`.

## Constants

Brand values, version **1.1**. Not per-image choices.

| Parameter     | Value     | Controls                                             |
| ------------- | --------- | ---------------------------------------------------- |
| Gamma         | 1.00      | Curve from luminance to dot area                     |
| Screen angle  | 15°       | Rotation of the lattice, the classic halftone angle  |
| Edge dissolve | 0.16      | Fraction of the frame over which the field thins out |
| Grid          | Staggered | Offset rows, not a square lattice                    |
| Dot           | `#131312` | The interface ink exactly. Never a grey, never a hue |
| Field         | `#FCFCFB` | Matches the card surface, so images have no edge     |

### Version history

- **1.1** Dot changed from `#17171A` to `#131312`. The old value was cool where
  the interface ink is warm, so an image's black did not match the type's black
  on the same page. No brief had published, so the whole library of 15
  development renders was re-rendered rather than left split across two inks.
  The manifest is the check: every asset now records `1.1`.
- **1.0** Initial constants.

## Roles

Role decides output size and dot pitch together. Pitch is set so that a hero and
a figure show the **same perceived dot size** once each is displayed at its
intended width, which is why the pitch numbers are not proportional to the
output size.

| Role     | Output      | Pitch | Use                                       |
| -------- | ----------- | ----- | ----------------------------------------- |
| `hero`   | 2880 × 1200 | 12    | Full-bleed header at the top of a brief   |
| `figure` | 1440 × 920  | 12    | Inside the body of a brief or report      |
| `card`   | 920 × 600   | 12    | Index listing and brief cards             |
| `social` | 1200 × 630  | 6     | Open Graph and link previews              |
| `cover`  | 1600 × 2000 | 9     | Report PDF cover, portrait                |

Four renderings share the constants: **dot** (the default), **hatch** (better in
print at small sizes), **contour** (marching squares, for anything geographic or
surface-like), and **ascii** (loudest, use sparingly, outputs `.txt`).

## Production

```bash
python scripts/render_dot.py --list
python scripts/render_dot.py --subject port --role hero
python scripts/render_dot.py --subject wind --role figure --mode contour
python scripts/render_dot.py --all --role card
```

Output lands in `public/assets/dot/<subject>-<role>-<mode>.png` and every render appends
to `public/assets/dot/manifest.json` with its size, pitch, engine version and source
type. The CLI reads subjects and roles out of the engine at runtime, so it can
never disagree with it about what exists.

The foundry's sliders do not affect the CLI. They exist to decide the constants,
not to produce assets, and the page says so.

## Two things the engine does that are worth knowing

**Cells are area-averaged, not point-sampled.** A halftone cell stands for the
whole area it covers. Sampling only the pixel at its centre loses anything
thinner than the pitch, which is how gantry legs vanish and container stacks
alias into a flat slab. The 3D pass is also supersampled up to 4000px so the
averaging has real detail to work with.

**Cameras can be role-specific.** One camera cannot serve a 2.4:1 header and a
1.5:1 card. `CAM_ROLE` holds overrides keyed `<subject>:<role>`; everything else
falls back to `CAM`. Keep the override table sparse, so most subjects stay
single-camera.

## Making a new subject

Only step one is subject-specific, which is why a new industry is an afternoon
rather than a commission.

1. **Model.** Add a branch to `buildScene()` in `dot-engine.js`. Primitives only.
   Two materials: `mat` for lighter mass, `dark` for structure. The `rnd()`
   helper is seeded per subject, so scenes are deterministic and re-render
   identically.
2. **Frame.** Add an entry to `CAM`. Frame wide. Add a `CAM_ROLE` entry for
   `hero` if the wide crop needs its own framing, which it usually does.
3. **Build.** `python scripts/build_dot_pages.py`
4. **Render.** `python scripts/render_dot.py --subject <id> --role <role>`

Then apply the recognition test.

## The recognition test

View the screened image at roughly 200px wide and ask whether the subject is
identifiable without the caption. If it is not, the scene is wrong, not the
screen. The usual causes, in order of frequency:

- The camera is too close and the silhouette is cropped.
- A ground plane is filling a third of the frame with flat mid-grey.
- Structure and mass are the same tone, so nothing separates.
- The subject is too small in frame and the screen has eaten the detail.

## The screen as a surface treatment

The same screen also draws depth on large interface panels, where a blurred
dark blob under a light surface reads as a smudge rather than as elevation.
A **halftone ramp** replaces it: the same staggered lattice at the same 15°
angle, dot radius rising toward the corner the light turns away from, thinning
at the frame edges. Implemented as `dotRamp()` in
`prototypes/system-greyscale.html` and `prototypes/brief.html`.

Two things keep this from becoming decoration:

- **It is not imagery and it is not data.** It renders no subject and encodes no
  value. The rules above about captions, figures and numbers do not apply,
  because there is nothing to caption. It is a surface, like a gradient.
- **It stays quiet.** Pitch 13, maximum radius 2.15, group opacity 0.44, which
  puts the dense corner around eight levels below the light one. If a reader
  notices the pattern before they notice the content, it is too strong.

Dot area still carries the value and opacity never does, which is the same rule
the imagery obeys. That is what makes the two read as one system rather than as
a texture that happens to look similar.

## Other sources

Procedural scenes are the default because they are owned outright and
re-renderable. Two other paths run through the identical engine when modelling is
impractical.

- **Public-domain and free-licence photography.** Wikimedia Commons, NOAA, USGS,
  NASA and the Library of Congress cover most industrial and geographic subjects
  at no cost. Record source and licence in the manifest.
- **Generated imagery.** Reduction to a luminance field destroys most of the
  texture that makes a generated image detectable, so the screen is unusually
  forgiving here. Last resort, and recorded as such in the manifest.

Whatever the source, the caption names the subject and says *rendered*.

## Rules of use

1. **One image per brief at the top, and at most one more inside it.** The device
   stops working the moment it is everywhere. If a brief seems to want three, two
   of them are decoration.
2. **Never where a real chart belongs.** These are subject imagery, not evidence.
   A dot rendering of a port signals that the brief concerns ports. It never
   substitutes for a figure and never carries a number.
3. **Never captioned as data.**
4. **Same engine, always.** A one-off tuning is how a system becomes a folder.
5. **Greyscale absolutely.**
6. **Published work keeps the look it shipped with.** If a constant changes, bump
   `CONST.version` and record it in the manifest. Do not re-render briefs that
   are already out. A dated brief is a document of record, and silently
   restyling its imagery is the same category of act as silently restyling its
   numbers.

## Library

| Subject             | Covers                                                        |
| ------------------- | ------------------------------------------------------------- |
| Container port      | Logistics, trade, supply chain, freight rates, port congestion |
| Data centre         | Compute demand, colocation, power draw, AI infrastructure      |
| Wind generation     | Renewables, interconnection queues, capacity build, PPAs       |
| Industrial robotics | Automation, factory capex, labour substitution, throughput     |
| Transmission grid   | Utilities, grid constraint, siting, transmission build         |
| Urban density       | Real estate, site selection, market entry, catchment           |

Gaps worth filling next, roughly in order of likely need: diagnostics and lab
services, semiconductor fabrication, pharmaceutical manufacturing, rail freight,
warehousing and fulfilment, water infrastructure, mining and extraction,
agriculture.
