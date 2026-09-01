/* Four hue budgets, all built the same way: anchors in OKLCH, blended through
   OKLab. Blending in Lab is what keeps a two-colour scale from turning into a
   rainbow on the way: the path runs through the desaturated middle instead of
   around the hue wheel. */

function lch2lab(L, C, H) {
  var h = H * Math.PI / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}
function lab2rgb(L, a, b) {
  var l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  var m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  var s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  var l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  var r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  var g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  var bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  function f(x) { x = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(Math.max(x, 0), 1 / 2.4) - 0.055; return Math.max(0, Math.min(1, x)); }
  return [Math.round(f(r) * 255), Math.round(f(g) * 255), Math.round(f(bl) * 255)];
}
function labLerp(A, B, t) {
  return lab2rgb(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}

/* D. SINGLE HUE. One hue, 250 degrees. Everything else is lightness and
   chroma. This is arc-x-research and the teal poster: the most disciplined
   thing that is still not greyscale. */
function rampD(t, k) {
  var C = (k == null ? 1 : k);
  return lab2rgb.apply(null, lch2lab(0.95 - 0.50 * t, (0.02 + 0.15 * t) * C, 250));
}

/* E. DIVERGING. Two anchors either side of a near-white middle. The only
   ramp here that encodes a sign: below the median reads warm, above reads
   cool, and the crossing is the median itself. The 3D density chart and the
   orange-blue gradient pack are both this. */
var E_LO = lch2lab(0.56, 0.165, 32);
var E_MID = lch2lab(0.955, 0.006, 85);
var E_HI = lch2lab(0.53, 0.155, 255);
function rampE(t, k) {
  var C = (k == null ? 1 : k);
  var lo = [E_LO[0], E_LO[1] * C, E_LO[2] * C];
  var hi = [E_HI[0], E_HI[1] * C, E_HI[2] * C];
  return t < 0.5 ? labLerp(lo, E_MID, t * 2) : labLerp(E_MID, hi, (t - 0.5) * 2);
}

/* F. ACHROMATIC. No hue at all. The Midjourney series is this: white points
   on black, and the only variable is how much light reaches you. */
function rampF(t) {
  var v = Math.round(255 * Math.pow(t, 0.75));
  return [v, v, v];
}

/* G. TWO ANCHOR. Warm cream to deep violet-blue, blended through Lab so the
   middle desaturates rather than passing through green. This is the AIUC
   mesh and the caitsdesign spheres. */
var G_A = lch2lab(0.965, 0.032, 82);
var G_B = lch2lab(0.44, 0.150, 288);
function rampG(t, k) {
  var C = (k == null ? 1 : k);
  return labLerp([G_A[0], G_A[1] * C, G_A[2] * C], [G_B[0], G_B[1] * C, G_B[2] * C], t);
}
