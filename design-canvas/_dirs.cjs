/* Shared by the report generator and the site generator.

   Four directions. A direction is ONLY colour and how colour meets a surface.
   Type, words, objects, layout and which grounds are dark or light are held
   identical across all four, so the comparison is clean.

   Three ramps were tried and two survived:

     dark    encoding on a dark ground. Quantity by brightness.
     light   encoding on paper. More ink means more of the thing. This one
             also carries the paper FIELD, at higher chroma and lower alpha.

   There was a third, a pale `fieldLight` wash for atmosphere on white. It is
   gone. The paper field composites with multiply, and multiply is identity
   against white: a wash already at lightness 0.94 multiplied to nothing at
   all, which is why the light boards kept reading as having no direction on
   them. The encoding ramp reaches lightness 0.36 and is visible. `fieldDark`
   stays, because an additive field on a dark ground has the opposite
   problem and needs its own dim anchors.

   Field hue travel is capped near 160 degrees, which is the budget the
   accepted ramps already travel. The rejected full-spectrum generator swept
   280. Where a field would have to cross green to reach its far end, it goes
   the other way round the wheel instead, through rose and peach. */
const fs = require('fs');
const vm = require('vm');

const LANGJS = fs.readFileSync(__dirname + '/_lang.js', 'utf8');
const KDEJS = fs.readFileSync(__dirname + '/kde.js', 'utf8');
const FXJS = fs.readFileSync(__dirname + '/_fx.js', 'utf8');

/* grid.js ships GRID, GROWS, GCOLS, GPEAK and GRIDGE but NOT the surface
   maximum every draw divides by. Leaving it out silently blanked five earlier
   artboards: the ReferenceError killed draw() and only the background and the
   type survived. Define it here, once, with the data. */
const GRIDJS = fs.readFileSync(__dirname + '/grid.js', 'utf8') + `
var GMAX = (function () {
  var m = 0;
  for (var r = 0; r < GRID.length; r++) for (var c = 0; c < GRID[r].length; c++) if (GRID[r][c] > m) m = GRID[r][c];
  return m;
})();
`;

const sandbox = { Math };
vm.createContext(sandbox);
vm.runInContext(LANGJS, sandbox);
const anchorRamp = sandbox.anchorRamp;

const hex = (a) => '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const at = (anchors, t) => hex(anchorRamp(anchors, t, 1));
const atA = (anchors, t, o) => { const c = anchorRamp(anchors, t, 1); return `rgba(${c[0]},${c[1]},${c[2]},${o})`; };

/* The same field, as CSS, for the places a wash sits behind markup rather
   than on a canvas. Radii are percentages of the element's own box, so one
   call works on a 108px card strip and on a 1440px hero without being told
   how big either one is.

   Cosine-squared falloff over nine stops, the same curve fxMass uses on the
   canvas: a two-stop radial gradient shows a ring where the falloff changes
   slope, and nothing in the reference work has an edge in it. */
function fieldBlobCss(anchors, blobs, k) {
  return blobs.map((b) => {
    const c = anchorRamp(anchors, b.t, k == null ? 1 : k);
    const stops = [];
    for (let i = 0; i <= 8; i++) {
      const u = i / 8;
      const f = Math.pow(Math.cos((u * Math.PI) / 2), 2);
      stops.push(`rgba(${c[0]},${c[1]},${c[2]},${(b.a * f).toFixed(3)}) ${(u * 100).toFixed(0)}%`);
    }
    const r = (b.r * 100).toFixed(1);
    return `radial-gradient(ellipse ${r}% ${r}% at ${(b.x * 100).toFixed(1)}% ${(b.y * 100).toFixed(1)}%, ${stops.join(', ')})`;
  }).join(', ');
}

/* The tweak defaults for a field, read back off its anchors.

   The two ends and two numbers that fieldFromEnds() takes, derived from the
   ramp that already exists, so the chips open showing what the board is
   actually painting rather than some other starting point. The round trip is
   not exact: a deep anchor can be outside sRGB, and a colour picker only
   offers colours that are inside it. So the fixed anchors stay the default
   render and fieldFromEnds only takes over once a chip is actually moved. */
function endsFromAnchors(a) {
  return {
    cool: at([a[0], a[0]], 0),
    warm: at([a[2], a[2]], 0),
    spread: +(a[3][2] - a[2][2]).toFixed(1),
    balance: +((a[1][0] - a[0][0]) / (a[2][0] - a[0][0])).toFixed(3)
  };
}

