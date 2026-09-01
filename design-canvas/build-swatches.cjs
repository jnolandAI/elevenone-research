/* One artboard per gradient palette. Swatches only: nothing is applied to a
   page here. The choice this serves is which CONSTRUCTION the palettes share,
   not which five colours, so every board shows the same five slots rendered
   the same way and only the rule behind them changes.

   Each gradient is shown on both grounds, because a gradient that works on a
   dark cover and dies on paper is not usable in a system where half the pages
   are white. They are rendered as FIELDS, with the soft masses and the grain
   the real boards use, rather than as flat linear ramps: a linear ramp of the
   same anchors looks like a different thing entirely. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { PALETTES } = require('./_palettes.cjs');

const COL = 300, GAP = 36, PAD = 48, HEAD = 150, NAME = 26, DARKH = 360, MIDG = 12, PAPERH = 300, CAP = 40;
const W = PAD * 2 + 5 * COL + 4 * GAP;
const H = PAD * 2 + HEAD + NAME + DARKH + MIDG + PAPERH + CAP;

/* Deep at the bottom left, bright at the top right, both bleeding off the
   block so no mass shows an edge. */
/* Pushed to opposite corners and pulled in, so ground survives between them.
   At near-full width the two ends overlapped across most of the block and
   added: on a duotone, blue plus red is pink, and every crossing gradient
   read pastel through its middle. The reference posters keep a near-black
   band between the two temperatures rather than blending them. */
const DARK_B = [
  { x: 0.82, y: 0.10, r: 0.76, t: 0.84, a: 0.98 },
  { x: 0.10, y: 1.02, r: 0.82, t: 0.22, a: 0.96 },
  { x: 1.10, y: 0.62, r: 0.50, t: 0.58, a: 0.72 }
];
/* On paper the same ramp is read from its middle: multiply is identity
   against white, so the pale end of a gradient multiplies to nothing at all. */
const PAPER_B = [
  { x: 0.78, y: 0.90, r: 0.80, t: 0.46, a: 0.90 },
  { x: 0.10, y: 0.20, r: 0.62, t: 0.72, a: 0.70 },
  { x: 1.04, y: 0.18, r: 0.54, t: 0.60, a: 0.62 }
];

function arc(anchors) {
  const vm = require('vm');
  const box = { Math };
  vm.createContext(box);
  vm.runInContext(D.LANGJS, box);
  const hs = [];
  for (let i = 0; i <= 40; i++) {
    const c = box.anchorRamp(anchors, i / 40, 1);
    const s = box.rgbToLch(c[0], c[1], c[2]);
    if (s.C >= 0.02) hs.push(s.H);
  }
  let a = 0;
  for (let i = 1; i < hs.length; i++) { let d = Math.abs(hs[i] - hs[i - 1]); if (d > 180) d = 360 - d; a += d; }
  return Math.round(a);
}

function board(p) {
  const cols = p.grads.map((g, i) => `
      <div style="display: flex; flex-direction: column; width: ${COL}px; flex-shrink: 0;">
        <span style="font-size: 15px; line-height: ${NAME}px; font-weight: 500; letter-spacing: -0.01em; color: ${D.DARK};">${g.n}</span>
        <canvas id="d${i}" width="${COL * 2}" height="${DARKH * 2}" style="width: ${COL}px; height: ${DARKH}px; display: block; background: ${D.DARK};"></canvas>
        <div style="height: ${MIDG}px;"></div>
        <canvas id="p${i}" width="${COL * 2}" height="${PAPERH * 2}" style="width: ${COL}px; height: ${PAPERH}px; display: block; background: #FFFFFF; outline: 1px solid #E4E4E2; outline-offset: -1px;"></canvas>
        <span class="mono" style="font-size: 10px; line-height: ${CAP}px; color: #8C8C8A;">${arc(g.a)}&#176; hue arc</span>
      </div>`).join('');

  const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Gradient palette')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 300px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">${p.name}</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">${p.rule}</p>
      </div>
      <p style="margin: 0; max-width: 760px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;">${p.note}</p>
    </div>
  </div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">${cols}
  </div>
</div>`;

  /* Literal ids, unrolled, rather than getElementById('d' + i).

     A computed id cannot be rewritten by anything that reads this file as
     text, and the preview harness rewrites ids so several boards can share a
     page. With the loop version every lookup returned null, the draw bailed
     on its first line, and both grids rendered as empty blocks. It looked
     exactly like a colour bug. */
  const calls = p.grads.map((g, i) =>
    `      this.paint(document.getElementById('d${i}'), document.getElementById('p${i}'), G[${i}], k, gr);`).join('\n');

  const js = `${D.LANGJS}
${D.FXJS}
var G = ${JSON.stringify(p.grads.map((g) => g.a))};
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

    /* On paper the gradient is a shape, not a wash. Judged as a square it
       reads flatter than it is, and half its real uses are shapes anyway. */
    var pc = pcv.getContext('2d');
    pc.globalCompositeOperation = 'source-over'; pc.globalAlpha = 1;
    pc.fillStyle = '#FFFFFF'; pc.fillRect(0, 0, pcv.width, pcv.height);
    fxOrganic(pc, pcv.width * 0.5, pcv.height * 0.52, pcv.width * 0.40, ramp, k, {
      t0: 0.08, t1: 0.78, a: 0.62, mode: 'multiply', axis: 2.4
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

  const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"${p.name}","tsType":"number"},"grain":{"editor":"range","default":0.06,"min":0,"max":0.16,"step":0.005,"section":"${p.name}","tsType":"number"}}`;
  return { src: D.shell({ dark: false, d: D.DIRS[3], body, js, props }), w: W, h: H };
}

const out = [];
for (const p of PALETTES) {
  const b = board(p);
  const file = 'Palette' + p.key + '.dc.html';
  fs.writeFileSync(file, b.src);
  out.push({ file, w: b.w, h: b.h, key: p.key, name: p.name, rule: p.rule });
  console.log(file.padEnd(26) + b.w + 'x' + b.h + '  ' + fs.statSync(file).size + ' bytes');
}
console.log('\n' + out.length + ' palette boards');

module.exports = { SWATCHES: out };
