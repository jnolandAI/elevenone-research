/* Stipple constructions: illustration, not data.

   These carry the IDEA of a piece, not its numbers. A study about
   fragmentation gets a mass that disperses; one about consolidation gets a
   field that narrows to a point. The figures board is where data lives, and
   nothing here is derived from any dataset or should ever be read as if it
   were. Every panel says so on the board.

   That separation is the point. The first version forced the margin dataset
   through every one of these forms, which made weak illustrations AND weak
   figures: the data had to bend to suit a shape, and the shape had to bend to
   suit the data. Freed of each other, both get better.

   Eight forms, chosen because a research practice actually needs them. Each
   is a density field and nothing else; the marks are placed by rejection
   sampling against it. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');

const PW = 620, PH = 700, GAP = 36, PAD = 48, HEAD = 178, TITLE = 26, CAP = 92, ROWGAP = 40;
const W = PAD * 2 + 4 * PW + 3 * GAP;
const CELL = TITLE + PH + CAP;
const H = PAD * 2 + HEAD + CELL * 2 + ROWGAP;

const grad = (id) => GRADIENTS.find((x) => x.id === id);

const PANELS = [
  ['Dispersion', 'cobalt-iris', 'Fragmentation. A benchmark that stops holding, a peer set that turns out not to be one, a market coming apart.'],
  ['Convergence', 'iris-ember', 'Consolidation, or selection. A wide field narrowing until only a little of it is left, and that little dense.'],
  ['Erosion', 'slate', 'An advantage decaying. Solid at the top and coming apart underneath, which is usually the order it happens in.'],
  ['Confluence', 'cobalt-ember', 'Two things becoming one. Sectors converging, a merger, two methods arriving at the same answer.'],
  ['Threshold', 'ember', 'A cut-off, and what survives past it. Most of the mass stops at the line; a little of it does not.'],
  ['Concentration', 'moss-ember', 'A market with a centre of gravity. One dominant core, a few real ones, a long tail that never quite reaches zero. Countable for three or four, then not, which is the point.'],
  ['Skyline', 'cobalt', 'Industry, plainly. The one literal form in the set, dissolving at the base so it does not read as a photograph.'],
  ['Strata', 'slate-iris', 'Layers, segments, a stack. Bands of different weight, with the lowest thinning out.']
];

const panel = (i, p) => `
      <div style="display: flex; flex-direction: column; width: ${PW}px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px; height: ${TITLE}px;">
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">${p[0]}</span>
          <span class="mono" style="font-size: 10px; color: #8C8C8A;">${p[1]}</span>
        </div>
        <canvas id="s${i}" width="${PW * 2}" height="${PH * 2}" style="width: ${PW}px; height: ${PH}px; display: block; background: #FFFFFF; outline: 1px solid #E8E8E6; outline-offset: -1px;"></canvas>
        <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: #6C6C6A; text-wrap: pretty;">${p[2]}</p>
      </div>`;

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Stipple constructions &#183; illustration')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 340px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">Forms, not figures</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">Eight ideas a piece might need to draw. None of them is data.</p>
      </div>
      <p style="margin: 0; max-width: 1800px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;"><strong style="font-weight: 500; color: #2B2B2A;">Nothing on this board is derived from any dataset and none of it should be read as if it were.</strong> These carry the idea of a piece rather than its numbers: a study about fragmentation gets a mass that disperses, one about consolidation gets a field that narrows to a point. Data belongs on the figures board, where it is labelled and sourced. Keeping the two apart is what makes both work. Forcing one dataset through eight illustrative shapes produced weak illustrations and weak figures at the same time, because the data had to bend to suit a shape and the shape had to bend to suit the data. Each form here is a density field and nothing else. Marks are placed by throwing candidates at the frame and keeping each with probability equal to the field, so tone comes from how many land rather than from how big they are, and every form can thin to nothing at an edge.</p>
    </div>
  </div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${PANELS.slice(0, 4).map((p, i) => panel(i, p)).join('')}
  </div>
  <div style="height: ${ROWGAP}px;"></div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${PANELS.slice(4).map((p, i) => panel(i + 4, p)).join('')}
  </div>
</div>`;

const js = `${D.LANGJS}
${D.FXJS}
var A = ${JSON.stringify(PANELS.map((p) => grad(p[1]).anchors))};

function rampOf(a) { return function (t, kk) { return anchorRamp(a, t, kk); }; }
function G(z) { return Math.exp(-z * z); }

/* A cheap value hash, so a form can be granular without a texture. Used for
   the fracturing in Erosion and the grit in Skyline: without it a dissolve is
   perfectly smooth, and a perfectly smooth dissolve looks rendered. */
