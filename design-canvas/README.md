# design-canvas

How colour enters the Eleven One design system.

ONE THING IS DECIDED: the gradient set, eleven of them, under "The gradient
set" below. `gradients.json` is its source of record. Everything else in this
directory is the argument that led there, kept because the reasoning is worth
more than the conclusion when the next question comes.

Still open: how often a piece is allowed each device. `PRODUCT.md` remains the
constitution and has not yet been amended to carry any of this.

**Judgement about WHEN to use what does not live here.** It lives in the
`elevenone-design` skill, outside the repo at
`~/.claude/skills/elevenone-design/`, which carries the four devices (Field,
Shape, Form, Hero), the rules for choosing between them, and the craft
constraints. This README is the record of how the system was arrived at; the
skill is how to use it. When design feedback arrives, the skill is what gets
amended.

Current canvas:
<https://claude.ai/code/artifact/f26c1b51-a8c5-4b10-b931-aaa3306a99e2>

## The decision this canvas is built to serve

One variable: **the palette, and how colour meets the surface.** Everything
else is held identical across all four directions, on purpose.

Held constant:

- Type. Familjen Grotesk and Martian Mono. This is not a type revisit.
- Content. The same lede, headline, claim block and cohort figures on every
  page of every direction.
- Objects. The same density surface, the same stacked planes, the same chart
  geometry. Both a real rendered object and an abstract construction appear
  in every direction: they are not alternatives to each other.
- Layout. Same grid, same furniture, same margins.
- Grounds. Cover, section and panel dark; reading, exhibit and back matter
  light. Identical in all four.

Varies:

- The two ramps, on dark and on paper.
- How colour lands: additive, flat, or screened.
- Atmosphere: glow and grain.
- The single interface accent.

Settled earlier and still standing: colour is a field, never furniture, plus
exactly one interface accent. Every rule, border, label, axis and panel stays
greyscale. No full rainbow: the first generator swept 280 degrees of hue and
was rejected.

## The four directions

| Direction | Idea | Treatment |
|---|---|---|
| Ember | Colour is light. The surface emits it. | additive field, grain 0.075 |
| Signal | Colour is one hue. Brightness carries the quantity. | additive field, fine dots, grain 0.045 |
| Pigment | Colour is ink. The surface is screened, not lit. | field composites as ink, coarse dots, grain 0.105 at 2x |
| Achromatic | No colour in the field. One accent, interface only. | ink composite, grain 0.055 |

Achromatic is the current constitution and the null the other three have to
beat. Every board carries a chroma slider; pulling any direction to 0
collapses it onto that null, which is the comparison the colour question
actually turns on.

Two ramps per direction, plus a dim one for dark grounds. `dark` and `light`
are the ENCODING ramps and carry quantity. The paper FIELD comes off the
`light` ramp at higher chroma and lower alpha, not off a ramp of its own.

There used to be a third, a pale `fieldLight` wash. It is gone. The paper
field composites with multiply, and multiply is identity against white: a wash
already at lightness 0.94 multiplied to nothing, which is exactly why the
light boards kept reading as having no direction on them. The encoding ramp
reaches lightness 0.36 and is visible. `fieldDark` survives, because an
additive field on a dark ground has the opposite problem and needs its own dim
anchors. Field hue travel is still capped near 160 degrees.

Two canvas pages:

- **Report**, seven columns by four rows plus the key board. Cover on dark,
  the same cover on white, section, reading page, exhibit, dense panel, back
  matter. Four of the seven are white pages.
- **Site**, three columns by four rows at 1440 wide: home, research index,
  article. Home carries a dark hero and a light body so both grounds sit on
  one page.

Read down a column to compare one page across all four; read across a row to
see one direction built out.

## How a surface is drawn

Four primitives, in `_fx.js`, shared by both generators. The previous version
was built from two moves: one linear gradient across the frame and a hairline
wireframe. That produces a flat diagonal wash with a lit mesh on it, which is
not what the reference work does and is what got rejected twice.

| Primitive | What it does | Why not the old way |
|---|---|---|
| `fxField` | Several large soft masses, most centred off frame | One linear gradient has a direction and an even density everywhere. Masses have cores and quiet ground between them. |
| `fxGrain` | Dust in the pixels, half darkening and half lightening | The CSS feTurbulence overlay ran at 0.06 opacity and was invisible at reading size. |
| `fxDots` | The object built from particles, mesh demoted to substrate | Stroke weight carrying elevation reads as a wireframe. Radius and opacity carrying it reads as a surface. |
| `fxCloud` | A distribution as diffuse dust under one hairline | A filled area under a curve asserts an edge the estimate does not have. |

