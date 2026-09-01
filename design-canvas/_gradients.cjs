/* THE GRADIENT SET.

   The system's colour, in full. Everything else in this directory is the
   argument that led here; this is the answer, and it is the only file
   downstream code should need to read.

   Eleven gradients: Meridian's five, each held inside one hue family, and six
   crossings that run between two of them. Colour appears only as one of these
   and only where a gradient earns its place. Every rule, border, label, axis
   and panel stays greyscale. Nothing else in the system is coloured.

   The anchors are not restated here. They live in _palettes.cjs and
   _pairs.cjs, and this composes them, so there is exactly one place a value
   can be wrong. What this file adds is the identity: a stable token per
   gradient, the kind, and the derived stops that let a stylesheet or a chart
   use one without doing OKLab arithmetic. */
const vm = require('vm');
const fs = require('fs');
const { PALETTES } = require('./_palettes.cjs');
const { PAIRS } = require('./_pairs.cjs');
const { maxChroma } = require('./gamut.cjs');

const box = { Math };
vm.createContext(box);
vm.runInContext(fs.readFileSync(__dirname + '/_lang.js', 'utf8'), box);

const MERIDIAN = PALETTES.find((p) => p.key === 'Meridian');

const token = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase();

/* Nine stops. Enough that a CSS gradient shows no banding across a hero, few
   enough to read in a spec. The curve between them is linear in sRGB, which
   is NOT what anchorRamp does, so nine is also the point where the cheap
   interpolation stops being visibly different from the real one. */
const STOPS = 9;

function derive(anchors) {
  const stops = [];
  for (let i = 0; i < STOPS; i++) stops.push(hex(box.anchorRamp(anchors, i / (STOPS - 1), 1)));
  let peak = 0, sum = 0, used = 0, n = 0;
  const hs = [];
  for (let i = 0; i <= 40; i++) {
    const c = box.anchorRamp(anchors, i / 40, 1);
    const s = box.rgbToLch(c[0], c[1], c[2]);
    sum += s.C; n++;
    if (s.C > peak) peak = s.C;
    const ceil = maxChroma(s.L, s.H);
    used += ceil > 0.01 ? s.C / ceil : 0;
    if (s.C >= 0.02) hs.push(s.H);
  }
  let arcv = 0;
  for (let i = 1; i < hs.length; i++) { let d = Math.abs(hs[i] - hs[i - 1]); if (d > 180) d = 360 - d; arcv += d; }
  return {
    stops,
    css: 'linear-gradient(180deg, ' + stops.map((s, i) => s + ' ' + Math.round((i / (STOPS - 1)) * 100) + '%').join(', ') + ')',
    meanChroma: +(sum / n).toFixed(3),
    peakChroma: +peak.toFixed(3),
    ceilingUsed: +(used / n).toFixed(3),
    hueArc: Math.round(arcv)
  };
}

const GRADIENTS = [
  ...MERIDIAN.grads.map((g) => ({
    id: token(g.n), name: g.n, kind: 'single',
    note: 'Held inside one hue family.',
    anchors: g.a, ...derive(g.a)
  })),
  ...PAIRS.map((p) => ({
    id: token(p.n.replace(/ to /g, '-')), name: p.n, kind: 'crossing',
    note: p.why,
    anchors: p.a, ...derive(p.a)
  }))
];

module.exports = { GRADIENTS };