/* A field as a CSS gradient, built at generation time. Used wherever the wash
   is decoration rather than encoding and does not need the chroma slider. */
function fieldCss(anchors, angle, n) {
  const stops = [];
  const N = n || 6;
  for (let i = 0; i <= N; i++) stops.push(at(anchors, i / N) + ' ' + ((i / N) * 100).toFixed(1) + '%');
  return `linear-gradient(${angle}, ${stops.join(', ')})`;
}

// ------------------------------------------------------------------ content
// Every figure is out of the repository. Nothing here is invented.

const SPREAD = [72.2, 67.9, 60.1, 59.1, 55.4, 52.7];
const MEDIANS = [40.8, 35.8, 44.1, 39.8, 36.6, 29.2];
const LABELS = ['Under $30m', '$30m to $150m', '$150m to $600m', '$600m to $2.5bn', '$2.5bn to $10bn', 'Over $10bn'];
const COUNTS = [607, 339, 360, 427, 302, 151];

const TITLE = 'Reported gross margin is not one distribution';
const SUB = 'The peer median sits between two of them';
const COVER_NOTE = 'Every SEC registrant reporting both revenue and gross profit for calendar 2024. The median is 38.8%, and half the universe spans 23.1% to 59.7%.';
const LEDE = 'Every diligence process we have worked inside anchors gross margin to a peer median. Pull a comparable set, take the middle, treat the distance from it as a finding. The method survives because it is fast and because the number it produces always looks like an answer.';
const P1 = 'A benchmark is only useful when the distribution around it is tight enough that distance from it means something. This one is not.';
const P2 = 'Eight companies in ten fall in a band 64 points wide.';
const CLAIM = {
  text: 'Half the universe reports a gross margin between 23.1% and 59.7%, and about one company in six sits within five points of the 38.8% median.',
  rests: 'SEC XBRL frames, us-gaap Revenues and GrossProfit, CY2024 annual. 2,186 registrants, retrieved 2026-08-05.',
  assumes: 'As-reported gross profit is comparable across filers, which it is not perfectly: cost-of-revenue policy varies. The one-in-six figure is interpolated from 2.6-point bins and is good to about a point. The percentiles are exact.',
  breaks: 'The 221 excluded filers are not random with respect to margin. We have not tested that.'
};

/* Site copy. Placeholders are marked. Piece 001 is the real one; the other
   titles are drafted structural copy, not published work. */
const PIECES = [
  { n: '001', t: 'Reported gross margin is not one distribution', d: 'The peer median sits between two of them. 2,186 SEC registrants, CY2024.', tag: 'Cross-sector', live: true },
  { n: '002', t: '[DRAFT TITLE]', d: 'Placeholder for the second piece. Replace before publishing.', tag: 'Industrials', live: false },
  { n: '003', t: '[DRAFT TITLE]', d: 'Placeholder for the third piece. Replace before publishing.', tag: 'Healthcare', live: false },
  { n: '004', t: '[DRAFT TITLE]', d: 'Placeholder for the fourth piece. Replace before publishing.', tag: 'Software', live: false }
];

const MARK = '<circle cx="92.07" cy="8.73" r="6.45"/><circle cx="20.08" cy="9.38" r="1.31"/><circle cx="36.97" cy="20.30" r="3.72"/><circle cx="69.93" cy="28.25" r="6.45"/><circle cx="22.23" cy="40.54" r="3.72"/><circle cx="49.76" cy="49.61" r="6.45"/><circle cx="79.01" cy="57.74" r="9.39"/><circle cx="28.24" cy="70.00" r="6.45"/><circle cx="57.76" cy="78.98" r="9.39"/><circle cx="86.74" cy="86.74" r="11.00"/><circle cx="7.51" cy="92.28" r="6.45"/>';
const NOISE = "url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E&quot;)";
const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&amp;family=Martian+Mono:wght@200..600&amp;display=swap">';

const DARK = '#131312';
const PAPER = '#F4F4F3';
const WHITE = '#FFFFFF';

/* Composition, held constant.

   These are the only blob layouts on the canvas. Every direction places the
   same masses in the same places at the same radii; the only thing a
   direction changes is which ramp they are coloured through and how they
   composite. Positions are fractions of the frame and radii are fractions of
   its width, so one spec serves 1280 and 1440. Centres outside 0..1 are
   deliberate: a mass whose centre is off the frame never shows an edge.

   The dark set leaves the left third quiet, which is where the title block
   sits on every cover and section. */
