/* How much chroma is actually available at a given lightness and hue.

   The palettes were specified with chroma numbers picked by hand, around 0.11
   to 0.13, and they came out dull: the reference gradients carry roughly
   twice that at their cores. Guessing is the wrong tool, because the ceiling
   is not a constant. sRGB holds about 0.31 of chroma for a blue at lightness
   0.45 and about 0.17 for an orange at 0.72, so one number cannot be right
   for both, and anything above the ceiling is silently clamped by labToRgb
   into a flatter colour than was asked for.

   So: specify saturation as a FRACTION of what is available, and find the
   ceiling by bisection. 0.95 means as vivid as this hue gets at this
   lightness, whatever that happens to be. */

function inGamut(L, C, H) {
  const h = H * Math.PI / 180;
  const a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const eps = 1e-6;
  return r >= -eps && r <= 1 + eps && g >= -eps && g <= 1 + eps && bl >= -eps && bl <= 1 + eps;
}

function maxChroma(L, H) {
  let lo = 0, hi = 0.45;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(L, mid, H)) lo = mid; else hi = mid;
  }
  return lo;
}

/* [L, saturation as a fraction of the ceiling, H] -> [L, C, H]. Pulled a
   hair inside the boundary: colours sitting exactly on it round-trip badly
   through 8-bit sRGB and lose their hue at the edges of a soft mass. */
function expand(a) {
  return a.map(([L, sat, H]) => [L, +(maxChroma(L, H) * sat * 0.985).toFixed(4), H]);
}

module.exports = { inGamut, maxChroma, expand };
