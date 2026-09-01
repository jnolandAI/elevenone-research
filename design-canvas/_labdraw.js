/* The composition under test. Numbers here move to _dirs.cjs once settled. */

/* Chroma multiplier for the FIELD only. The accepted ramps sit around C=0.07
   to 0.10, correct for encoding and roughly a third of what the reference
   gradients carry at their cores. Encoding ramps are untouched. */
var FK = 2.4;

/* Grain. The old CSS feTurbulence overlay ran at 0.06 opacity over a 180px
   tile and was invisible at reading size. This is dust in the pixels: half
   darkens, half lightens, so the mean is unmoved. Above about 0.10 it stops
   reading as film and starts reading as broken signal. */
var GRAIN_DARK = 0.075, GRAIN_LIGHT = 0.055, GRAIN_SCALE = 1;

var DARK_BLOBS = [
  { x: 0.80, y: 0.26, r: 0.50, t: 0.92, a: 0.90 },
  { x: 1.04, y: 0.70, r: 0.44, t: 0.55, a: 0.75 },
  { x: 0.52, y: 1.06, r: 0.58, t: 0.16, a: 0.66 },
  { x: 0.30, y: -0.12, r: 0.46, t: 0.34, a: 0.30 }
];

/* On paper the masses come off the encoding ramp, not the pale field ramp.
   Multiply is identity against white, so a wash whose lightness is already
   0.94 multiplies to nothing: the paper panels were empty for exactly that
   reason. These sit at L 0.56 to 0.80 and are visible. */
var LIGHT_BLOBS = [
  { x: 0.88, y: 0.92, r: 0.40, t: 0.34, a: 0.85 },
  { x: 1.06, y: 0.44, r: 0.36, t: 0.18, a: 0.70 },
  { x: 0.42, y: 1.16, r: 0.48, t: 0.55, a: 0.75 },
  { x: 0.10, y: 1.04, r: 0.30, t: 0.72, a: 0.50 }
];

function ramps(d) {
  return {
    em: function (t, k) { return anchorRamp(d.dark, t, k); },
    ik: function (t, k) { return anchorRamp(d.light, t, k); },
    fd: function (t, k) { return anchorRamp(d.fieldDark, t, k); },
    fl: function (t, k) { return anchorRamp(d.fieldLight, t, k); }
  };
}

function drawDark(cv, d) {
  var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2, k = 1;
  var R = ramps(d);
  ctx.fillStyle = '#131312'; ctx.fillRect(0, 0, W, H);
  fxField(ctx, W, H, R.fd, k * FK, DARK_BLOBS, 'lighter');
  fxDots(ctx, S, { ox: W * 0.62, oy: H * 0.70, sx: W * 0.62, sy: H * 0.74, hz: H * 0.36 }, {
    grid: GRID, rows: GROWS, cols: GCOLS, max: GMAX,
    ramp: R.em, k: k, mode: d.blend === 'lighter' ? 'lighter' : 'source-over',
    stepR: 1, stepC: 1, jitter: 0.4,
    web: 0.13, webStep: 8,
    aLo: 0.07, aHi: 0.72, rLo: 0.35, rHi: 3.0, floor: 0.02
  });
  fxGrain(ctx, W, H, GRAIN_DARK, 7, GRAIN_SCALE);
}

function drawLight(cv, d) {
  var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, S = 2, k = 1;
  var R = ramps(d);
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
  fxField(ctx, W, H, R.ik, k * 1.5, LIGHT_BLOBS, 'multiply');

  /* The exhibit, as dust plus one hairline. Colour runs with height, which is
     what the reference chart does: the cool end sits on top of the warm. */
  var x0 = W * 0.10, w = W * 0.80, base = H * 0.80, h = H * 0.54;
  var peak = 0; for (var i = 0; i < ALL.length; i++) if (ALL[i] > peak) peak = ALL[i];
  fxCloud(ctx, ALL, x0, base, w, h, peak, {
    n: 16000, seed: 5, ramp: R.ik, k: k * 1.5, t0: 0.28, t1: 1.0, soft: 0.16,
    aLo: 0.04, aHi: 0.26, rad: 1.35, mode: 'multiply'
  });
  ctx.strokeStyle = 'rgba(19,19,18,0.70)'; ctx.lineWidth = 1 * S;
  kdePath(ctx, ALL, x0, base, w, h, peak, false); ctx.stroke();
  ctx.strokeStyle = 'rgba(19,19,18,0.30)'; ctx.lineWidth = 1 * S;
  ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0 + w, base); ctx.stroke();

  fxGrain(ctx, W, H, GRAIN_LIGHT, 9, GRAIN_SCALE);
}
