/* The canvas manifest.

   Eight pages: the entry key, the record of how the colour was chosen, the
   set itself, and four pages applying it.

   THREE PAGES HAVE BEEN RETIRED. The four-direction report matrix, the same
   four directions on the site, and the two Ember candidate rows. They were
   the argument that led to the set rather than the set, they are written up
   in README.md, and they are in git. They were also 43 of the canvas's 71
   artboards and about three fifths of its weight, and that weight is not
   free: every artboard is its own iframe, the runtime keeps the iframes of
   pages already visited, and a canvas that will not mount is worth less than
   a record in git. Run page-load.cjs before adding a page back. */
const fs = require('fs');
const { MAIN_BOARD } = require('./build-main.cjs');
const { SWATCHES } = require('./build-swatches.cjs');
const { PAIR_BOARD } = require('./build-pairs.cjs');
const { GRAD_BOARD } = require('./build-gradients.cjs');
const { DOT_BOARD } = require('./build-dotart.cjs');
const { FIG_BOARD } = require('./build-figures.cjs');
const { STIPPLE_BOARD } = require('./build-stipple.cjs');
const { HERO_BOARD } = require('./build-heroes.cjs');
const { HOMES, HW: APPHW, HH: APPHH } = require('./build-homes.cjs');
const { COVERS } = require('./build-covers.cjs');
const { BODIES } = require('./build-bodies.cjs');
const { DARK_BOARD, PAPER_BOARD } = require('./build-breadth.cjs');

/* Notes are one plain string with newlines in it. Built as an array and
   joined, because a long note written inline is unreadable in source and
   every attempt to edit one through a shell mangles the escapes. */
const NL = String.fromCharCode(10);

const artboards = [];
const annotations = [];

// -------------------------------------------------------- the entry board
// Main is what the editor opens on a focused view and it is the only page
// that says what was decided. It carries no canvas, so it costs nothing.

