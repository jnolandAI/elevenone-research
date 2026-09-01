/* Meridian, crossed: the transitions between its members, as shapes.

   Six pairs, each drawn twice, once emitting on a dark ground and once as ink
   on paper. Every shape is a different shape on purpose: a set of identical
   blobs shows the colour but says nothing about whether the gradient survives
   being stretched, tightened or thrown off centre, which is what actually
   happens to it on a cover. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { PAIRS } = require('./_pairs.cjs');

const COL = 300, GAP = 36, PAD = 48, HEAD = 160, NAME = 26, DARKH = 340, MIDG = 12, PAPERH = 300, CAP = 120;
const W = PAD * 2 + PAIRS.length * COL + (PAIRS.length - 1) * GAP;
const H = PAD * 2 + HEAD + NAME + DARKH + MIDG + PAPERH + CAP;

/* One shape per pair, so the set says something about robustness as well as
   about colour. */
const SHAPES = [
  { n: 9, rot: 0.4, spread: 0.42, axis: 2.4, ex: 1.0, ey: 1.0 },
  { n: 10, rot: 1.1, spread: 0.46, axis: 3.1, ex: 1.5, ey: 0.66 },
  { n: 8, rot: 2.0, spread: 0.40, axis: 1.2, ex: 0.68, ey: 1.42 },
  { n: 12, rot: 0.2, spread: 0.62, axis: 0.4, ex: 1.15, ey: 0.95 },
  { n: 7, rot: 2.6, spread: 0.26, axis: 2.0, ex: 1.0, ey: 1.0 },
  { n: 10, rot: 2.2, spread: 0.54, axis: 5.0, ex: 1.25, ey: 1.05 }
];

const cols = PAIRS.map((p, i) => `
      <div style="display: flex; flex-direction: column; width: ${COL}px; flex-shrink: 0;">
        <span style="font-size: 15px; line-height: ${NAME}px; font-weight: 500; letter-spacing: -0.01em; color: ${D.DARK};">${p.n}</span>
        <canvas id="d${i}" width="${COL * 2}" height="${DARKH * 2}" style="width: ${COL}px; height: ${DARKH}px; display: block; background: ${D.DARK};"></canvas>
        <div style="height: ${MIDG}px;"></div>
        <canvas id="p${i}" width="${COL * 2}" height="${PAPERH * 2}" style="width: ${COL}px; height: ${PAPERH}px; display: block; background: #FFFFFF; outline: 1px solid #E4E4E2; outline-offset: -1px;"></canvas>
        <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: #6C6C6A; text-wrap: pretty;">${p.why}</p>
      </div>`).join('');

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Meridian, crossed')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 320px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">Meridian, crossed</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">Transitions between the palette's members, not within one of them.</p>
      </div>
      <p style="margin: 0; max-width: 900px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;">The route between two members matters more than the two members do. Blending runs in OKLab, so a distant pair meets along whichever path the interpolation takes, and there are usually two: one along the vivid ridge of the colour space and one across the part of it that holds almost no chroma. Cobalt to Ember through magenta stays saturated the whole way; the same pair straight across dies in the middle. The far pairs below carry an explicit waypoint on the ridge. The one pair with no vivid route at all is built the other way on purpose, with a neutral middle, and says so.</p>
    </div>
  </div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">${cols}
  </div>
</div>`;

const calls = PAIRS.map((p, i) =>
  `      this.paint(document.getElementById('d${i}'), document.getElementById('p${i}'), A[${i}], S[${i}], k, gr);`).join('\n');

const js = `${D.LANGJS}
${D.FXJS}
var A = ${JSON.stringify(PAIRS.map((p) => p.a))};
var S = ${JSON.stringify(SHAPES)};
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }
  paint(d, pcv, anchors, sh, k, gr) {
    var ramp = function (t, kk) { return anchorRamp(anchors, t, kk); };
    var o = function (extra) {
      var r = { t0: 0.04, t1: 0.96, n: sh.n, rot: sh.rot, spread: sh.spread, axis: sh.axis, ex: sh.ex, ey: sh.ey };
      for (var key in extra) r[key] = extra[key];
      return r;
    };
    var dc = d.getContext('2d');
    dc.globalCompositeOperation = 'source-over'; dc.globalAlpha = 1;
    dc.fillStyle = '${D.DARK}'; dc.fillRect(0, 0, d.width, d.height);
    fxOrganic(dc, d.width * 0.5, d.height * 0.5, d.width * 0.48, ramp, k, o({ a: 0.40, core: 0.68, mode: 'lighter' }));
    fxGrain(dc, d.width, d.height, gr, 7, 1);

    var pc = pcv.getContext('2d');
    pc.globalCompositeOperation = 'source-over'; pc.globalAlpha = 1;
    pc.fillStyle = '#FFFFFF'; pc.fillRect(0, 0, pcv.width, pcv.height);
    fxOrganic(pc, pcv.width * 0.5, pcv.height * 0.52, pcv.width * 0.40, ramp, k, o({ a: 0.60, mode: 'multiply' }));
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

const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"Meridian","tsType":"number"},"grain":{"editor":"range","default":0.06,"min":0,"max":0.16,"step":0.005,"section":"Meridian","tsType":"number"}}`;

fs.writeFileSync('MeridianPairs.dc.html', D.shell({ dark: false, d: D.DIRS[3], body, js, props }));
console.log('MeridianPairs.dc.html  ' + W + 'x' + H + '  ' + fs.statSync('MeridianPairs.dc.html').size + ' bytes');

module.exports = { PAIR_BOARD: { file: 'MeridianPairs.dc.html', w: W, h: H } };
