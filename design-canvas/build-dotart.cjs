/* Dot constructions: objects whose colour exists only inside the dots.

   Three panels. The same building twice, once carrying a gradient and once on
   the near-neutral member, because the set has to work without colour as
   often as with it; and the real margin surface, so the idea is shown once on
   something that is data rather than illustration.

   The building is ILLUSTRATION and is labelled as such on the board. The
   surface is the joint density from margin-cy2024.json, the same object every
   other board in this directory draws. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');

const PW = 860, PH = 700, GAP = 40, PAD = 48, HEAD = 172, CAP = 100;
const W = PAD * 2 + 3 * PW + 2 * GAP;
const H = PAD * 2 + HEAD + 26 + PH + CAP;

const grad = (id) => GRADIENTS.find((x) => x.id === id);

/* A massing, in cells. Heights only; everything else is projection. */
/* A cluster, not a field. The first version filled a six by six footprint
   and every cell had a neighbour, so the terraces merged into one rounded
   lump with no silhouette. Gaps are what make a massing read as architecture:
   the eye needs to see sky between the blocks. */
const MASS = [
  [0.00, 0.00, 0.00, 0.00, 0.00],
  [0.00, 0.54, 0.86, 0.00, 0.26],
  [0.00, 0.38, 1.00, 0.62, 0.00],
  [0.30, 0.00, 0.46, 0.72, 0.00],
  [0.00, 0.00, 0.00, 0.00, 0.00]
];

const panel = (i, label, sub) => `
      <div style="display: flex; flex-direction: column; width: ${PW}px; flex-shrink: 0;">
        <span style="font-size: 15px; line-height: 26px; font-weight: 500; letter-spacing: -0.01em;">${label}</span>
        <canvas id="c${i}" width="${PW * 2}" height="${PH * 2}" style="width: ${PW}px; height: ${PH}px; display: block;"></canvas>
        <p style="margin: 12px 0 0 0; font-size: 12px; line-height: 18px; color: #6C6C6A; text-wrap: pretty;">${sub}</p>
      </div>`;

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: ${D.PAPER}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Dot constructions')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 340px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">Colour only in the dots</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">The gradient runs across the whole frame. Only the dots reveal it.</p>
      </div>
      <p style="margin: 0; max-width: 1400px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;">Each dot takes the gradient&#39;s colour at its own position on the page, so the gradient is continuous across the image while nothing between the dots is ever painted. The ground stays exactly as dark as it was. Form and colour are carried separately, which is what makes it work: coverage drives dot SIZE and position drives dot COLOUR, so a face can turn away from the viewer and get smaller dots without changing hue. Colour a face by its own orientation instead and the object reads as a heatmap of itself.</p>
    </div>
  </div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${panel(0, 'Massing, cobalt to iris', 'Illustration, not data. Three faces per block at three coverages: the top reads solid, the two flanks lighter. The gradient runs corner to corner across the frame and is unaware of the object, which is why the tallest block and the shortest sit in different parts of it.')}
${panel(1, 'The same massing, slate', 'The same construction on the near-neutral member of the set. Most pieces should look like this: colour is the exception in the system, not the default, and a construction that only works in colour is not usable here.')}
${panel(2, 'Reported margin, the joint surface', 'The real object: 2,186 SEC registrants, revenue against gross margin, count of filers as elevation. Dots sit at the grid nodes rather than on a screen lattice, so the lattice bends with the surface while the gradient stays flat on the page. On paper it reads from the deep half of the gradient only, because the pale end of any ramp is invisible against white.')}
  </div>
</div>`;

const js = `${D.LANGJS}
${D.GRIDJS}
${D.FXJS}
var GA = ${JSON.stringify(grad('cobalt-iris').anchors)};
var GB = ${JSON.stringify(grad('slate').anchors)};
var GC = ${JSON.stringify(grad('iris-ember').anchors)};
var MASS = ${JSON.stringify(MASS)};

function rampOf(a) { return function (t, kk) { return anchorRamp(a, t, kk); }; }

/* The massing, projected once. Faces come back nearest-last, so a mask can
   walk them backwards and stop at the first hit. Projecting per face rather
   than per lattice point is what keeps the mask cheap enough to call for
   every dot on the frame. */
/* One projection, used by the faces and by the ground plane. Duplicating it
   was how the two drifted: the ground was drawn on different cell dimensions
   from the blocks standing on it.

   Isometric proportions are cw to ch of two to one. The first version had
   them at roughly seven to four with a footprint wider than the frame, so
   every block came out wider than it was tall and the cluster read as a
   horizontal smear rather than as architecture. */
function geom(W, H) {
  var n = MASS.length;
  return { n: n, cw: W * 0.086, ch: W * 0.043, hz: H * 0.44, ox: W * 0.50, oy: H * 0.30 };
}