artboards.push({
  file: MAIN_BOARD.file, page: 'page-4', x: -100, y: -MAIN_BOARD.h - 220,
  w: MAIN_BOARD.w, h: MAIN_BOARD.h, title: 'The visual system'
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


// ------------------------------------------------------- pages 8, 9 and 10
// The system applied. Pages 5 to 7 settle what the system IS; these settle
// what it looks like when it is used, which is the part still open.
//
// One thing varies inside each group and it is the DEVICE. Which gradient
// goes on a piece is decided; how often a piece is allowed a device is not.

const APP_GAP = 140;
const CH_APP = COVERS[0].h;

HOMES.forEach((h, i) => {
  artboards.push({
    file: h.file, page: 'page-8', x: i * (APPHW + APP_GAP), y: 0, w: APPHW, h: APPHH,
    title: h.title
  });
  annotations.push({
    id: 'home-note-' + i, page: 'page-8', x: i * (APPHW + APP_GAP), y: APPHH + 60, w: APPHW - 120,
    text: h.note
  });
});

annotations.push({
  id: 'home-key', page: 'page-8', x: -640, y: 0, w: 480,
  text: 'FOUR HOMEPAGES. The hero band is the only thing that varies.\n\nNavigation, stats, cards, the featured figure and the footer are identical on all four, and all four run cobalt-iris. What moves is which device sits in the band, and on the fourth, whether there is a device at all.\n\nThe site is the harder test. A cover has nothing on it but the image and the title; a homepage makes a device share the page with navigation, three cards and a footer, and survive the featured piece changing next month.\n\nTWO THINGS ARE FIXED HERE THAT PAGE 2 GETS WRONG.\n\nFurniture is greyscale. The subscribe chip, the nav links and the section rules are grey on every one of these. The boards on page 2 colour all three off the direction accent, which is the thing the constitution forbids: a gradient is atmosphere or it is an ordered encoding, and it is never applied to an interface element.\n\nThe cards carry a hairline, not a gradient. Page 2 puts an 84 pixel wash on top of every card. That is a gradient spent on three pieces of furniture, and it is why those boards have no colour left to spend on anything that matters.\n\nThe featured figure below the fold is coloured on all four, and it is the same figure. On the fourth board it is the ONLY colour on the page.'
});

const COV_GX = 160, COV_GY = 300;
COVERS.forEach((c, i) => {
  const x = (i % 3) * (c.w + COV_GX), y = Math.floor(i / 3) * (c.h + COV_GY);
  artboards.push({ file: c.file, page: 'page-9', x, y, w: c.w, h: c.h, title: c.title });
  annotations.push({ id: 'cov-note-' + i, page: 'page-9', x, y: y + c.h + 54, w: c.w - 80, text: c.note });
});

annotations.push({
  id: 'cover-key', page: 'page-9', x: -640, y: 0, w: 480,
  text: 'SIX COVERS, ONE PIECE. The device is the variable.\n\nIdentical type, identical words, an identical title block in the quiet left third. Five run cobalt-ember and the sixth runs slate, which is the whole point of the sixth.\n\ncobalt-ember rather than iris-ember, and that choice is a finding rather than a preference. iris-ember spends seven of its nine stops inside magenta, so a Hero drawn on it comes out one colour and the stipple never shows that it is made of a gradient at all. A crossing needs a wide hue arc before a subject can carry it.\n\nWHAT EACH ONE IS FOR.\n\n1 and 2 are the same question twice. One puts a Hero on black and nothing else; the other runs a Field underneath it, which is the single exception the guidance allows to one-device-per-page and the thing it is least sure about.\n\n3 is the cheap one. No subject, just weather behind the type. It works, and it will look exactly like the next piece that does it.\n\n4 is the same device on paper, because four of the seven report pages are white and a cover that only works on black is half a system.\n\n5 breaks the rule on purpose. The guidance says a Form cannot front a piece because a reader cannot name it. Judge whether that is true rather than taking it.\n\n6 declines colour. A report rendered entirely in slate is a correct outcome, not a failure to choose.'
});

const BOD_GX = 160, BOD_GY = 300;
BODIES.forEach((p, i) => {
  const x = (i % 3) * (p.w + BOD_GX), y = Math.floor(i / 3) * (p.h + BOD_GY);
  artboards.push({ file: p.file, page: 'page-10', x, y, w: p.w, h: p.h, title: p.title });
  annotations.push({ id: 'bod-note-' + i, page: 'page-10', x, y: y + p.h + 54, w: p.w - 80, text: p.note });
});

annotations.push({
  id: 'body-key', page: 'page-10', x: -640, y: 0, w: 480,
  text: 'SIX BODY PAGES FROM ONE PIECE, in reading order.\n\nThese are not six alternatives. They are a sequence, and the thing to judge is the RATE. Pages 2, 8, 9, 12, 15 and 18 of a report that runs to about twenty.\n\nAS BUILT: two pages carry a device outright, one carries a small Form in the margin, and three carry nothing at all.\n\nThat is the budget table in the skill, made visible. It is proposed and it has never been looked at, so it is the thing on this page most worth arguing with.\n\nTHE SAME DECISION, TWICE, ANSWERED BOTH WAYS. Page 9 lets the gradient carry cohort, which is ordered and therefore allowed. Page 12 has two exhibits that could equally have taken the ramp and neither does. If every exhibit is coloured there is no emphasis left to spend on the one that matters, and if none is, the rule that a gradient may carry an ordered variable is never used.\n\nWHAT DID NOT CHANGE. Every rule, tick, axis, label, panel edge and folio on all six pages is grey, including on the two pages that carry a device and the one that runs a field under the running head.\n\nOne correction from building these. The figures read the DEEP HALF of the ramp, not all of it. The first pass ran cohort across the full range and the largest cohort landed at the pale end, which against white is nothing: six ordered series where the sixth is invisible is a five-series chart with a bug in it.'
});


// ------------------------------------------------------------- page 11
// The whole set doing one job. Pages 8 to 10 hold the gradient constant so
// that the device is the only variable, which is the right control and costs
// the canvas any sight of what the set can do. This pays that back.
//
// TWO artboards, not seventeen. Eleven full covers, one per member, is what
// this page was first built as, and in the real runtime exactly one of the
// twelve ever painted: every artboard is its own sandboxed iframe carrying
// its own copy of the runtime, and eleven stipples mounting at once is more
// than the canvas will hold. Every check passed it, because every check
// measures a board alone. Comparison sheets are single boards with many
// panels, which is what Heroes and Stipple already are.

artboards.push({
  file: DARK_BOARD.file, page: 'page-11', x: 0, y: 0,
  w: DARK_BOARD.w, h: DARK_BOARD.h, title: DARK_BOARD.title
});
artboards.push({
  file: PAPER_BOARD.file, page: 'page-11', x: 0, y: DARK_BOARD.h + 260,
  w: PAPER_BOARD.w, h: PAPER_BOARD.h, title: PAPER_BOARD.title
});

annotations.push({
  id: 'set-key', page: 'page-11', x: -640, y: 0, w: 480,
  text: [
    'THE WHOLE SET, DOING ONE JOB.',
    '',
    'Eleven covers on the first board, identical in every respect except which member of the set they run. Same subject, same crop, same dissolve, same mark density, same ground. Reading across is reading the set.',
    '',
    'IT IS A SWATCH SHEET, and the rule that a piece runs ONE gradient throughout still holds. This is a reference sheet rather than a piece. The distinction matters: pages 8, 9 and 10 hold the gradient constant on purpose so the device is the only thing moving, and the cost of that control is that every board on them is a violet.',
    '',
    'WHAT TO LOOK FOR.',
    '',
    'Hue arc, printed next to every name. cobalt-ember at 112 degrees shows the gradient across the subject; iris-ember at 91 does not, because seven of its nine stops sit inside magenta. A Field has room to show a whole ramp. A Hero only sees the ramp where the subject happens to be, so the arc matters more here than anywhere else in the system.',
    '',
    'The two quiet members. slate and slate-iris are how the system declines colour, and they have to look like a decision rather than an absence.',
    '',
    'cobalt-moss, built differently from the other ten. Blue to green has no vivid route in sRGB, so it crosses a deliberately neutral middle. Do not expect it to match its neighbours for saturation; the neutral middle is what it is for.',
    '',
    'THE SECOND BOARD is the set on paper, carrying an ordered encoding. A gradient behaves differently there: an additive field on black shows a whole ramp, and ink on white loses the pale end completely.',
    '',
    'BOTH ARE ONE ARTBOARD EACH, and that is not a layout preference. Built as eleven separate cover artboards, exactly one of them painted: every artboard is its own iframe with its own copy of the runtime, and the canvas will not carry eleven stipples mounting together. Every check in the directory passed it, because every check measures a board on its own.'
  ].join(NL)
});

const manifest = {
  pages: [
    /* Ids keep their original numbers. They are internal handles, the menu
       shows the names, and renumbering them would only make every page
       reference in the README wrong. */
    { id: 'page-4', name: 'Gradient palettes' },
    { id: 'page-5', name: 'Gradients' },
    { id: 'page-6', name: 'Application' },
    { id: 'page-7', name: 'Hero images' },
    { id: 'page-8', name: 'Homepages' },
    { id: 'page-9', name: 'Report covers' },
    { id: 'page-10', name: 'Body pages' },
    { id: 'page-11', name: 'The whole set' }
  ],
  artboards,
  annotations,
  launch: { view: 'canvas', page: 'page-11' }
};

fs.writeFileSync('canvas-directions.json', JSON.stringify(manifest, null, 2));

const files = artboards.map((a) => a.file);
fs.writeFileSync('artboards.txt', files.join('\n') + '\n');

console.log(artboards.length + ' artboards across ' + manifest.pages.length + ' pages, ' + annotations.length + ' notes');
console.log('wrote canvas-directions.json and artboards.txt');
