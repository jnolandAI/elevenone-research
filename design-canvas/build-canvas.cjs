/* The canvas manifest. Two pages.

   Report  a matrix: a row per direction, a column per page type. Reading down
           a column compares the same page across all four directions.
   Site    the same idea at 1440 wide, where a direction has to survive
           navigation, cards and a footer. */
const fs = require('fs');
const { DIRS } = require('./_dirs.cjs');
const { PAGE_TYPES } = require('./build-directions.cjs');
const { WEB_PAGES } = require('./build-web.cjs');
const { VARIANT_DIRS } = require('./build-variants.cjs');
const { ROWS } = require('./build-rows.cjs');
const { SWATCHES } = require('./build-swatches.cjs');
const { PAIR_BOARD } = require('./build-pairs.cjs');
const { GRAD_BOARD } = require('./build-gradients.cjs');
const { DOT_BOARD } = require('./build-dotart.cjs');
const { FIG_BOARD } = require('./build-figures.cjs');
const { STIPPLE_BOARD } = require('./build-stipple.cjs');
const { HERO_BOARD } = require('./build-heroes.cjs');

const AW = 1280, AH = 720, GAP_X = 120, GAP_Y = 200;
const KEY_W = 2680, KEY_H = 820;
const WW = 1440, WEB_GAP_X = 120, WEB_GAP_Y = 200;
const WEB_ROW = Math.max(...WEB_PAGES.map((p) => p.h)) + WEB_GAP_Y;

const artboards = [];
const annotations = [];

// ------------------------------------------------------------ page 1: report

artboards.push({ file: 'Main.dc.html', page: 'page-1', x: 0, y: 0, w: KEY_W, h: KEY_H, title: 'What varies' });

DIRS.forEach((d, j) => {
  const y = KEY_H + GAP_Y + j * (AH + GAP_Y);
  PAGE_TYPES.forEach((pt, i) => {
    artboards.push({
      file: d.key + pt + '.dc.html',
      page: 'page-1',
      x: i * (AW + GAP_X),
      y,
      w: AW,
      h: AH,
      title: d.name + '  ' + pt.replace('CoverLight', 'Cover, light')
    });
  });
  annotations.push({
    id: 'rep-' + d.key.toLowerCase(),
    page: 'page-1',
    x: -580,
    y: y + 40,
    w: 440,
    text: d.name + '\n\n' + d.idea + '\n\nTradeoff: ' + d.tradeoff
  });
});

annotations.push({
  id: 'how-to-read',
  page: 'page-1',
  x: -580,
  y: 40,
  w: 440,
  text: 'Read DOWN a column to compare one page across all four directions.\nRead ACROSS a row to see one direction built out.\n\nHeld constant everywhere: type, words, objects, layout, and which pages are dark or light. Only palette and surface treatment vary.\n\nColumns 1 and 2 are the same cover on a dark ground and on white. Columns 4, 5 and 7 are white pages. The site is on the second page.'
});

// -------------------------------------------------------------- page 2: site

DIRS.forEach((d, j) => {
  const y = j * WEB_ROW;
  WEB_PAGES.forEach((p, i) => {
    artboards.push({
      file: d.key + 'Web' + p.name + '.dc.html',
      page: 'page-2',
      x: i * (WW + WEB_GAP_X),
      y,
      w: WW,
      h: p.h,
      title: d.name + '  ' + p.name
    });
  });
  annotations.push({
    id: 'web-' + d.key.toLowerCase(),
    page: 'page-2',
    x: -580,
    y: y + 40,
    w: 440,
    text: d.name + ' on the site.\n\n' + d.idea
  });
});

annotations.push({
  id: 'site-note',
  page: 'page-2',
  x: -580,
  y: -300,
  w: 440,
  text: 'The same four directions at 1440 wide.\n\nHome carries a dark hero and a light body, so both grounds are on one page. Research and Article are white pages with the field doing the work.\n\nTitles in brackets are placeholders for unpublished work, not findings.'
});