const BLOBS_DARK = [
  { x: 0.80, y: 0.26, r: 0.50, t: 0.92, a: 0.90 },
  { x: 1.04, y: 0.70, r: 0.44, t: 0.55, a: 0.75 },
  { x: 0.52, y: 1.06, r: 0.58, t: 0.16, a: 0.66 },
  { x: 0.30, y: -0.12, r: 0.46, t: 0.34, a: 0.30 }
];

/* On paper the masses come off the ENCODING ramp, not the pale field ramp.
   Multiply is identity against white, so a wash already at lightness 0.94
   multiplies to nothing at all: the paper boards were washing out for exactly
   that reason. These sit between lightness 0.56 and 0.80 and are visible. */
const BLOBS_LIGHT = [
  { x: 0.88, y: 0.92, r: 0.40, t: 0.34, a: 0.85 },
  { x: 1.06, y: 0.44, r: 0.36, t: 0.18, a: 0.70 },
  { x: 0.42, y: 1.16, r: 0.48, t: 0.55, a: 0.75 },
  { x: 0.10, y: 1.04, r: 0.30, t: 0.72, a: 0.50 }
];

/* Behind a reading page the same masses run at a third of the alpha: type
   has to sit on this. */
const BLOBS_READ = BLOBS_LIGHT.map((b) => ({ ...b, a: b.a * 0.30 }));

// --------------------------------------------------------------- directions

const DIRS = [
  {
    key: 'Ember',
    treatment: 'additive',
    fieldMode: 'lighter',
    fieldK: 2.4, grainAmp: 0.075, grainScale: 1,
    dot: { mode: 'lighter', stepR: 1, stepC: 1, rLo: 0.35, rHi: 3.0, aLo: 0.07, aHi: 0.72, web: 0.13, webStep: 8, jitter: 0.40 },
    name: 'Ember',
    idea: 'Colour is light. The surface emits it.',
    tradeoff: 'Warmest and most atmospheric of the four, and the least neutral. Its field travels violet to cream the long way round, through rose, which is where the reference gradients live. On white it is the most obviously designed of the four and the hardest to keep quiet on a dense page.',
    dark: [[0.22, 0.105, 295], [0.45, 0.125, 258], [0.68, 0.110, 215], [0.97, 0.045, 92]],
    light: [[0.960, 0.045, 88], [0.760, 0.105, 30], [0.560, 0.130, 350], [0.400, 0.130, 300]],
    fieldDark: [[0.28, 0.090, 298], [0.36, 0.100, 340], [0.42, 0.092, 25], [0.50, 0.068, 88]],
    accent: '#B0641C',
    accentDark: '#E8B96B',
    blend: 'lighter'
  },
  {
    key: 'Signal',
    treatment: 'flat',
    fieldMode: 'lighter',
    fieldK: 2.2, grainAmp: 0.045, grainScale: 1,
    dot: { mode: 'source-over', stepR: 1, stepC: 1, rLo: 0.30, rHi: 2.6, aLo: 0.08, aHi: 0.78, web: 0.10, webStep: 8, jitter: 0.30 },
    name: 'Signal',
    idea: 'Colour is one hue. Brightness carries the quantity.',
    tradeoff: 'The most disciplined and the easiest to hold across a hundred pages. Its field is a single-hue wash, so nothing ever clashes and nothing ever surprises. Also the least distinctive: a blue ramp on a dark ground is what every analytics product already looks like.',
    dark: [[0.20, 0.055, 258], [0.44, 0.105, 253], [0.70, 0.095, 248], [0.96, 0.028, 244]],
    light: [[0.960, 0.020, 246], [0.780, 0.080, 251], [0.560, 0.120, 254], [0.360, 0.108, 259]],
    fieldDark: [[0.20, 0.058, 256], [0.30, 0.090, 252], [0.40, 0.098, 249], [0.28, 0.070, 246]],
    accent: '#0054AE',
    accentDark: '#8FC7EC',
    blend: 'source-over'
  },
  {
    key: 'Pigment',
    treatment: 'screened',
    fieldMode: 'source-over',
    fieldK: 2.3, grainAmp: 0.105, grainScale: 2,
    dot: { mode: 'source-over', stepR: 2, stepC: 2, rLo: 0.55, rHi: 3.9, aLo: 0.10, aHi: 0.70, web: 0.05, webStep: 12, jitter: 0.15 },
    name: 'Pigment',
    idea: 'Colour is ink. The surface is screened, not lit.',
    tradeoff: 'The only one of the four that looks printed rather than rendered, and the best greyscale survivor: its light ramp keeps a luminance gap of 0.076 across six samples. The screening costs fine detail, so the two summits read as texture before they read as position.',
    dark: [[0.28, 0.115, 293], [0.52, 0.120, 308], [0.76, 0.070, 344], [0.96, 0.045, 88]],
    light: [[0.965, 0.045, 88], [0.800, 0.070, 340], [0.600, 0.120, 305], [0.420, 0.140, 293]],
    fieldDark: [[0.32, 0.100, 296], [0.38, 0.100, 330], [0.44, 0.090, 20], [0.50, 0.068, 88]],
    accent: '#5B3F9B',
    accentDark: '#C4AEE4',
    blend: 'source-over'
  },
  {
    key: 'Achromatic',
    treatment: 'flat',
    fieldMode: 'source-over',
    fieldK: 1.0, grainAmp: 0.055, grainScale: 1,
    dot: { mode: 'source-over', stepR: 1, stepC: 1, rLo: 0.30, rHi: 2.8, aLo: 0.08, aHi: 0.76, web: 0.12, webStep: 8, jitter: 0.30 },
    name: 'Achromatic',
    idea: 'No colour in the field. One accent, in the interface only.',
    tradeoff: 'This is the current constitution, and it is the null the other three have to beat. It never fights the type and it prints anywhere. It also cannot encode a second variable, so every exhibit that needs one has to spend position or shape instead.',
    dark: [[0.15, 0, 0], [0.42, 0, 0], [0.70, 0, 0], [0.99, 0, 0]],
    light: [[0.970, 0, 0], [0.760, 0, 0], [0.520, 0, 0], [0.200, 0, 0]],
    fieldDark: [[0.16, 0, 0], [0.22, 0, 0], [0.30, 0, 0], [0.20, 0, 0]],
    accent: '#005CCC',
    accentDark: '#8FD3E8',
    blend: 'source-over'
  }
];