Three details that matter more than they look:

- Masses use a **cosine-squared falloff over twenty stops**. A two-stop radial
  gradient shows a visible ring wherever the falloff changes slope. Cosine
  squared has zero derivative at both ends, so there is no ring to find.
- Blob layout is a **shared constant**, `BLOBS_DARK` and `BLOBS_LIGHT` in
  `_dirs.cjs`. Every direction places the same masses at the same radii. Only
  the ramp and the composite operation change, which is the whole point of the
  comparison.
- `fxCloud` **feathers its top edge**. Rejection sampling with a hard cut puts
  a crisp boundary exactly where the curve is, which reads as a filled area
  with a ragged top. Points above the curve survive with a Gaussian
  probability in the overshoot instead.

Chroma: the encoding ramps sit around C=0.07 to 0.10, which is correct for
encoding and roughly a third of what the reference gradients carry at their
cores. Fields multiply chroma by `fieldK`, 2.2 to 2.4, and the encoding ramps
are untouched. The hue budget did not have to move: the reference gradients
are more saturated, not more rainbow.

## Applying the set

Page 6. Two boards: figures for a published piece, and dot constructions.

### Figures

Six specimens, every one from the CY2024 margin data in this repository.
Three of them use colour as ENCODING rather than as atmosphere, which is a
departure from the standing rule that colour is a field and never furniture.

The rule still holds for rules, borders, labels, axes and ticks: those are
greyscale on every figure. What changed is narrower than it sounds. **A
gradient may carry an ORDERED variable**, because a ramp reads as ordered in a
way a set of distinct hues does not. Revenue cohort runs small to large;
density runs low to high. Both qualify. A gradient may never carry an
unordered category.

Figure 5 makes the distinction concrete: it encodes DENSITY on the ramp and
carries cohort by position instead, which is what lets one ramp serve all six
rows and makes a bright band mean the same thing in every one of them.

### Hero images: pictures of things

Page 7. The forms board is decoration and belongs in a margin or behind a
headline. This is the other job: the image at the front of a piece, which has
to be a picture OF something.

**What matters is the pipeline, not the five subjects.** A subject is a
function that paints greys onto a canvas, where white is full dot density and
black is none. `fxMaskFrom()` reads that canvas back once and hands out a
density field, and `fxStipple` draws it. Anything that can be DRAWN can be
stippled, so a traced skyline, a wordmark, a client logo or a silhouette off a
photograph all enter the same way and come out looking like each other.

The five in `_subjects.js` are data centres, a container terminal, a city,
turbines and the Eleven One mark. They exist so the sixth has something to be
consistent with. Adding one is writing one paint function.

Two rules decide whether a subject reads, and both were learned by getting
them wrong first:

- **Silhouette first.** If it is not recognisable as a flat cut-out it will
  not become recognisable once it is made of dots. The crane boom reaching out
  over the stacks is what makes the port a port; without it the same drawing
  is a warehouse.
- **Detail as tone, never as line.** A stipple cannot draw anything thinner
  than its own dot pitch. Panel gaps, window grids and structural members are
  painted as areas of different grey, and `subBar()` draws a strut as a filled
  quad rather than a stroke for exactly that reason.

Two numbers that had to move after the first attempt. Counts are five times
the forms board, because these have to be READ rather than felt and a rack row
at nine thousand marks is a smear. And the tone floor came up: a recessed face
at 0.34 came out as scattered noise rather than as a surface, so the quietest
part of an object now sits well above half against a ground of zero.

```
node build-heroes.cjs
```

One thing the checks needed: the smoke and paint stubs returned an empty pixel
buffer from `getImageData`, so a board that paints its density field offscreen
and reads it back saw zero everywhere and reported blank when it was fine. The
stubs return mid grey now.

### Dot constructions

Two techniques, both kept, because they are good at different things.

**Stipple** is the one the references are actually doing. Dot size is nearly
constant, positions are irregular, and tone comes from how MANY dots land in
an area. `fxStipple()` throws candidates at the frame and keeps each with
probability equal to a density field, so count per unit area tracks the field
by construction and there is no lattice anywhere.