/* The footprint of the whole massing, projected, for the ground plane. */
function ground(W, H) {
  var g = geom(W, H);
  function P(a, b) { return [g.ox + (a - b) * g.cw, g.oy + (a + b) * g.ch]; }
  var m = 0.5, q = g.n - 0.5;
  var a = P(m, m), b = P(q, m), c = P(q, q), d = P(m, q);
  return [a[0], a[1], b[0], b[1], c[0], c[1], d[0], d[1]];
}

function faces(W, H) {
  var g = geom(W, H), n = g.n;
  function P(a, b, h) { return [g.ox + (a - b) * g.cw, g.oy + (a + b) * g.ch - h * g.hz]; }
  var out = [];
  for (var s = 0; s <= 2 * n; s++) {
    for (var i = 0; i < n; i++) {
      var j = s - i;
      if (j < 0 || j >= n) continue;
      var h = MASS[i][j];
      if (h <= 0) continue;
      var t0 = P(i, j, h), t1 = P(i + 1, j, h), t2 = P(i + 1, j + 1, h), t3 = P(i, j + 1, h);
      var b1 = P(i + 1, j, 0), b2 = P(i + 1, j + 1, 0), b3 = P(i, j + 1, 0);
      out.push({ p: [t0[0], t0[1], t1[0], t1[1], t2[0], t2[1], t3[0], t3[1]], cov: 1.00 });
      out.push({ p: [t1[0], t1[1], t2[0], t2[1], b2[0], b2[1], b1[0], b1[1]], cov: 0.66 });
      out.push({ p: [t3[0], t3[1], t2[0], t2[1], b2[0], b2[1], b3[0], b3[1]], cov: 0.34 });
    }
  }
  return out;
}

class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  building(cv, anchors, k, gr) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '${D.DARK}'; ctx.fillRect(0, 0, W, H);
    var F = faces(W, H);
    /* A ground plane at a fraction of the alpha. Without it the cluster
       floats: there is nothing in the frame to say which way is down. */
    var G0 = ground(W, H);
    fxDotArt(ctx, W, H, rampOf(anchors), k, {
      pitch: 16, rMax: 2.0, rPow: 1.0, aLo: 0.06, aHi: 0.20,
      axis: [0.06, 0.94, 0.94, 0.06],
      mask: function (u, v, x, y) { return fxInPoly(x, y, G0) ? 1 : 0; }
    });
    fxDotArt(ctx, W, H, rampOf(anchors), k, {
      pitch: 16, rMax: 5.6, rPow: 0.44, aLo: 0.30, aHi: 1.0,
      axis: [0.06, 0.94, 0.94, 0.06],
      mask: function (u, v, x, y) {
        for (var i = F.length - 1; i >= 0; i--) if (fxInPoly(x, y, F[i].p)) return F[i].cov;
        return 0;
      }
    });
    fxGrain(ctx, W, H, gr, 7, 1);
  }

  surface(cv, anchors, k, gr) {
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    /* Sized to the frame, not chosen. An isometric surface reaches
       0.866 * (sx + sy) / 2 either side of its origin, so at sx 0.70W it ran
       186px off the left edge and the low corner of the distribution was
       being cut off the page. */
    var O = { ox: W * 0.50, oy: H * 0.64, sx: W * 0.55, sy: H * 0.66, hz: H * 0.42 };
    var ramp = rampOf(anchors);
    /* Dots at the grid nodes, coloured by where they land on the PAGE. The
       lattice bends with the surface; the gradient does not. */
    for (var r = 0; r < GROWS; r += 1) {
      for (var c = 0; c < GCOLS; c += 1) {
        var h = GRID[r][c] / GMAX;
        if (h < 0.015) continue;
        var p = isoPoint(c / (GCOLS - 1), r / (GROWS - 1), h, O);
        var t = 0.5 * (p[0] / W) + 0.5 * (1 - p[1] / H);
        t = 0.04 + 0.58 * (t < 0 ? 0 : (t > 1 ? 1 : t));
        var col = ramp(t, k);
        ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',' + (0.34 + 0.60 * Math.pow(h, 0.5)).toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(p[0], p[1], (1.1 + 4.0 * Math.pow(h, 0.95)), 0, 6.283185);
        ctx.fill();
      }
    }
    fxGrain(ctx, W, H, gr, 9, 1);
  }

  draw() {
    if (!document.getElementById('c0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.05;
    this.building(document.getElementById('c0'), GA, k, gr);
    this.building(document.getElementById('c1'), GB, k, gr);
    this.surface(document.getElementById('c2'), GC, k, gr);
  }
  renderVals() { return {}; }
}`;

const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"Dot art","tsType":"number"},"grain":{"editor":"range","default":0.05,"min":0,"max":0.16,"step":0.005,"section":"Dot art","tsType":"number"}}`;

fs.writeFileSync('DotArt.dc.html', D.shell({ dark: false, d: D.DIRS[3], body, js, props }));
console.log('DotArt.dc.html  ' + W + 'x' + H + '  ' + fs.statSync('DotArt.dc.html').size + ' bytes');

module.exports = { DOT_BOARD: { file: 'DotArt.dc.html', w: W, h: H } };