function hash(x, y) {
  var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

var FORMS = [
  /* Dispersion. A head that holds, and a tail that does not. */
  function (u, v) {
    var dx = u - 0.20, dy = v - 0.5;
    var sig = 0.055 + 0.62 * Math.max(0, dx);
    return G(dy / sig) * Math.exp(-Math.max(0, dx) * 2.1) * 1.5;
  },
  /* Convergence. The same in reverse, and denser where it lands. */
  function (u, v) {
    var dx = 0.82 - u, dy = v - 0.5;
    var sig = 0.05 + 0.60 * Math.max(0, dx);
    return G(dy / sig) * (0.18 + 1.5 * Math.pow(u, 2.4));
  },
  /* Erosion. Solid above, fracturing below, with the fractures vertical
     because that is how a face falls away. */
  function (u, v) {
    if (u < 0.20 || u > 0.80) return 0;
    if (v < 0.10) return 0;
    if (v <= 0.44) return 1;
    var d = (v - 0.44) / 0.46;
    var crack = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(u * 58), 0.7);
    return (1.15 - 1.1 * Math.pow(d, 0.85)) * crack * (0.55 + 0.45 * hash(Math.floor(u * 90), Math.floor(v * 90)));
  },
  /* Confluence. Two bands that find each other. */
  function (u, v) {
    var m = 1 / (1 + Math.exp(-(u - 0.46) * 13));
    var w = 0.030 + 0.028 * (1 - m);
    var a = 0.34 + 0.16 * m, b = 0.66 - 0.16 * m;
    return (G((v - a) / w) + G((v - b) / w)) * (0.5 + 0.7 * u);
  },
  /* Threshold. A line most of the mass stops at. */
  function (u, v) {
    if (v < 0.08 || v > 0.92) return 0;
    var line = 0.54 + 0.055 * Math.sin(v * 7.2);
    if (u < line) return 0.55 + 0.55 * (u / line);
    var past = (u - line) / 0.30;
    return 0.34 * Math.exp(-past * past * 2.6);
  },
  /* Concentration. Not one blob.

     The first version was three nested gaussians on a common centre, which is
     radially symmetric and therefore inert: no direction, nothing to count,
     and no way to see that it is ABOUT concentration rather than merely
     concentrated. This is a field of cores whose weights fall off steeply,
     one dominant, a few real, a long tail of small ones, plus a thin haze
     that never quite reaches zero. That is what a concentrated market looks
     like, and it can be read: the eye counts three or four before giving up,
     which is the point being made.

     Each core is a wide skirt plus a tight spike rather than a single
     gaussian. A lone gaussian has no peak to it at stipple density; the spike
     is what makes a core read as a summit instead of a smudge. */
  function (u, v) {
    var CORES = [
      [0.42, 0.47, 0.088, 1.30], [0.67, 0.31, 0.054, 0.74], [0.29, 0.67, 0.050, 0.62],
      [0.73, 0.63, 0.034, 0.42], [0.21, 0.31, 0.030, 0.33], [0.55, 0.79, 0.026, 0.27],
      [0.84, 0.47, 0.021, 0.21], [0.37, 0.19, 0.019, 0.17], [0.63, 0.13, 0.015, 0.12],
      [0.15, 0.52, 0.014, 0.10], [0.79, 0.80, 0.012, 0.08], [0.46, 0.90, 0.011, 0.07]
    ];
    var t = 0;
    for (var i = 0; i < CORES.length; i++) {
      var c = CORES[i];
      var dx = (u - c[0]) * 1.04, dy = v - c[1];
      /* Bail before the sqrt and the two exps. Twelve cores evaluated in full
         for every candidate made this the most expensive field on the board
         by a wide margin, and beyond three sigma a core contributes nothing
         a stipple can show. */
      var lim = c[2] * 3.1;
      if (dx > lim || dx < -lim || dy > lim || dy < -lim) continue;
      var r = Math.sqrt(dx * dx + dy * dy);
      t += c[3] * (0.52 * G(r / c[2]) + 0.48 * G(r / (c[2] * 0.40)));
    }
    /* The tail. Never zero, so the frame is never empty, and thinner at the
       edges so the field still has a shape. */
    var ex = (u - 0.5) * 1.04, ey = v - 0.5;
    return t + 0.075 * G(Math.sqrt(ex * ex + ey * ey) / 0.46);
  },
  /* Skyline. Heights are made up: this is a picture of an industry, not a
     count of anything. */
  function (u, v) {
    var TOW = [0.60, 0.34, 0.72, 0.46, 0.86, 0.52, 0.30, 0.66, 0.40, 0.76, 0.28, 0.58];
    if (u < 0.06 || u > 0.94) return 0;
    var span = 0.88 / TOW.length;
    var i = Math.floor((u - 0.06) / span);
    if (i < 0 || i >= TOW.length) return 0;
    var within = ((u - 0.06) / span) - i;
    if (within < 0.08 || within > 0.92) return 0;
    var top = 0.88 - 0.62 * TOW[i];
    if (v < top || v > 0.94) return 0;
    var down = (v - top) / (0.94 - top);
    return (1.05 - 0.98 * Math.pow(down, 1.6)) * (0.6 + 0.4 * hash(Math.floor(u * 120), Math.floor(v * 120)));
  },
  /* Strata. Bands of different weight, thinning downward. */
  function (u, v) {
    if (u < 0.10 || u > 0.90) return 0;
    var BANDS = [[0.14, 0.055, 1.0], [0.27, 0.040, 0.72], [0.38, 0.070, 0.95], [0.53, 0.032, 0.55], [0.63, 0.058, 0.78], [0.76, 0.045, 0.42], [0.87, 0.030, 0.22]];
    var t = 0;
    for (var i = 0; i < BANDS.length; i++) {
      var b = BANDS[i];
      var z = (v - b[0]) / b[1];
      if (z > -2.4 && z < 2.4) t += b[2] * G(z);
    }
    var edge = Math.min(1, (u - 0.10) / 0.10) * Math.min(1, (0.90 - u) / 0.10);
    return t * (0.35 + 0.65 * edge);
  }
];