That buys DISSOLUTION, which is the move every reference has in it: the form
is dense somewhere and thins to nothing somewhere else, and the eye completes
what the dots stop saying. A lattice cannot do it. It has the same number of
sites everywhere and can only make them smaller.

**The stipple board is illustration and carries no data at all.** Eight forms
a research practice actually needs: Dispersion, Convergence, Erosion,
Confluence, Threshold, Concentration, Skyline, Strata. A study about
fragmentation gets a mass that disperses; one about consolidation gets a field
that narrows to a point.

That separation is load-bearing. An earlier version forced the margin dataset
through every one of these shapes and produced weak illustrations and weak
figures at the same time, because the data had to bend to suit a shape and the
shape had to bend to suit the data. Data lives on the figures board, labelled
and sourced. Nothing on the stipple board should ever be read as a
measurement, and the board says so on its face.

The GLYPH matters more than it looks. A mark with a direction reads as a thing
rather than as a dot, and a field of them reads as a flock. `fxStipple` draws
dots, squares, dashes or a two-stroke bird.

A dissolve also needs grit. A perfectly smooth density falloff looks rendered,
so Erosion and Skyline multiply theirs by a cheap value hash, which is what
makes the edge look broken rather than faded.

Concentration was reworked after the first pass. It had been three nested
gaussians on a common centre, which is radially symmetric and therefore inert:
no direction, nothing to count, and no way to see that it is ABOUT
concentration rather than merely concentrated. It is now a field of cores with
steeply falling weights, one dominant, a few real, a long tail, plus a haze
that never quite reaches zero. The eye counts three or four before giving up,
which is the point being made. Each core is a wide skirt plus a tight spike
rather than a single gaussian, because a lone gaussian has no peak to it at
stipple density and reads as a smudge.

**Halftone** is the earlier technique and still suits a hard-edged object with
flat faces, which is what the massing is. `fxDotArt()` walks a hexagonal
lattice and varies radius. Hexagonal because on a square lattice the eye finds
the rows and columns before it finds the object.

Its mechanism is one separation: **coverage drives dot SIZE, position drives
dot COLOUR.** Because the two never interact, a face can turn away and get
smaller dots without changing hue. Colour a face by its own orientation
instead and the object reads as a heatmap of itself.

Three things it took to make the massing read as architecture rather than as a
lump:

- **Gaps.** The first footprint was six by six with every cell occupied, so
  the terraces merged into one rounded mass with no silhouette. The eye needs
  to see sky between the blocks.
- **Isometric proportions.** Cell width to depth has to be two to one. The
  first version was nearer seven to four on a footprint wider than the frame,
  and every block came out wider than it was tall.
- **A ground plane.** Without one the cluster floats: nothing in the frame
  says which way is down.

```
node build-stipple.cjs
node build-dotart.cjs
node build-figures.cjs
```

### Two faults the checks caught here

- **`dc-paint` called two finished figures blank.** A bar chart of six rows
  draws about forty path points and is complete; the 200-point floor was tuned
  for meshes. Sparse is not empty, and what separates them is that a blank
  canvas issues no stroke or fill at all. The op count is now the
  discriminator and the point count only reports density.
- **The surface ran 186px off the left edge.** An isometric object reaches
  0.866 * (sx + sy) / 2 either side of its origin, so at sx 0.70W the low
  corner of the distribution was being cut off the page. It is sized from the
  frame now rather than chosen.

## The gradient set

**Decided.** Eleven gradients: Meridian's five, each held inside one hue
family, and six crossings that run between two of them. This is the whole of
the system's colour. Everything else stays black, white and grey. Rules,
borders, labels, axes and panels are never coloured, and a gradient appears
only on a cover, a hero, or a figure that needs a field behind it.

| Token | Kind | Peak chroma | Hue arc |
|---|---|---|---|
| `cobalt` | single | 0.210 | 35 deg |
| `iris` | single | 0.266 | 39 deg |
| `ember` | single | 0.212 | 52 deg |
| `moss` | single | 0.218 | 39 deg |
| `slate` | single | 0.018 | 0 deg |
| `cobalt-iris` | crossing | 0.276 | 54 deg |
| `iris-ember` | crossing | 0.259 | 91 deg |
| `cobalt-ember` | crossing | 0.267 | 112 deg |
| `moss-ember` | crossing | 0.211 | 126 deg |
| `cobalt-moss` | crossing | 0.225 | 137 deg |
| `slate-iris` | crossing | 0.233 | 53 deg |

