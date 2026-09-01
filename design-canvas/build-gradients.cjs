/* The gradient set, as one reference sheet, plus gradients.json.

   A reference sheet is not an exploration: every gradient is rendered the
   same way, so the sheet compares colour and nothing else. Shape variation
   was the point of the pairs board and would be noise here. Each one appears
   twice, as a field on a dark ground and as a shape on paper, because those
   are the two things the system actually does with a gradient. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');

const COL = 300, GAP = 36, PAD = 48, HEAD = 168, NAME = 24, TOK = 18, DARKH = 250, MIDG = 10, PAPERH = 210, META = 30, SECT = 40;
const PITCH = 6;
const W = PAD * 2 + PITCH * COL + (PITCH - 1) * GAP;
const CELL = NAME + TOK + DARKH + MIDG + PAPERH + META;
const H = PAD * 2 + HEAD + (SECT + CELL) * 2 + 34;

const DARK_B = [
  { x: 0.82, y: 0.10, r: 0.76, t: 0.86, a: 0.98 },
  { x: 0.10, y: 1.02, r: 0.82, t: 0.20, a: 0.96 },
  { x: 1.10, y: 0.62, r: 0.50, t: 0.58, a: 0.72 }
];

const cell = (g, i) => `
      <div style="display: flex; flex-direction: column; width: ${COL}px; flex-shrink: 0;">
        <span style="font-size: 15px; line-height: ${NAME}px; font-weight: 500; letter-spacing: -0.01em;">${g.name}</span>
        <span class="mono" style="font-size: 10px; line-height: ${TOK}px; color: #8C8C8A;">${g.id}</span>
        <canvas id="d${i}" width="${COL * 2}" height="${DARKH * 2}" style="width: ${COL}px; height: ${DARKH}px; display: block; background: ${D.DARK};"></canvas>
        <div style="height: ${MIDG}px;"></div>
        <canvas id="p${i}" width="${COL * 2}" height="${PAPERH * 2}" style="width: ${COL}px; height: ${PAPERH}px; display: block; background: #FFFFFF; outline: 1px solid #E4E4E2; outline-offset: -1px;"></canvas>
        <span class="mono" style="font-size: 10px; line-height: ${META}px; color: #8C8C8A;">peak ${g.peakChroma.toFixed(3)} &#183; ${g.hueArc}&#176; arc</span>
      </div>`;

const section = (label, sub, items) => `
    <div style="display: flex; align-items: baseline; gap: 14px; height: ${SECT}px;">
      <span class="mono" style="font-size: 11px; letter-spacing: 0.08em; color: #4A4A48;">${label}</span>
      <span style="font-size: 13px; color: #8C8C8A;">${sub}</span>
    </div>
    <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">${items}
    </div>`;

const singles = GRADIENTS.filter((g) => g.kind === 'single');
const crossings = GRADIENTS.filter((g) => g.kind === 'crossing');

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Gradient set')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 320px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">The gradient set</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">Eleven gradients. The system's colour, in full.</p>
      </div>
      <p style="margin: 0; max-width: 900px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;">The system is black, white and grey. Colour appears only as one of these eleven and only where a gradient earns its place: a report cover, the site hero, a figure that needs a field behind it. Every rule, border, label, axis and panel stays greyscale, and nothing else in the system is coloured. One piece can run cobalt and the next moss without either looking like a different brand, because what makes them a family is how they are built. Saturation is specified as a fraction of what sRGB allows at each lightness and hue rather than as a fixed number, which is why they hold up beside each other instead of some looking washed out.</p>
    </div>
  </div>
${section('SINGLE', 'Held inside one hue family.', singles.map((g, i) => cell(g, i)).join(''))}
  <div style="height: 34px;"></div>
${section('CROSSING', 'Running between two members. The route is chosen, not inherited.', crossings.map((g, i) => cell(g, i + singles.length)).join(''))}
</div>`;

const calls = GRADIENTS.map((g, i) =>
  `      this.paint(document.getElementById('d${i}'), document.getElementById('p${i}'), A[${i}], k, gr);`).join('\n');

const js = `${D.LANGJS}
${D.FXJS}
var A = ${JSON.stringify(GRADIENTS.map((g) => g.anchors))};
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  paint(d, pcv, anchors, k, gr) {
    var ramp = function (t, kk) { return anchorRamp(anchors, t, kk); };
    var dc = d.getContext('2d');
    dc.globalCompositeOperation = 'source-over'; dc.globalAlpha = 1;
    dc.fillStyle = '${D.DARK}'; dc.fillRect(0, 0, d.width, d.height);
    fxField(dc, d.width, d.height, ramp, k, ${JSON.stringify(DARK_B)}, 'lighter');
    fxGrain(dc, d.width, d.height, gr, 7, 1);

    var pc = pcv.getContext('2d');
    pc.globalCompositeOperation = 'source-over'; pc.globalAlpha = 1;
    pc.fillStyle = '#FFFFFF'; pc.fillRect(0, 0, pcv.width, pcv.height);
    fxOrganic(pc, pcv.width * 0.5, pcv.height * 0.52, pcv.width * 0.40, ramp, k, {
      t0: 0.05, t1: 0.95, a: 0.60, mode: 'multiply', axis: 2.4
    });
    fxGrain(pc, pcv.width, pcv.height, gr * 0.8, 9, 1);
  }
  draw() {
    if (!document.getElementById('d0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.06;
${calls}
  }
  renderVals() { return {}; }
}`;

const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"Gradients","tsType":"number"},"grain":{"editor":"range","default":0.06,"min":0,"max":0.16,"step":0.005,"section":"Gradients","tsType":"number"}}`;

fs.writeFileSync('Gradients.dc.html', D.shell({ dark: false, d: D.DIRS[3], body, js, props }));

/* The spec, for anything that is not this canvas. Anchors so the real ramp
   can be rebuilt, stops and a css string so nothing downstream has to. */
fs.writeFileSync('gradients.json', JSON.stringify({
  set: 'Eleven One Research gradients',
  rule: 'The system is black, white and grey. Colour appears only as one of these gradients, and only on a cover, a hero, or a figure that needs a field. Rules, borders, labels, axes and panels stay greyscale.',
  space: 'OKLCH anchors, blended through OKLab. Saturation was specified as a fraction of the sRGB ceiling at each lightness and hue.',
  gradients: GRADIENTS.map((g) => ({
    id: g.id, name: g.name, kind: g.kind, note: g.note,
    anchors: g.anchors, stops: g.stops, css: g.css,
    peakChroma: g.peakChroma, meanChroma: g.meanChroma, ceilingUsed: g.ceilingUsed, hueArc: g.hueArc
  }))
}, null, 2));

console.log('Gradients.dc.html  ' + W + 'x' + H + '  ' + fs.statSync('Gradients.dc.html').size + ' bytes');
console.log('gradients.json     ' + GRADIENTS.length + ' gradients, ' + fs.statSync('gradients.json').size + ' bytes');

module.exports = { GRAD_BOARD: { file: 'Gradients.dc.html', w: W, h: H } };