// ------------------------------------------------- page 3: Ember candidates
// One artboard per candidate, holding all seven pages.
//
// Not seven artboards each. The canvas editor shares nothing across artboards
// at runtime, so a chip on a cover cannot reach the section beside it: to make
// one tweak move a whole theme, the theme has to BE one artboard. The sharing
// is structural rather than wired, which is why it cannot drift.

const ROW_GAP = 220;
ROWS.forEach((r, j) => {
  const d = VARIANT_DIRS[j];
  artboards.push({
    file: r.file,
    page: 'page-3',
    x: 0,
    y: j * (r.h + ROW_GAP),
    w: r.w,
    h: r.h,
    title: d.name + '  all seven pages, one set of chips'
  });
  annotations.push({
    id: 'var-' + d.key.toLowerCase(),
    page: 'page-3',
    x: -580,
    y: j * (r.h + ROW_GAP) + 40,
    w: 440,
    text: d.name + '\n\n' + d.idea
  });
});

annotations.push({
  id: 'variant-note',
  page: 'page-3',
  x: -580,
  y: -420,
  w: 440,
  text: 'Ember with the rose and the violet removed, two ways.\n\nEmber as built hits the purple and pink band at 19 of 41 field samples. Both rows here are clear of it, and clear of green.\n\nWarm only is one family, red through amber to cream, 61 to 66 degrees of hue. Steel end keeps a cool anchor but makes it blue: blending in OKLab runs blue to orange through the desaturated middle, so the path never reaches purple.\n\nEach row is ONE artboard holding all seven pages, so its chips move every page at once. Six of the seven carry a field and follow the chips. The exhibit does not: its colour is encoding, and encoding stays on the encoding ramp.\n\nEverything else is Ember. Same blob layout, same grain, same dots, same words.'
});

// ------------------------------------------------ page 4: gradient palettes
// Swatches only. Nothing here is applied to a page, because the decision
// these serve is which CONSTRUCTION the gradients share, not which colours
// go on which cover. Two columns so a palette can be read against its
// neighbour rather than scrolled past.

const SW_GX = 140, SW_GY = 210;
SWATCHES.forEach((sw, i) => {
  artboards.push({
    file: sw.file,
    page: 'page-4',
    x: (i % 2) * (sw.w + SW_GX),
    y: Math.floor(i / 2) * (sw.h + SW_GY),
    w: sw.w,
    h: sw.h,
    title: sw.name + '  ' + sw.rule
  });
});

annotations.push({
  id: 'palette-note',
  page: 'page-4',
  x: -600,
  y: 0,
  w: 460,
  text: 'Four gradient palettes. Pick the RULE, not the colours.\n\nThe system stays black, white and grey. Colour arrives only as a gradient, and only where one earns its place: a report cover, the site hero, a figure that needs a field behind it. One piece runs warm and the next cool without looking like a different brand, because what makes them a family is how they are built, not what hue they are.\n\nEach palette carries five gradients, including a near-neutral one, because a palette with no quiet member forces colour onto pieces that do not want it.\n\nEvery gradient is shown on both grounds. A gradient that works on a dark cover and dies on paper is not usable here: four of the seven report pages are white.\n\nThey are rendered as fields, with the same soft masses and grain the real boards use. The same anchors drawn as a flat linear ramp look like a different thing entirely.'
});

annotations.push({
  id: 'palette-how',
  page: 'page-4',
  x: -600,
  y: 620,
  w: 460,
  text: 'What differs between the four:\n\nMERIDIAN holds one journey and moves it around the wheel. Arcs 44 to 59 degrees. Most cohesive, least surprising.\n\nDAYLIGHT varies the deep end and fixes the destination: every gradient resolves to light, and none of them turns warm on the way up. The light ends are cyan, lilac and pale yellow-green.\n\nDUOTONE holds two temperatures at once and crosses between them through a desaturated middle. Arcs to 208 degrees. This is what the current covers already do, so it is the incumbent.\n\nASH keeps both ends neutral and lets colour live only in the middle of the climb. Closest to the system as it stands, and the one that risks looking like no decision was made.'
});