`slate` is quiet on purpose. A set with no neutral member forces colour onto
pieces that do not want it, which is how a restrained system stops being
restrained.

### Where it lives

`_gradients.cjs` composes the set. It does NOT restate the anchors: those stay
in `_palettes.cjs` and `_pairs.cjs`, so there is exactly one place a value can
be wrong. What it adds is identity, a stable token per gradient, and the
derived stops.

`gradients.json` is the source of record for anything that is not this canvas.
It carries the OKLCH anchors so the real ramp can be rebuilt, plus nine hex
stops and a CSS string so a stylesheet or a chart never has to do OKLab
arithmetic. Nine stops because that is where linear interpolation in sRGB
stops being visibly different from the real ramp.

```
node build-gradients.cjs    # the sheet and gradients.json
node gradients-check.cjs    # the invariants
```

`gradients-check.cjs` is what makes "locked" mean something a change can
violate: ids unique and tokenised, every anchor inside sRGB, no gradient flat
by accident, no ramp reversing direction mid-path, and the emitted json
matching the module. Currently zero failures and zero notes.

### One performance fault fixed on the way

The grain tile was rebuilt on every `fxGrain` call: 65,536 iterations of the
PRNG and a quarter-megabyte allocation each time. A sheet with eleven
gradients on two grounds asks for twenty-two of them, which took 3.5 seconds
per draw and repeated on every slider move. Tiles are now cached by size,
amplitude and seed. The same draw takes 231ms cold and 10ms warm, and every
board in this directory benefits, since they all inline `_fx.js`.

### Still open

Which gradient goes on what, and how often a piece is allowed one at all.

## Gradient palettes

The choice above came out of these. Kept as the record of what was compared.

Page 4, and the direction the work turned toward. The system stays black,
white and grey. Colour arrives only as a gradient, and only where one earns
its place: a report cover, the site hero, a figure that needs a field behind
it. One piece runs warm and the next cool without either looking like a
different brand, because what makes them a family is the CONSTRUCTION, not the
hue. That is what stops a hundred pieces looking repetitive, and it is also
why no single gradient ever had to be dialled in.

Four palettes in `_palettes.cjs`, five gradients each. The choice is which
rule the family shares.

| Palette | Rule |
|---|---|
| Meridian | One saturation profile, five positions on the wheel. |
| Daylight | Deep ends vary, every one resolves to light and none turns warm. |
| Duotone | Two temperatures crossing through a neutral middle. |
| Ash | Both ends neutral, colour only in the middle of the climb. |

Every palette carries a near-neutral member on purpose. A palette with no
quiet gradient forces colour onto pieces that do not want it, which is how a
restrained system stops being restrained.

### Saturation is a fraction of the ceiling, not a number

The first version specified chroma by hand, around 0.11 to 0.13 everywhere,
and read as dull. Hand-picking was the wrong tool, because the ceiling is not
a constant: sRGB holds 0.26 of chroma for a blue at lightness 0.45 and 0.13
for an orange at 0.75, and anything asked for above the ceiling is silently
clamped by `labToRgb` into something flatter than was requested. So anchors
are `[lightness, saturation as a FRACTION of the ceiling, hue]`, and
`gamut.cjs` finds the ceiling by bisection.

The same fact drives the lightness journeys, which is the part that is easy to
miss. Each hue peaks at a different lightness: blue near 0.45, magenta near
0.70, green near 0.80. A family that fixed one lightness ramp for all five
members would run half of them nowhere near their peak, and those would look
washed out beside the rest. So the journeys differ per member and what is
actually held constant is the saturation profile.

```
node gamut.cjs        # nothing; it is a library
node vivid-check.cjs  # chroma delivered, and what fraction of the ceiling
```

`vivid-check.cjs` exists because "looks dull" is a real complaint with a
measurable cause. Coloured members now use 60 to 87 percent of what sRGB
allows and peak between 0.19 and 0.28, against roughly 0.13 before. The quiet
members report as flat, which is correct: they are supposed to be.

One thing the gamut settles rather than the design: there is no vivid cyan.
sRGB tops out near 0.14 of chroma anywhere in the 180 to 225 band, at any
lightness. The teal member of Daylight is the least vivid of its palette and
no amount of tuning changes that.

### Two things the swatches had to fix

- **Squares under-sell a gradient.** Judged as a filled rectangle the same
  anchors read flatter than they are, and half of the real uses are shapes
  anyway. The paper swatch is now an organic mass, `fxOrganic()` in `_fx.js`,
  built from the same soft masses so it has a boundary the eye can find
  without there being an edge anywhere.
