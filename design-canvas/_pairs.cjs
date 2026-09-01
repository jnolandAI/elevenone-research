/* Meridian, crossed.

   The palette's five members each hold one hue family. These are the
   transitions BETWEEN them, which is where a gradient gets somewhere to go.

   The route matters more than the endpoints. Blending runs in OKLab, so two
   hues meet along whichever path the interpolation takes, and for a distant
   pair there are two: one along the vivid ridge and one across the part of
   sRGB that has no chroma in it. Cobalt to Ember through magenta stays
   saturated the whole way; the same pair through cyan and green dies in the
   middle. So the far pairs carry an explicit waypoint on the ridge, and the
   one pair with no vivid route at all is built the other way on purpose, with
   a deliberately neutral middle, and labelled as such.

   Anchors are [lightness, saturation as a fraction of the sRGB ceiling, hue],
   same as _palettes.cjs. */
const { expand } = require('./gamut.cjs');

const RAW = [
  {
    n: 'Cobalt to Iris',
    why: 'Neighbours on the ridge. No waypoint needed: everything between blue and violet is vivid, so the whole arc stays saturated.',
    a: [[0.34, 0.92, 272], [0.48, 1.00, 284], [0.62, 1.00, 304], [0.84, 0.55, 326]]
  },
  {
    n: 'Iris to Ember',
    why: 'The ridge continues through magenta into red. The most saturated crossing in the set, and the one that most needs a dark ground to sit on.',
    a: [[0.38, 0.92, 300], [0.52, 1.00, 326], [0.64, 1.00, 352], [0.84, 0.58, 30]]
  },
  {
    n: 'Cobalt to Ember',
    why: 'Far apart, so the route is chosen rather than inherited: through magenta at 336, which is the vivid way round. Straight across would pass through the flattest part of the space.',
    a: [[0.34, 0.95, 268], [0.48, 1.00, 300], [0.62, 1.00, 336], [0.82, 0.62, 20]]
  },
  {
    n: 'Moss to Ember',
    why: 'Green into red by way of yellow. This one DESCENDS, because the two ends want opposite lightnesses: sRGB holds its vivid greens up near 0.82 and its vivid reds down near 0.52, and climbing through yellow instead put the whole crossing in the flattest part of the space.',
    a: [[0.82, 0.95, 150], [0.72, 1.00, 112], [0.62, 1.00, 58], [0.50, 0.95, 24]]
  },
  {
    n: 'Cobalt to Moss',
    why: 'The pair with no vivid route. Blue to green passes through cyan, where sRGB has almost no chroma, and the long way round is a rainbow. Built with a deliberately neutral middle instead: the crossing reads as a crossing rather than as mud.',
    a: [[0.36, 0.95, 268], [0.52, 0.10, 252], [0.70, 0.92, 168], [0.88, 0.55, 132]]
  },
  {
    n: 'Slate to Iris',
    why: 'The quiet member into a loud one. Starts as grey and only becomes a colour halfway up, so it can carry a page that needs restraint at one end and an accent at the other.',
    a: [[0.30, 0.10, 250], [0.48, 0.34, 286], [0.66, 0.95, 312], [0.86, 0.50, 330]]
  }
];

const PAIRS = RAW.map((p) => ({ n: p.n, why: p.why, a: expand(p.a) }));

module.exports = { PAIRS, RAW };