var SPEC = [
  { glyph: 'bird', count: 9000, rMin: 1.6, rMax: 4.2, spin: 1.1, axis: [0.06, 0.50, 0.94, 0.50] },
  { glyph: 'bird', count: 9000, rMin: 1.6, rMax: 4.2, spin: 0.7, axis: [0.94, 0.50, 0.06, 0.50] },
  { glyph: 'square', count: 11000, rMin: 1.5, rMax: 3.2, axis: [0.20, 0.10, 0.80, 0.92] },
  { glyph: 'dot', count: 10500, rMin: 1.1, rMax: 3.0, axis: [0.06, 0.10, 0.94, 0.90] },
  { glyph: 'dash', count: 10000, rMin: 1.3, rMax: 3.2, angle: 1.5, spin: 0.35, axis: [0.06, 0.50, 0.94, 0.50] },
  { glyph: 'dot', count: 12500, rMin: 1.0, rMax: 2.9, axis: [0.12, 0.88, 0.88, 0.12] },
  { glyph: 'square', count: 11000, rMin: 1.5, rMax: 3.3, axis: [0.06, 0.94, 0.94, 0.14] },
  { glyph: 'dash', count: 10000, rMin: 1.3, rMax: 3.4, angle: 0.06, spin: 0.28, axis: [0.10, 0.10, 0.90, 0.90] }
];

class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  paint(cv, i, k, gr) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    var s = SPEC[i];
    fxStipple(ctx, W, H, rampOf(A[i]), k, {
      count: s.count, seed: 7 + i * 13, glyph: s.glyph,
      rMin: s.rMin, rMax: s.rMax, angle: s.angle, spin: s.spin,
      aLo: 0.42, aHi: 0.96, t0: 0.05, t1: 0.92, grid: 56,
      axis: s.axis, density: FORMS[i]
    });
    fxGrain(ctx, W, H, gr, 11 + i, 1);
  }

  draw() {
    if (!document.getElementById('s0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.03;
    this.paint(document.getElementById('s0'), 0, k, gr);
    this.paint(document.getElementById('s1'), 1, k, gr);
    this.paint(document.getElementById('s2'), 2, k, gr);
    this.paint(document.getElementById('s3'), 3, k, gr);
    this.paint(document.getElementById('s4'), 4, k, gr);
    this.paint(document.getElementById('s5'), 5, k, gr);
    this.paint(document.getElementById('s6'), 6, k, gr);
    this.paint(document.getElementById('s7'), 7, k, gr);
  }
  renderVals() { return {}; }
}`;

const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"Stipple","tsType":"number"},"grain":{"editor":"range","default":0.03,"min":0,"max":0.16,"step":0.005,"section":"Stipple","tsType":"number"}}`;

fs.writeFileSync('Stipple.dc.html', D.shell({ dark: false, d: D.DIRS[3], body, js, props }));
console.log('Stipple.dc.html  ' + W + 'x' + H + '  ' + fs.statSync('Stipple.dc.html').size + ' bytes');

module.exports = { STIPPLE_BOARD: { file: 'Stipple.dc.html', w: W, h: H } };