- **Additive masses that overlap make a third colour.** At near-full width the
  two ends of a duotone covered most of the block and added, and blue plus red
  is pink, so every crossing gradient read pastel through its middle. The
  masses are smaller and cornered now, so ground survives between them. The
  reference posters keep a near-black band between two temperatures rather
  than blending them.

One fault worth keeping: the first version looked up its canvases with
`getElementById('d' + i)`. A computed id cannot be rewritten by anything
reading the file as text, and the preview harness rewrites ids so several
boards can share a page, so every lookup returned null, the draw bailed on its
first line, and all forty swatches rendered as empty blocks. It looked exactly
like a colour bug. Artboards use literal ids.

## Meridian, crossed

Meridian is the chosen palette. Page 5 is it crossed with itself: gradients
that start on one member and end on another, so a piece is not confined to one
hue family. `_pairs.cjs`, six of them, drawn as shapes rather than squares.

The route between two members matters more than the two members do. A distant
pair meets along whichever path OKLab interpolation takes, and there are
usually two: one along the vivid ridge of the space and one across the part of
it that holds almost no chroma. Cobalt to Ember through magenta stays
saturated the whole way and uses 87 percent of the available ceiling; the same
pair straight across dies in the middle. So the far pairs carry an explicit
waypoint on the ridge.

Two of the six are shaped by facts about sRGB rather than by preference:

- **Cobalt to Moss has no vivid route.** Blue to green passes through cyan,
  where there is nearly no chroma at any lightness, and the long way round is a
  rainbow. It is built with a deliberately neutral middle instead, which reads
  as a crossing rather than as mud, and it is labelled as the exception.
- **Moss to Ember descends rather than climbs.** Its ends want opposite
  lightnesses: vivid greens live near 0.82 and vivid reds near 0.52. Climbing
  through yellow put the whole crossing in the flattest part of the space and
  it measured 0.146 at its peak. Descending, it measures 0.211 and uses 91
  percent of the ceiling.

Each shape is a different shape. A set of identical blobs shows the colour but
says nothing about whether a gradient survives being stretched, tightened or
thrown off centre, which is what happens to it on a cover.

One thing the two grounds disagree about: `fxOrganic()` places overlapping
masses, and on paper they multiply, where a strong centre reads as depth. On a
dark ground they ADD, and a strong centre stacks straight to white. Every
crossing had a blown-out middle until the centre boost became its own option.

```
node build-pairs.cjs
```

## Ember candidates

Ember travels violet to cream the long way round, through rose. Page 3 of the
canvas is that journey with the rose and the violet taken out, two ways. They
are candidates, not directions: they are not in `DIRS`, they do not appear on
page 1, and nothing is decided.

| Candidate | Path | Hue arc |
|---|---|---|
| Ember, warm only | One family: red, orange, amber, cream. No cool end. | 61 to 66 degrees |
| Ember, steel end | Keeps a cool anchor, blue instead of violet. | 200 to 221 degrees |

Steel works because blending happens in OKLab: the leg from blue to orange
runs through the desaturated middle rather than around the wheel, so the path
never reaches purple. It needed a low-chroma waypoint on the paper ramp to get
there. Without one the run from deep red to blue clipped the magenta band at
four samples out of forty-one.

Both inherit everything else from Ember. Same blob layout, same grain, same
dot spec, same words. Only the anchors move.

```
node hue-path.cjs           # what hues a ramp actually passes through
node build-variants.cjs     # emit the candidate boards
node preview.cjs --name v --set 1:warmSpread=68 A.dc.html A.dc.html
```

`--set k=v` overrides a prop on every board of a preview sheet and
`--set 2:k=v` on one, so a tweak can be seen across its range without opening
the published canvas.

`hue-path.cjs` exists because anchors do not tell you where a ramp goes. It
converts forty-one samples per ramp back to OKLCH and reports the arc actually
travelled and any crossing into the purple/pink or green bands. Ember hits
purple/pink at 19 of 41 field samples; both candidates are clear. It measures
the arc by walking the samples and summing each step the short way round: a
ramp that crosses the 0/360 seam reads as 357 degrees on a plain max-minus-min
and about 60 to the eye.

One assumption I had to drop: I expected removing rose to cost presence on
white, because rose is what was doing the work there. Measured on the light
cover, warm-only is the strongest of the three, not the weakest: mean channel
spread 50.8 against Ember's 33.2, mean departure from white 34.3 against 29.1.

