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
| `scripts/templates/*.tpl.html`  | The hand-written shell of each page. Edit here, never the generated output |
| `scripts/render_dot.py`         | Production CLI                                                 |
| `scripts/webp_derive.py`        | Derives a lossless WebP delivery asset beside each PNG, at native size |
| `public/assets/dot/`            | Rendered output: PNGs, their derived WebPs, plus `manifest.json` |
| `src/components/home/`          | First production consumer: `HomeHero.astro` and `Coverage.astro` |
| `tests/dot-engine.test.ts`      | Unit tests for the engine's pure functions, loaded without a browser |

Both pages inline the same engine, so no scene, role or constant can differ
between them. After editing `dot-engine.js`, run
`python scripts/build_dot_pages.py`.

That guarantee covers the engine and stops at the marker. Each page's driver
sits below `<!--__ENGINE__-->` in its template and is written by hand, so the
two can still call the engine differently, and once did: the foundry passed
`CONST.fade`, a scalar that `fadeSet()` expands to four sides, while the
renderer went through `renderRole()` and got the shipped two. Regenerating the
pages never fixed it, because regeneration only replaces the engine payload.
Anything the foundry shows as "what ships" has to route through the same call
production makes.

## Constants

Brand values, version **1.3**. Not per-image choices.

| Parameter     | Value              | Controls                                                     |
| ------------- | ------------------ | -------------------------------------------------------------- |
| Gamma         | 1.00               | Curve from luminance to dot area                              |
| Screen angle  | 15°                | Rotation of the lattice, the classic halftone angle           |
| Edge dissolve | Per edge, per role | Fraction of the frame over which each side thins              |
| Fog near      | 0.55               | Fog start, as a multiple of camera-to-subject distance        |
| Fog far       | 3.20               | Fog full, same units. Sits outside the scene by design         |
| Tone scale    | 5 steps            | `#D6D6D4` to `#565654`. Scene materials                       |
| Grid          | Staggered          | Offset rows, not a square lattice                              |
| Dot           | `#131312`          | The interface ink exactly. Never a grey, never a hue           |
| Field         | `#FCFCFB`          | Matches the card surface, so images have no edge               |

Fog near and far are multipliers of the camera's distance to its look-at
point, not fixed depths. A role that pulls the camera back gets a
proportionally deeper fog with no table to maintain per subject.

**The far plane belongs outside the scene.** Fog on this substrate runs toward
the field, so a far plane inside the scene does not push geometry back, it
deletes it. At 1.90 everything past roughly twice the camera distance reached
pure white and stopped being drawn, and the result read as flatness rather than
as space. 3.20 keeps the same gradient and never saturates inside the frame. If
a horizon needs to recede further, move the ridge, never pull the far plane in.

### Version history

- **1.3** One constant. `fogFar` 1.90 to 3.20, no geometry moved. 1.2's depth
  pass had implemented recession as erasure, and measured against the
  pre-depth-pass renders it made four of six subjects flatter rather than
  deeper. Local tonal modulation on the hero crops, pre-1.2 to 1.2 to 1.3:
  robotics 0.116, 0.074, 0.110; port 0.166, 0.153, 0.178; grid 0.057, 0.054,
  0.084; wind 0.078, 0.067, 0.086; datacenter 0.141, 0.198, 0.229; urban 0.149,
  0.182, 0.213. Every subject now sits at or above where it was before the depth
  pass. The `ridgeDist` values are untouched: they were solved correctly against
  a band that was itself wrong, and every ridge now lands between 0.260 and
  0.360 rather than 0.516 to 0.707. This also closed the scatter limitation 1.2
  recorded and deferred, with no pass of its own. See the depth test.

- **1.2** Depth and edges. The two scene materials, 46 levels apart, became a
  five-step tone scale spanning 128, because two tones cannot describe depth
  however the scene is built. Distance fog now lifts far geometry toward the
  field, derived from camera distance rather than declared per subject. Five
  subjects that stood on a flat slab now call one shared `ground()` helper for a
  displaced plane, a ridge silhouette and a distant scatter. The ridge's
  distance is its own option, `ridgeDist`, rather than derived from ground
  depth: deriving it from `-d/2 + 4` tied how far the horizon reads to how
  large the ground plane happened to be, and pulling the ridge inside the fog
  band then meant shrinking the ground until its scatter collapsed to a single
  ring. `ground()` throws if `ridge` is set and `ridgeDist` is absent, because
  a silent fallback is exactly what produced the dead ridges in the first
  place. Edge dissolve became a per-edge declaration on a smoothstep curve:
  left and right dissolve at 0.18, top and bottom hold. Nothing had published,
  so the whole library was re-rendered rather than left split across two
  versions.
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

