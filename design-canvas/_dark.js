/* The emission ramp, for a dark ground.

   Composition-wise this is F: light on black. What it adds is hue, on the
   one principle that survives on an emissive ground. Real emission gets
   hotter as it gets brighter, so the ramp runs cool and dim at low density
   to warm and bright at high, and lightness rises the whole way. That means
   brightness alone still carries the quantity and the hue is a second,
   redundant channel rather than the only one. Turn the chroma to zero and
   you are back at F with nothing lost but the warmth. */

function lchToLab(L, C, H) {
  var h = H * Math.PI / 180;
  return [L, C * Math.cos(h), C * Math.sin(h)];
}
function labToRgb(L, a, b) {
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

/* Four anchors, cool and dark to warm and bright. Lightness is strictly
   increasing, so the ramp is a valid sequential scale and prints. */
var EM = [
  [0.22, 0.105, 295],
  [0.45, 0.125, 258],
  [0.68, 0.110, 215],
  [0.97, 0.045, 92]
];

function emit(t, k) {
  var C = (k == null ? 1 : k);
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  var seg = t * (EM.length - 1);
  var i = Math.min(Math.floor(seg), EM.length - 2);
  var f = seg - i;
  var A = lchToLab(EM[i][0], EM[i][1] * C, EM[i][2]);
  var B = lchToLab(EM[i + 1][0], EM[i + 1][1] * C, EM[i + 1][2]);
  return labToRgb(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f);
}
function ems(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
function ema(a, o) { return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + o + ')'; }

/* Isometric projection shared by every object on this page, so four
   different constructions of the same surface sit in one space. */
function isoPoint(u, v, h, o) {
  var a = (u - 0.5) * o.sx, b = (v - 0.5) * o.sy;
  return [
    o.ox + (a - b) * 0.8660254,
    o.oy + (a + b) * 0.5 - h * o.hz
  ];
}

/* Bilinear read of the density grid in normalised coordinates. */
function gridAt(u, v) {
  var x = u * (GCOLS - 1), y = v * (GROWS - 1);
  var x0 = Math.floor(x), y0 = Math.floor(y);
  var x1 = Math.min(x0 + 1, GCOLS - 1), y1 = Math.min(y0 + 1, GROWS - 1);
  var fx = x - x0, fy = y - y0;
  var a = GRID[y0][x0], b = GRID[y0][x1], c = GRID[y1][x0], d = GRID[y1][x1];
  return (a * (1 - fx) + b * fx) * (1 - fy) + (c * (1 - fx) + d * fx) * fy;
}

var GMAX = (function () {
  var m = 0;
  for (var r = 0; r < GRID.length; r++) for (var c = 0; c < GRID[r].length; c++) if (GRID[r][c] > m) m = GRID[r][c];
  return m;
})();