## The field tweaks

The two candidates carry four chips the four live directions do not, because
the candidates are what is being chosen and the choice is about where the warm
end sits.

| Chip | Range | What it moves |
|---|---|---|
| `coolEnd` | colour | The deep end of the field. |
| `warmEnd` | colour | The hot end. |
| `warmSpread` | -40 to 70 deg | How far past the warm colour the top of the ramp travels. Positive runs toward amber and yellow, negative back toward red. |
| `balance` | 0.15 to 0.85 | Where the crossover between the two ends sits. |

`fieldFromEnds()` and `paperFromEnds()` in `_lang.js` turn those four into
OKLCH anchors, on a dark ground and on paper. They share `endGap()`, which is
where the work is: blending runs in OKLab, so two ends far apart in hue meet
through the desaturated middle only if the waypoint between them is actually
desaturated. Left chromatic, the path takes a shortcut and picks up a hue
nobody chose, which is how the magenta got in. Ends close together need the
opposite, a waypoint at full chroma, or the middle of a warm ramp goes muddy.
So the waypoint's chroma and how far its hue leans both follow the gap.

The waypoint leans toward whichever end it sits beside: the cool one on dark,
the warm one on paper. Leaning it cool on paper put a blue through the middle
of the wash that neither picked colour asked for, because the deep end is not
reached until t=1 and the middle should still be holding the warm.

Six of the seven pages carry a field and follow the chips, canvas fields on
the covers, section, panel and reading page, and CSS washes on the reading
page's rail card and the back matter. `fxFieldCss()` in `_fx.js` builds those
two in the browser, because a wash baked into a style attribute at generation
time cannot follow anything. The exhibit does not follow: it has no field, and
its colour is encoding. Encoding stays on the encoding ramp.

One thing considered and rejected: keeping the fixed anchors as the untouched
default and only building from the chips once one moved. That would have made
the default render byte-identical, because the fixed ramps' deepest anchors
sit outside sRGB and a colour picker can only offer colours inside it. But the
runtime seeds props from their declared defaults, so the untouched path would
rarely or never run, and the comment claiming it did would have been a lie.
One path. The shift against the fixed ramps is at most 15 of 255 per channel
on dark and 21 on paper, the latter measured at the four stops the blobs
actually sample rather than across a ramp whose ends are never reached.

## Why a candidate is one artboard

Page 3 is two artboards, not fourteen. Each holds all seven pages of one
candidate.

Tweaks do not cross artboards. The canvas editor shares nothing between them
at runtime: no state, no logic, no tweaks, and no mechanism to make one
board's chip drive another's. So a chip that moves a whole theme is only
possible if the theme IS one artboard. The sharing is structural rather than
wired, which is why it cannot drift.

`build-rows.cjs` composes them out of the page files the normal generator
already writes, rather than reimplementing seven pages, so a row cannot fall
behind what it is made of. That means text surgery on generated code, which is
only safe because the shape is known and generated here. Three things it has
to handle:

- **Ids.** Every page names its canvas `cv`, `bg` or `sp`. Seven pages in one
  document means seven elements called `cv`, and `getElementById` returns the
  first, so six pages would draw onto the first page's canvas. Same fault the
  preview harness hit, silent both times.
- **Helmet rules.** Link colour and mark fill are one thing on a dark page and
  another on paper. In one document the last declaration wins and half the
  pages get the wrong one, so every rule is scoped to the page that declared
  it.
- **Extracting the script.** The first `>` in a page is the doctype's and the
  first `</script>` closes the `support.js` tag in the head. A naive window
  between them contains no Component at all, and every page composed to
  nothing. The smoke test passed, because nothing threw; `dc-paint` caught it,
  because nothing painted.

The per-page draws are NOT wrapped in try/catch. A page that throws should
take the board down where the smoke test can see it, rather than leaving six
pages painted and one blank.

## The object is real

The covers are not abstract shapes. They are the joint density surface in
`public/assets/data/margin-cy2024.json`: a 72 by 96 grid, revenue on one axis,
gross margin on the other, count of filers as elevation. Two summits, at
$1.44bn / 27.8% and $654m / 70.1%, marked identically in every direction
because the marks are content, not style.

## Colour

