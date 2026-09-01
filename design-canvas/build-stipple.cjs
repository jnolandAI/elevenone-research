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

/* The eight density fields live in _forms.js, so the applied boards draw the
   same forms this board does rather than a second copy of them. */
const FORMS_JS = fs.readFileSync(__dirname + '/_forms.js', 'utf8');

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
${FORMS_JS}

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