### Edge dissolve

Each role declares which of its four sides thin out and by how much, as a
fraction of the frame. `EDGE_ROLE` overrides a role default for one
`<subject>:<role>` pair and is kept sparse for the same reason `CAM_ROLE` is: a
table that grows past a handful of entries means the role defaults are wrong.
It ships empty. Every role currently uses its own default, no subject has
needed an exception, and a reader should be able to tell that the emptiness is
the discipline rather than a table nobody has gotten to yet.

| Side   | Default | Why                                               |
| ------ | ------- | -------------------------------------------------- |
| Left   | 0.18    | The scene is genuinely cut off mid-subject here    |
| Right  | 0.18    | The same                                           |
| Top    | 0.00    | Empty field. There is nothing there to dissolve    |
| Bottom | 0.00    | Fading the ground makes the scene float            |

The falloff is smoothstep, not linear. A linear ramp begins abruptly at the
fraction boundary and that onset reads as an edge of its own.

The dissolve ends as a hard stop, not at zero, and it stops sooner for light
geometry than for dark. `screen()` culls a cell at `t < 0.015` and a dot at
`rad < 0.18`, so a dot is dropped before it gets small, and the fainter the
element the earlier in the band it crosses that floor. Measured across
`grid-hero-dot.png`, whose left and right both dissolve at 0.18: the conductor
and crossarm band, the darkest thing in the frame, draws to x 0.024 and 0.975,
where the dissolve factor is already down to 0.05. The horizon band gives up at
x 0.036 and 0.964, at a factor of 0.10. The ground bands between them land at
0.033 to 0.035. Nothing reaches the frame edge, the outer 2.4% is empty on
every band, and a light element terminates roughly 1.2% of the frame inside a
dark one. Usually that is what you want, since a horizon trailing off before
the structure does reads as atmosphere, but the dissolve fraction on its own
does not tell you where a given element stops.

## Production

```bash
python scripts/render_dot.py --list
python scripts/render_dot.py --subject port --role hero
python scripts/render_dot.py --subject wind --role figure --mode contour
python scripts/render_dot.py --all --role card
python scripts/webp_derive.py --all
```

Output lands in `public/assets/dot/<subject>-<role>-<mode>.png` and every render appends
to `public/assets/dot/manifest.json` with its size, pitch, engine version and source
type. The CLI reads subjects and roles out of the engine at runtime, so it can
never disagree with it about what exists.

`webp_derive.py` is a separate, required second step: it derives a lossless
WebP beside each PNG at native size and records it under that entry's `webp`
key. `src/lib/dot.ts`'s `dotAsset()`, the site's only reader of this manifest,
resolves to the WebP and throws if a role has been rendered but never derived,
rather than silently falling back to the PNG.

The foundry's controls do not affect the CLI. They exist to decide the
constants, not to produce assets, and the page says so. They start on the
shipped values, including the per-edge dissolve, which the page resolves
through the same `fadeFor()` call `renderRole()` makes.

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

Modelling, ground and framing are the subject-specific parts. Everything after
them is two commands, which is why a new industry is an afternoon rather than a
commission.

1. **Model.** Add a branch to `buildScene()` in `dot-engine.js`. Primitives only,
   drawn from the five-step `TONE` scale: `TONE[0]` for anything meant to read
   as distant, `TONE[4]` for the structure the eye should land on first. The
   `rnd()` helper is seeded per subject, so scenes are deterministic and
   re-render identically. Two adjacent steps for the subject's mass and the
   deepest step for its thinnest defining element is the shape that works: a
   gantry beam, a conductor, a rack's cap rail. `tests/dot-engine.test.ts`
   scores each subject on its own, so a branch that stays inside three steps
   or spans under 96 levels fails. Urban is the only exception and is named as
   one in that test: it is a field of massing with no fine structure, so it
   grades `TONE[0]` to `TONE[3]` for recession and never reaches the deepest
   step. A new subject that wants the same treatment argues for it there rather
   than quietly stopping at `TONE[3]`.