Both ramps are built from OKLCH anchors blended through OKLab. Blending in Lab
is what stops a two-colour scale becoming a rainbow: the path runs through the
desaturated middle instead of around the hue wheel. `anchorRamp()` in
`_lang.js` is the shared machinery; each direction supplies its own anchors.

## Rebuilding

```
node build-canvas.cjs       # runs both generators, then writes the manifest
```

`build-canvas.cjs` requires `build-directions.cjs` (report pages) and
`build-web.cjs` (site pages), so one command rebuilds everything and emits
`canvas-directions.json` plus `artboards.txt`, which is the seed list.
`_dirs.cjs` holds the directions, the ramps, the shared blob layouts and the
shared content; both generators read it, which is what keeps the constants
constant.

Then re-seed and republish with the `/design` skill's helper. The generators
inline `_lang.js`, `grid.js`, `kde.js` and `_fx.js`, so editing a ramp or a
primitive means re-running the generator. Editing a `.dc.html` by hand works but is
overwritten on the next build.

## Looking at it

Everything in this directory was verified numerically for two rounds and never
looked at. `dc-smoke` proved `draw()` ran and `dc-paint` proved it painted
inside the frame; neither proves a drawing looks like anything, and two rounds
of colour work shipped without anyone seeing a pixel. That is the root cause of
both rejections, not the ramps.

```
node preview.cjs --name covers --cols 2 EmberCover.dc.html SignalCover.dc.html
node lab.cjs Ember Signal      # primitives only, no artboard machinery
```

`preview.cjs` strips the `<x-dc>` wrapper, shims `DCLogic`, substitutes
`renderVals()` into the `{{...}}` slots and writes a plain page into
`_preview/` that a browser opens from `file://`. `lab.cjs` skips the artboards
entirely and draws the primitives onto bare canvases, which is one node run
per change instead of a 41-board rebuild.

Two things the preview harness has to do that a real artboard does not:

- **Scope the ids.** Every artboard names its canvas `cv`. That is fine when
  each is its own document and fatal when four share a page: all four
  Components resolve `getElementById('cv')` to the first canvas, so board one
  gets drawn four times and boards two to four stay blank. It looked like a
  colour bug, and the first thing measured off it was that the canvas was
  greyscale, which was false.
- **Avoid backslashes in the shim.** The `{{...}}` substitution regex is built
  with `[{][{]([a-zA-Z0-9_]+)[}][}]` because the shim is emitted through a
  template literal and `\{` does not survive it. Two silent failures came from
  that before the character class replaced it.

## The board that shipped broken

The stipple board rendered in the preview harness, passed `dc-smoke` and
passed `dc-paint`, and failed in the published canvas with "the preview
stopped answering the editor". It took five seconds to draw and the runtime
killed it.

No check could see that, because both existing checks run against a stub
context that makes every fill and stroke free and neither one looks at the
clock. `time-board.cjs` closes that hole. Its numbers are not browser numbers,
the stub is a Proxy and charges for context access while charging nothing for
paint, but it catches the order of magnitude that kills a preview.

Reproducing it needed the REAL runtime, not the harness. `serve.cjs` exists
for that: the preview pane refuses a `file://` document past a couple of
megabytes and a seeded canvas is always past that, so the canvas has to be
served over HTTP to be opened locally. Seeding a two-board probe and loading
it reproduced the failure exactly and named it.

Four changes took it from 5,104ms to 1,167ms:

- **An envelope instead of blind rejection.** Throwing candidates at the whole
  frame and keeping them with probability equal to the density is correct and
  ruinously slow: a form occupying a twentieth of the frame at a tenth of full
  density needs two hundred candidates per mark. `fxStipple` now samples the
  field onto a coarse grid, picks a cell in proportion to its weight, and
  jitters inside it. Each cell is probed at four points, the mean becoming its
  weight and the max its envelope, because probing only the centre
  under-estimates any cell a hard edge crosses and three of these forms are
  hard edges.
- **Cached styles.** Every mark cost a full OKLCH to sRGB conversion, two cube
  roots and three powers, plus a `toFixed` and four concatenations. That was
  the most expensive thing on the board, ahead of the density field. Position
  is quantised to 128 steps and alpha to 32, which is more than a stipple can
  show, and tens of thousands of conversions become at most four thousand.
- **Fewer marks.** Seventeen to twenty-four thousand per panel on a 620px
  panel is far more than the references carry. Halved, and the result is
  airier, which suits them better.
- **An early-out in the heaviest field.** Concentration evaluated twelve cores
  in full for every candidate. Beyond three sigma a core contributes nothing a
  stipple can show, so it now bails before the square root.