// ------------------------------------------------------------------- shells

function shell(o) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${FONTS}
  <style>
    body { margin: 0; }
    a { color: ${o.dark ? o.d.accentDark : o.d.accent}; text-decoration: none; }
    a:hover { color: ${o.dark ? '#FFFFFF' : '#131312'}; }
    .mk circle { fill: ${o.dark ? PAPER : DARK}; }
    .mono { font-family: 'Martian Mono', ui-monospace, monospace; font-weight: 300; letter-spacing: -0.012em; font-variant-numeric: tabular-nums; }
    ${o.css || ''}
  </style>
</helmet>
${o.body}
</x-dc>
<script data-dc-script data-props='${o.props || '{}'}'>
${o.js || 'class Component extends DCLogic {}'}
</script>
</body>
</html>
`;
}

const BAR = (dark, right) => `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px;">
      <div style="display: flex; align-items: center; gap: 11px;">
        <svg class="mk" style="width: 20px; height: 20px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g>${MARK}</g></svg>
        <span style="font-size: 12px; line-height: 18px; color: ${dark ? '#C9C9C7' : '#4A4A48'};">Eleven One Research</span>
      </div>
      <span class="mono" style="font-size: 10px; color: ${dark ? '#6C6C6A' : '#8C8C8A'};">${right}</span>
    </div>`;

const RAMPS = (d) => `
var A_D = ${JSON.stringify(d.dark)};
var A_L = ${JSON.stringify(d.light)};
var A_FD = ${JSON.stringify(d.fieldDark)};
function em(t, k) { return anchorRamp(A_D, t, k); }
function ik(t, k) { return anchorRamp(A_L, t, k); }
function fd(t, k) { return anchorRamp(A_FD, t, k); }
`;

module.exports = {
  LANGJS, GRIDJS, KDEJS, FXJS, anchorRamp, hex, at, atA, fieldCss, fieldBlobCss, endsFromAnchors,
  BLOBS_DARK, BLOBS_LIGHT, BLOBS_READ,
  SPREAD, MEDIANS, LABELS, COUNTS, TITLE, SUB, COVER_NOTE, LEDE, P1, P2, CLAIM, PIECES,
  MARK, NOISE, FONTS, DARK, PAPER, WHITE, DIRS, shell, BAR, RAMPS
};