2. **Ground.** End the branch with one call to `ground(g, TONE, rnd, {...})`.
   Every subject makes exactly one, and a test enforces it, because five
   hand-rolled slabs became five different landscapes the last time they were
   left to the subject. It gives a displaced plane, a ridge silhouette at the
   far edge and a sparse scatter between them. Options are below. If the
   subject has a ridge it must also carry `ridgeDist`, and solving that is the
   one part of this step that is not a default.
3. **Frame.** Add an entry to `CAM`. Frame wide. Add a `CAM_ROLE` entry for
   `hero` if the wide crop needs its own framing, which it usually does.
4. **Build.** `python scripts/build_dot_pages.py`
5. **Render.** `python scripts/render_dot.py --subject <id> --role <role>`
6. **Derive.** `python scripts/webp_derive.py --all`

Then apply the recognition test.

### `ground()` options

| Option      | Default | What it sets                                                                 |
| ----------- | ------- | ---------------------------------------------------------------------------- |
| `w`         | none    | Plane width, and the ridge's total width. The ridge is 26 boxes of `w/26`     |
| `d`         | none    | Plane depth, the scatter's radial span, and the scatter's z bias              |
| `amp`       | `1.0`   | Height of the plane's displacement. Inert when `plane: false`                 |
| `flat`      | `26`    | Radius held undisplaced around the subject, and the scatter's inner radius    |
| `plane`     | `true`  | Pass `false` when the subject models its own terrain, as wind does            |
| `ridge`     | `0`     | Height of the far horizon silhouette. `0` means no ridge and no `ridgeDist`   |
| `ridgeDist` | none    | How far in front of the origin the ridge sits. Required whenever `ridge` is set |
| `scatter`   | `0`     | Number of small boxes in the annulus between the subject and the ridge. Reads at every role since 1.3: see the depth test |

Three of those couple to more than their name suggests, and a caller cannot see
it from the call site:

- **`flat` gates two things.** It holds plane displacement at zero across the
  subject's footprint, and it is also the scatter's inner radius, which applies
  even when `plane: false`. Wind passes no plane and still inherits the default
  26 as the radius its scatter must clear.
- **`d` gates three.** Plane depth, the scatter's radial span
  (`scatterRadius()` runs the annulus from `flat + 6` to `d/2 - 2`), and the
  scatter's z bias (`-d * 0.12`). Cutting `d` to fix the plane silently
  collapses the scatter: once `d/2` drops below `flat + 8` the annulus becomes
  a single ring at `flat + 6`. That is exactly what happened to four subjects
  before `ridgeDist` existed.
- **`w` gates two.** Plane width and ridge width.

### Solving `ridgeDist`

`ground()` throws if `ridge` is set and `ridgeDist` is absent, with no
fallback, because the fallback it used to have (`-d/2 + 4`) tied how distant
the horizon reads to how large the ground plane happened to be, and five
subjects' ridges drifted past `fogFar` and rendered as pure white with nobody
noticing.

Target: a fog fraction of **0.25 to 0.40** at every role the subject renders.
Below that the ridge competes with the subject; above it the ridge starts
lifting toward the field. Compute it against the subject's own camera:

```
camPos   = camFor(id, role) position, each component times ROLES[role].dist
camDist  = |camPos - lookAt|
fogNear  = camDist * 0.55        fogFar = camDist * 3.20
ridgePt  = (0, ridge * 0.725 / 2 - 1, -ridgeDist)
fraction = (|ridgePt - camPos| - fogNear) / (fogFar - fogNear)
```

`0.725` is the midpoint of `ground()`'s `0.45 + rnd() * 0.55` height factor, so
`ridgePt` is the average ridge box rather than a tall one. Solve for the
`ridgeDist` that lands every role inside the band and take the midpoint of the
overlap. Against the 3.20 band the shipped values land between 0.260 and 0.360,
tightly enough that port no longer straddles anything: its two cameras differ by
nearly 2x and both now sit inside, at 0.263 and 0.360.
`tests/dot-engine.test.ts` asserts every ridge stays inside its fog band, at
every role in the manifest, and fails anything outside 0.15 to 0.55.