## Checks

```
node dc-smoke.cjs $(cat artboards.txt | tr '
' ' ')
node dc-paint.cjs $(cat artboards.txt | tr '
' ' ')
node ramps-check.cjs        # hue arc travelled, and greyscale survival
node analyse.cjs            # contrast ratios and luminance gaps
node dc-markup.cjs $(cat artboards.txt | tr '
' ' ')
node time-board.cjs $(cat artboards.txt | tr '
' ' ')
node gradients-check.cjs    # invariants for the locked set
```

`dc-markup.cjs` checks what the RUNTIME checks rather than what a browser
forgives: every non-void element closed, every attribute quoted, no bare
ampersand, no template hole without a prop or a renderVals key behind it. A
browser fixes all of that silently and the preview harness inherits the
forgiveness, so a board can look perfect here and fail where it ships.

`dc-smoke.cjs` exists because of a real shipped fault: `grid.js` defines
`GRID`, `GROWS`, `GCOLS`, `GPEAK` and `GRIDGE` but **not** `GMAX`, which every
surface draw divides by. Five of the twelve artboards in the superseded canvas
threw a ReferenceError on the first line of `draw()` and rendered as empty
frames. The pages looked finished, because the background fill and all the type
render before the canvas code runs. `_dirs.cjs` appends the `GMAX` computation
to `grid.js` itself.

It earned its keep again: `fxGrainTile` builds its noise on an offscreen
canvas, and the stub had no `document.createElement`. Twenty-four of thirty
boards failed on the first run after grain went in.

`dc-paint.cjs` exists because executing without throwing is not the same as
drawing something. It records every path coordinate, then reports the point
count and the painted bounding box against the frame. It counts path points
rather than draw calls: a chart draws six long curves in thirty calls, a mesh
draws thousands of short segments, and only the point count separates a sparse
drawing from an absent one. Background fields are allowed to bleed up to ten
percent past the frame; beyond that is a projection fault.

Every canvas on a page gets its own recorder, keyed by element id. Sharing one
recorder across a page carrying both a hero and a figure merges two bounding
boxes into a meaningless union and reports a spill on whichever frame is
smaller.

It now counts `fillRect` calls separately. A background canvas that carries
only a field paints entirely through `fillRect`, which is excluded from the
bounding box on purpose, so the four Panel boards reported EMPTY when they were
in fact painting correctly. A genuinely blank canvas has no fills either, so
the two are distinguishable and both are still reported.

## Two placement faults it caught

Both were arithmetic that nobody had looked at.

- **The summit callout ran off the frame.** Fixed to the right of its mark, the
  wider of the two labels ended 231px past the edge of a 2560px canvas and the
  reader lost the figure it carried. The callout now turns back on itself when
  there is not 320px of room, and picks its side from the space actually left.
- **The site hero object sat on the headline.** This was flagged last session
  and estimated at 110px. It was real. The first fix took the smaller of two
  placements, which silently chose the frame-fit constraint and put the object
  straight back on the headline. Both constraints are now solved together: the
  reach is derived from the room between the headline column and the right
  edge, and the object is sized from the reach. The headline column narrowed
  from 720 to 620, which it can afford because it sets in two lines either way.
  Clearance is 90px to the headline and 30px inside the frame, by construction.

## Superseded

The earlier exploration is still on disk and still builds, but is no longer on
the canvas. `Stack`, `Terrain` and `Instrument` (four pages each, via
`build-pages.cjs` and `build-langs.cjs`) conflated the object with the style,
which is the axis that was wrong: rendering a real object and drawing an
abstract one are not a choice, they both belong to one system. Also kept:
`Main`, `DirectionB`, `DirectionC`, `Figure`, `Spectrum` (treatment);
`SingleHue`, `TwoAnchor`, `Diverging`, `Achromatic`, `HueBudget` (hue budget);
`Terrain`, `Ridges`, `Wireframe`, `Planes` (objects). Their canvas manifest is
`canvas.json`; the live one is `canvas-directions.json`.

Note that `build-hues.cjs` also emits `Main.dc.html` and would overwrite the
new key board. Run `build-directions.cjs` after it if you run it at all.

## Data provenance

`grid.js`, `kde.js` and `data.json` are extracted from
`public/assets/data/margin-cy2024.json` and are derived files. The source of
record is the dataset. Nothing in this directory invents a figure.
