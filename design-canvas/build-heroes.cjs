/* Hero images: recognisable subjects in the dot technique.

   The forms board is decoration, and it belongs in a margin or behind a
   headline. This is the other job: the image at the front of a piece, which
   has to be a picture OF something. A study of data centres gets a rack row,
   one on trade gets a container terminal, one on a city gets that city.

   The point of this board is not the five subjects. It is the pipeline: a
   subject is a function that paints greys onto a canvas, fxMaskFrom reads
   those pixels back as a density field, and fxStipple draws it. Anything that
   can be drawn can be stippled, so a traced skyline, a wordmark or a client
   logo enters the same way and comes out looking like the others. The five
   here exist so the sixth has something to be consistent with. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');

const SUBJECTS_JS = fs.readFileSync(__dirname + '/_subjects.js', 'utf8');

const PW = 720, PH = 860, GAP = 36, PAD = 48, HEAD = 182, TITLE = 26, CAP = 96;
const W = PAD * 2 + 5 * PW + 4 * GAP;
const H = PAD * 2 + HEAD + TITLE + PH + CAP;

const grad = (id) => GRADIENTS.find((x) => x.id === id);

const PANELS = [
  ['Data centres', 'cobalt', 'A row of racks in elevation. What makes it read is the rhythm of units and the column of lights, not the cabinet: a plain box would be a filing cabinet.'],
  ['Trade and logistics', 'cobalt-ember', 'A gantry crane over a container yard. The crane is the whole silhouette. Without the boom reaching out over the stacks this is a warehouse.'],
  ['A city', 'iris-ember', 'Crowns are what make one skyline not another: a mast, a set of setbacks, a taper, a drum. Replace the profile array with a real one and the same pipeline draws that city.'],
  ['Energy', 'moss-ember', 'The most legible silhouette in the set. Three blades and a tower, and nothing else is needed or wanted.'],
  ['A mark', 'cobalt-iris', 'The Eleven One mark at scale, to show the logo case. A client mark or a wordmark enters exactly here, as a path on a canvas.']
];

const panel = (i, p) => `
      <div style="display: flex; flex-direction: column; width: ${PW}px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px; height: ${TITLE}px;">
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">${p[0]}</span>
          <span class="mono" style="font-size: 10px; color: #8C8C8A;">${p[1]}</span>
        </div>
        <canvas id="h${i}" width="${PW * 2}" height="${PH * 2}" style="width: ${PW}px; height: ${PH}px; display: block; background: ${D.DARK};"></canvas>
        <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: #6C6C6A; text-wrap: pretty;">${p[2]}</p>
      </div>`;

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Hero images')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 340px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">Pictures of things</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">The same technique, aimed at subjects you can name.</p>
      </div>
      <p style="margin: 0; max-width: 2200px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;">The forms board is decoration and belongs in a margin or behind a headline. This is the other job: the image at the front of a piece, which has to be a picture of something. <strong style="font-weight: 500; color: #2B2B2A;">What matters here is the pipeline, not these five subjects.</strong> A subject is a function that paints greys onto a canvas, where white is full dot density and black is none. That canvas is read back once as a density field and stippled. Anything that can be drawn can be stippled, so a traced skyline, a wordmark or a client logo enters the same way and comes out looking like the others. These five exist so the sixth has something to be consistent with. Two rules decide whether a subject reads. The silhouette has to work first: if it is not recognisable as a flat cut-out it will not become recognisable once it is made of dots. And detail has to be painted as TONE rather than as line, because a stipple cannot draw anything thinner than its own dot pitch, so panel gaps, window grids and structure are areas of different grey.</p>
    </div>
  </div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${PANELS.map((p, i) => panel(i, p)).join('')}
  </div>
</div>`;

const js = `${D.LANGJS}
${D.FXJS}
${SUBJECTS_JS}
var A = ${JSON.stringify(PANELS.map((p) => grad(p[1]).anchors))};

function rampOf(a) { return function (t, kk) { return anchorRamp(a, t, kk); }; }

/* One spec per subject. Pitch and mark size are the only things tuned per
   subject, because a rack row needs a finer grain than a turbine to keep its
   units apart, and a mark wants a coarser one so the dots stay countable. */
/* Counts are high because these have to be READ, not felt. The forms board
   works at nine thousand marks because nothing there has to be identified;
   a rack row at nine thousand is a smear. */
var SPEC = [
  { count: 52000, rMin: 1.0, rMax: 2.6, glyph: 'dot', axis: [0.04, 0.90, 0.96, 0.10], grid: 110 },
  { count: 50000, rMin: 1.0, rMax: 2.7, glyph: 'dot', axis: [0.02, 0.86, 0.98, 0.16], grid: 110 },
  { count: 58000, rMin: 1.0, rMax: 2.5, glyph: 'dot', axis: [0.04, 0.92, 0.96, 0.08], grid: 120 },
  { count: 40000, rMin: 1.1, rMax: 3.0, glyph: 'dot', axis: [0.06, 0.88, 0.94, 0.12], grid: 104 },
  { count: 42000, rMin: 1.1, rMax: 3.2, glyph: 'dot', axis: [0.10, 0.90, 0.90, 0.10], grid: 104 }
];

class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  paint(cv, i, k, gr) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${D.DARK}'; ctx.fillRect(0, 0, W, H);
    var s = SPEC[i];
    var mask = fxMaskFrom(SUBJECTS[i], W, H, 3);
    fxStipple(ctx, W, H, rampOf(A[i]), k, {
      count: s.count, seed: 5 + i * 17, glyph: s.glyph, grid: s.grid,
      rMin: s.rMin, rMax: s.rMax,
      aLo: 0.26, aHi: 1.0, t0: 0.24, t1: 1.0,
      axis: s.axis, density: mask
    });
    fxGrain(ctx, W, H, gr, 19 + i, 1);
  }

  draw() {
    if (!document.getElementById('h0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.05;
    this.paint(document.getElementById('h0'), 0, k, gr);
    this.paint(document.getElementById('h1'), 1, k, gr);
    this.paint(document.getElementById('h2'), 2, k, gr);
    this.paint(document.getElementById('h3'), 3, k, gr);
    this.paint(document.getElementById('h4'), 4, k, gr);
  }
  renderVals() { return {}; }
}`;

const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"Heroes","tsType":"number"},"grain":{"editor":"range","default":0.05,"min":0,"max":0.16,"step":0.005,"section":"Heroes","tsType":"number"}}`;

fs.writeFileSync('Heroes.dc.html', D.shell({ dark: false, d: D.DIRS[3], body, js, props }));
console.log('Heroes.dc.html  ' + W + 'x' + H + '  ' + fs.statSync('Heroes.dc.html').size + ' bytes');

module.exports = { HERO_BOARD: { file: 'Heroes.dc.html', w: W, h: H } };