That fraction is linear in depth. Three.js puts a smoothstep on it before
painting, so the shipped ridges, linear 0.26 to 0.36, render at 0.17 to 0.30.
The band is stated linearly because that is what every current `ridgeDist` was
solved against; convert before comparing it with a measured fog factor.

## The recognition test

View the screened image at roughly 200px wide and ask whether the subject is
identifiable without the caption. If it is not, the scene is wrong, not the
screen. The usual causes, in order of frequency:

- The camera is too close and the silhouette is cropped.
- A ground plane is filling a third of the frame with flat mid-grey.
- Structure and mass are the same tone, so nothing separates.
- The subject is too small in frame and the screen has eaten the detail.

**Data centre is a known exception, at `card` only.** Four scene variants were
tried, including pair-grouped rows at two elevations and a dedicated floor
plate, and the camera was reframed twice. Rebuilding the scene into depth-axis
corridors with a back wall fixed the corrugated dune-field failure the earlier
layouts had, and pulling the racks onto `TONE[2]`/`TONE[3]` with the cap rail
at `TONE[4]` gave the scene a dark end it had been missing: the corridor
rework had left it drawing from `TONE[0]` to `TONE[2]` only, a 58-level span
against every other subject's 128.

That changed the verdict at three of the four roles and not at the fourth.
`hero`, `figure` and `social` now read as rows of identical tall cabinets in an
interior, with an aisle, a floor and a back wall, where before they read as
pale ghost blocks. That is not the same as unmistakable: a reader without the
caption could still land on lockers or switchgear rather than on servers.
`card` still fails. At 920px and a 12px pitch shown at the 249px the coverage
grid uses, the halftone lattice itself aliases and the scene collapses to two
dark lumps; alongside port's cranes and grid's towers at the same size, the
difference is not close.

The original diagnosis holds as written. Rack-unit texture is unrecoverable at
a 12px pitch displayed at roughly 200px, and no tone assignment recovers it.
What the dark end recovered is one step coarser: cabinet-level cadence and real
figure-ground separation. That is enough at the roles whose native width is
large enough to survive the downsample and not enough at `card`, where the
downsample is only 3.7x and the lattice is still visible when it lands.

### The depth test

Recognition asks whether the subject reads. Depth asks whether it occupies
space. Both have to pass, and a scene can pass the first while failing the
second, which is what every render did before 1.2.

At full size: can three distinct depth planes be named, and does far geometry
sit lighter than near geometry?

The levers, in the order to reach for them: `ground()`'s `amp` and `ridge` for a
scene with no horizon, and the camera for a scene where nothing is near. Fog is
not a lever. It is derived from camera distance, so a subject that seems to
need its own fog has the wrong camera.

**`scatter` became a working lever at 1.3, and this is the one place the doc
used to say otherwise.** At 1.2 most of it sat far enough back to be painted the
fog colour and never reach the screen, and this section recorded that as a
limitation deferred to a pass of its own. Widening the far plane closed it
without that pass and without moving any geometry. Three.js linear fog is
`smoothstep(fogNear, fogFar, -mvPosition.z)`, and at a factor of 1.0 the
fragment is exactly the fog colour whatever the shading says. Measured over the
annulus `ground()` draws from, uniform in angle and in `t`, restricted to what
each role's frustum shows, so the figures describe the distribution rather than
one seed's draw:

| Subject and role  | In frame | ≥ 0.98 at 1.2 | ≥ 0.98 at 1.3 | Median at 1.2 | Median at 1.3 |
| ----------------- | -------- | ------------- | ------------- | ------------- | ------------- |
| datacenter hero   | 39%      | 100%          | 0%            | 1.00          | 0.83          |
| datacenter card   | 29%      | 100%          | 0%            | 1.00          | 0.71          |
| datacenter figure | 30%      | 100%          | 0%            | 1.00          | 0.71          |
| datacenter social | 35%      | 99%           | 0%            | 1.00          | 0.69          |
| port hero         | 47%      | 94%           | 0%            | 1.00          | 0.67          |
| urban hero        | 48%      | 84%           | 0%            | 1.00          | 0.59          |
| wind hero         | 54%      | 75%           | 0%            | 1.00          | 0.60          |
| urban card        | 37%      | 62%           | 0%            | 0.99          | 0.47          |
| wind card         | 46%      | 52%           | 0%            | 0.98          | 0.46          |
| grid hero         | 66%      | 51%           | 0%            | 0.98          | 0.46          |
| grid card         | 59%      | 36%           | 0%            | 0.89          | 0.36          |
| wind cover        | 34%      | 5%            | 0%            | 0.84          | 0.33          |
| port card         | 68%      | 0%            | 0%            | 0.79          | 0.29          |

Nothing in the library is erased any more. Datacenter's hero is the most faded
crop at a median of 0.83 and is the one to watch if the cameras move again.
`tests/dot-engine.test.ts` now asserts the bound directly: the farthest box the
annulus can produce, at every subject and role, stays inside the band.

**Known case: port.** The hero carries a ridge at `ridgeDist` 22 for its
horizon, and since 1.3 its scatter reads as well, at a median factor of 0.67,
so the middle plane the 1.2 doc said was missing is now there. What is still
missing is a gradient across the subject itself: `buildScene('port')` draws
exactly four identical cranes, so no size or tone difference among them signals
that they recede. That is a geometry matter rather than a fog one, and the fog
band cannot fix it.

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

| Parameter     | Value | Controls                                      |
| ------------- | ----- | ---------------------------------------------- |
| Pitch         | 13    | Lattice spacing, `src/scripts/screen.ts`        |
| Max radius    | 2.15  | Densest dot, at the corner the light turns from |
| Group opacity | 0.44  | Fixed alpha on the whole ramp, not per dot      |
| Edge dissolve | 0.055 | Fraction of the frame over which the ramp thins |

These are `dotRamp()`'s call-site values (`src/scripts/screen.ts`), quieter than
its own coded defaults (pitch 12, radius 2.6, opacity 0.5), because a panel
surface has to stay in the background behind real type and figures in a way a
full-bleed hero image does not.

Dot area carries the value in both `dotField` and `dotRamp`: radius alone
decides whether a dot exists. Opacity is not silent in `dotField`, though. It
also rises with density, from 0.14 to 0.92, as a second channel layered on top
of a decision area already made: reinforcing, not standing in for radius.
`dotRamp` is the one place opacity truly never varies per dot, set once as the
ramp's fixed group alpha above.

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
7. **Never resample a render.** The lattice sits at a fixed 15 degree screen
   angle and any resampling grid beats against it and moires: dots clump,
   adjacent structures lose separation, and the file gets larger because clean
   dots become intermediate greys. Measured on `grid-hero-dot`: 2880px wide is
   328 KB, resampled to 1920px wide is 401 KB. This bars `astro:assets` and any
   generated `srcset` for this imagery. If something smaller is needed, render
   it at that size, where role-specific pitch keeps the perceived dot size
   right. Delivery format is WebP lossless at native size, derived by
   `scripts/webp_derive.py`.
8. **No component clips a render.** The render's own per-edge dissolve is the
   only edge treatment the imagery gets, and a container that clips cuts it off
   before a reader sees it. `HomeHero` did exactly this, with `overflow: hidden`
   and the image pushed to `right: -10%`, and no amount of dissolve inside the
   render survived it. `e2e/dot-imagery.spec.ts` holds the line, because the
   next layout problem is very likely to be solved the same way. This does not
   cover `BriefHero`, whose surface is `dotField()` from
   `src/lib/charts/halftone.ts` rather than an imagery-engine render. One
   render is also its own exception: the contour branch of `screen()`
   (`dot-engine.js:517-544`) never calls `edge()`, so `contour` mode has no
   dissolve at all and `wind-cover-contour.png` ships with hard edges on all
   four sides. Treat that as a gap in `screen()` rather than as licence to clip
   it, and if a second contour asset is ever commissioned, close the gap first.

The homepage carries seven images, one hero and the six-card coverage strip.
That is a considered exception to rule 1, resolved on weight rather than count:
the hero is the only image with scale and contrast behind it, and the strip sits
below the fold at card size.

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