// --------------------------------------------------- page 5: the gradient set
// The decision, not the exploration. The reference sheet is the set as it
// stands; the shape studies below it are kept because a sheet that renders
// every gradient identically says nothing about whether one survives being
// stretched or thrown off centre.

artboards.push({
  file: GRAD_BOARD.file,
  page: 'page-5',
  x: 0,
  y: 0,
  w: GRAD_BOARD.w,
  h: GRAD_BOARD.h,
  title: 'The gradient set  eleven, locked'
});

artboards.push({
  file: PAIR_BOARD.file,
  page: 'page-5',
  x: 0,
  y: GRAD_BOARD.h + 240,
  w: PAIR_BOARD.w,
  h: PAIR_BOARD.h,
  title: 'Shape studies  the six crossings, stretched and thrown off centre'
});

annotations.push({
  id: 'set-note',
  page: 'page-5',
  x: -620,
  y: 0,
  w: 470,
  text: 'THE GRADIENT SET. Eleven, locked.\n\nFive singles held inside one hue family, and six crossings that run between two of them. This is the whole of the system colour. Everything else stays black, white and grey: rules, borders, labels, axes and panels are never coloured, and a gradient appears only on a cover, a hero, or a figure that needs a field behind it.\n\nThe source of record is gradients.json, emitted by build-gradients.cjs. It carries the OKLCH anchors so the real ramp can be rebuilt, plus nine hex stops and a CSS string so a stylesheet or a chart does not have to do OKLab arithmetic.\n\ngradients-check.cjs holds the invariants: ids unique and tokenised, every anchor inside sRGB, no gradient flat by accident, no ramp that reverses direction mid-path, and the emitted json matching the module. It currently passes with no failures and no notes.\n\nWhat is NOT decided: which gradient goes on what, and how often a piece is allowed one at all.'
});

// ------------------------------------------------------ page 6: application
// The set, put to work. Figures first, because most pieces will only ever
// need those; the dot constructions below, because they are the idea with the
// most in it and the least settled.

artboards.push({
  file: FIG_BOARD.file, page: 'page-6', x: 0, y: 0,
  w: FIG_BOARD.w, h: FIG_BOARD.h,
  title: 'Figures  six specimens on the gradient set'
});

artboards.push({
  file: STIPPLE_BOARD.file, page: 'page-6', x: 0, y: FIG_BOARD.h + 240,
  w: STIPPLE_BOARD.w, h: STIPPLE_BOARD.h,
  title: 'Stipple  density carries tone, and the forms dissolve'
});

artboards.push({
  file: DOT_BOARD.file, page: 'page-6', x: 0, y: FIG_BOARD.h + STIPPLE_BOARD.h + 480,
  w: DOT_BOARD.w, h: DOT_BOARD.h,
  title: 'Halftone  a lattice, kept for hard-edged objects'
});

annotations.push({
  id: 'stipple-note',
  page: 'page-6',
  x: -620,
  y: 1700,
  w: 470,
  text: 'STIPPLE: illustration, and only illustration.\n\nNothing on the stipple board is derived from a dataset. These carry the IDEA of a piece rather than its numbers: a study about fragmentation gets a mass that disperses, one about consolidation gets a field that narrows to a point.\n\nData belongs on the figures board, where it is labelled and sourced. An earlier version forced one dataset through every illustrative shape and produced weak illustrations AND weak figures at once, because the data had to bend to suit a shape and the shape had to bend to suit the data.\n\nWHY STIPPLE BEATS THE HALFTONE below. The halftone puts a dot at every lattice site and varies its RADIUS. It reads as mechanical, because the eye finds the lattice before it finds the subject, and it cannot dissolve: a lattice has the same number of sites everywhere and can only make them smaller.\n\nStipple inverts that. Size is nearly constant, positions are irregular, and tone comes from how MANY dots land. That buys dissolution, which is the move every reference has in it.\n\nThe glyph matters too. A mark with a direction reads as a thing rather than as a dot, and a field of them reads as a flock.\n\nThe halftone is kept, not superseded: it still suits a hard-edged object with flat faces.'
});

annotations.push({
  id: 'apply-note',
  page: 'page-6',
  x: -620,
  y: 0,
  w: 470,
  text: 'The set, applied.\n\nFIGURES. Six specimens, every one drawn from the CY2024 margin data in this repository. Three use colour as ENCODING rather than atmosphere, which is a departure from the rule that colour is a field and never furniture.\n\nThat rule still holds for rules, borders, labels, axes and ticks, which are greyscale on every figure. What has changed: a gradient may carry an ORDERED variable, because a ramp reads as ordered in a way a set of distinct hues does not. Cohort runs small to large and density runs low to high. A gradient may never carry an unordered category.\n\nDOT CONSTRUCTIONS. The gradient runs across the whole frame and only the dots reveal it. Nothing between them is painted, so the ground stays exactly as dark or as white as it was.\n\nThe mechanism is that form and colour are carried separately: coverage drives dot SIZE, position drives dot COLOUR. Colour a face by its own orientation instead and the object reads as a heatmap of itself.\n\nThe massing is illustration and is labelled as such. The surface is the real joint density, 2,186 filers.'
});

// ---------------------------------------------------------- page 7: heroes
// Recognisable subjects, for the image at the front of a piece. The forms on
// page 6 are decoration and belong in a margin; this is the other job.

artboards.push({
  file: HERO_BOARD.file, page: 'page-7', x: 0, y: 0,
  w: HERO_BOARD.w, h: HERO_BOARD.h,
  title: 'Hero images  pictures of things'
});

annotations.push({
  id: 'hero-note',
  page: 'page-7',
  x: -620,
  y: 0,
  w: 470,
  text: 'HERO IMAGES. The pipeline, not the five subjects.\n\nA subject is a function that paints greys onto a canvas: white is full dot density, black is none. That canvas is read back once as a density field and stippled. Anything that can be DRAWN can be stippled, so a traced skyline, a wordmark or a client logo enters the same way and comes out looking like the others.\n\nThese five exist so the sixth has something to be consistent with. Adding one means writing one paint function in _subjects.js.\n\nTwo rules decide whether a subject reads:\n\nSILHOUETTE FIRST. If it is not recognisable as a flat cut-out it will not become recognisable once it is made of dots. The crane boom is what makes the port a port; without it the same drawing is a warehouse.\n\nDETAIL AS TONE, NOT LINE. A stipple cannot draw anything thinner than its own dot pitch, so panel gaps, window grids and structure are painted as areas of different grey, never as strokes.\n\nCounts here are five times the forms board. These have to be READ rather than felt, and a rack row at nine thousand marks is a smear.'
});

const manifest = {
  pages: [
    { id: 'page-1', name: 'Report' },
    { id: 'page-2', name: 'Site' },
    { id: 'page-3', name: 'Ember candidates' },
    { id: 'page-4', name: 'Gradient palettes' },
    { id: 'page-5', name: 'Gradients' },
    { id: 'page-6', name: 'Application' },
    { id: 'page-7', name: 'Hero images' }
  ],
  artboards,
  annotations,
  launch: { view: 'canvas', page: 'page-7' }
};

fs.writeFileSync('canvas-directions.json', JSON.stringify(manifest, null, 2));

const files = artboards.map((a) => a.file);
fs.writeFileSync('artboards.txt', files.join('\n') + '\n');

console.log(artboards.length + ' artboards across ' + manifest.pages.length + ' pages, ' + annotations.length + ' notes');
console.log('report page: ' + PAGE_TYPES.length + ' columns x ' + DIRS.length + ' rows, plus the key');
console.log('site page:   ' + WEB_PAGES.length + ' columns x ' + DIRS.length + ' rows, row pitch ' + WEB_ROW);
console.log('wrote canvas-directions.json and artboards.txt');
