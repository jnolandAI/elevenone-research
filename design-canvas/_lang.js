/* Shared by all twelve language pages: colour, projection, and the chart
   primitives. Each language picks from this; none of them adds a colour or a
   geometry of its own outside it. */

function lchToLab(L, C, H) { var h = H * Math.PI / 180; return [L, C * Math.cos(h), C * Math.sin(h)]; }
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
function anchorRamp(anchors, t, k) {
  var C = (k == null ? 1 : k);
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  var seg = t * (anchors.length - 1);
  var i = Math.min(Math.floor(seg), anchors.length - 2), f = seg - i;
  var A = lchToLab(anchors[i][0], anchors[i][1] * C, anchors[i][2]);
  var B = lchToLab(anchors[i + 1][0], anchors[i + 1][1] * C, anchors[i + 1][2]);
  return labToRgb(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f);
}
/* The inverse, so a colour picked in the editor can be read back as OKLCH
   anchors. anchorRamp blends in OKLab; a hex the user picked has to arrive in
   the same space or the ramp it defines is not the ramp they chose. */
function rgbToLch(r, g, b) {
  function f(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  var R = f(r), G = f(g), B = f(b);
  var l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  var m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  var s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  var A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  var Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  var H = Math.atan2(Bb, A) * 180 / Math.PI;
  if (H < 0) H += 360;
  return { L: L, C: Math.sqrt(A * A + Bb * Bb), H: H };
}
function hexToLch(h) {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  return rgbToLch(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
}

/* The waypoint between two ramp ends.

   This is the whole job. Blending runs in OKLab, so two ends far apart in hue
   meet through the desaturated middle only if the waypoint is actually
   desaturated; left chromatic, the path takes a shortcut and picks up a hue
   nobody chose. Ends that are close need the opposite, a waypoint at full
   chroma, or the middle of a warm ramp goes muddy. So both the waypoint's
   chroma factor and how far its hue leans toward the far end follow the gap. */
function endGap(A, B) {
  var dH = ((B.H - A.H) % 360 + 540) % 360 - 180;
  var gap = Math.abs(dH);
  return {
    dH: dH,
    gap: gap,
    cf: 1.30 - 0.85 * Math.min(1, Math.max(0, (gap - 40) / 110)),
    hm: 0.5 * (1 - Math.min(1, gap / 150))
  };
}

/* The field on a DARK ground, from its two ends. Deep and cool at t=0,
   bright and warm at t=1, which is the direction an additive field runs. */
function fieldFromEnds(coolHex, warmHex, spread, balance) {
  var A = hexToLch(coolHex), B = hexToLch(warmHex), g = endGap(A, B);
  return [
    [A.L, A.C, A.H],
    [A.L + (B.L - A.L) * balance, Math.min(A.C, B.C) * g.cf, A.H + g.dH * g.hm],
    [B.L, B.C, B.H],
    [B.L + (B.L - A.L) * 0.44, B.C * 0.72, B.H + spread]
  ];
}

/* The same two ends on PAPER. Multiply is identity against white, so this one
   runs the other way: palest at t=0, deepest at t=1, more ink meaning more of
   the thing. Same hues, same waypoint rule, lightness rebuilt for a white
   ground rather than inherited from the picked colours. */
function paperFromEnds(coolHex, warmHex, spread, balance) {
  var A = hexToLch(coolHex), B = hexToLch(warmHex), g = endGap(A, B);
  /* The waypoint leans toward whichever end it sits next to, which is the
     warm one here and the cool one on dark. Leaning it cool on paper put a
     blue in the middle of the wash that neither picked colour asked for:
     the deep end is not reached until t=1 and the middle should still be
     holding the warm. */
  var mid = 0.64 - 0.09 * balance;
  return [
    [0.955, B.C * 0.42, B.H + spread],
    [0.800, B.C * 1.18, B.H],
    [mid, Math.min(A.C, B.C) * g.cf, B.H - g.dH * g.hm],
    [0.385, A.C * 1.05, A.H]
  ];
}

function rgbs(a) { return 'rgb(' + a[0] + ',' + a[1] + ',' + a[2] + ')'; }
function rgba(a, o) { return 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + o + ')'; }

/* DARK. Emission: cool and dim at low density, warm and bright at high, with
   lightness rising the whole way, so brightness alone still carries the
   quantity and chroma 0 degrades cleanly to white on black. */
var A_EMIT = [[0.22, 0.105, 295], [0.45, 0.125, 258], [0.68, 0.110, 215], [0.97, 0.045, 92]];
function emit(t, k) { return anchorRamp(A_EMIT, t, k); }

/* LIGHT. The same journey with the ends swapped, because on paper more ink
   means more of the thing. Warm and pale at low, cool and deep at high. */
var A_INK = [[0.965, 0.030, 82], [0.780, 0.075, 205], [0.560, 0.130, 250], [0.360, 0.140, 288]];
function ink(t, k) { return anchorRamp(A_INK, t, k); }

/* The greyscale spine, unchanged. */
var GREY = { w: '#FFFFFF', g05: '#FAFAF9', g10: '#F4F4F3', g20: '#EBEBEA', g30: '#DEDEDD', g40: '#C9C9C7', g50: '#AEAEAC', g60: '#8C8C8A', g70: '#6C6C6A', g80: '#4A4A48', g90: '#2B2B2A', ink: '#131312' };

function isoPoint(u, v, h, o) {
  var a = (u - 0.5) * o.sx, b = (v - 0.5) * o.sy;
  return [o.ox + (a - b) * 0.8660254, o.oy + (a + b) * 0.5 - h * o.hz];
}

function sampleAt(arr, m) {
  var p = (m + 0.05) / 1.05 * (arr.length - 1);
  if (p <= 0) return arr[0];
  if (p >= arr.length - 1) return arr[arr.length - 1];
  var i = Math.floor(p), f = p - i;
  return arr[i] * (1 - f) + arr[i + 1] * f;
}

/* Chart primitives. A hairline baseline, ticks below it, and nothing else:
   no grid, no box, no frame. Shared so three languages that draw completely
   different exhibits still agree on what an axis is. */
function axisX(ctx, x0, y, w, S, ticks, fmt, col) {
  ctx.strokeStyle = col || GREY.g30;
  ctx.lineWidth = 1 * S;
  ctx.beginPath(); ctx.moveTo(x0, y + 0.5 * S); ctx.lineTo(x0 + w, y + 0.5 * S); ctx.stroke();
  ctx.fillStyle = GREY.g60;
  ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
  ctx.textAlign = 'center';
  for (var i = 0; i < ticks.length; i++) {
    var px = x0 + ticks[i] * w;
    ctx.strokeStyle = col || GREY.g30;
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + 5 * S); ctx.stroke();
    ctx.fillText(fmt(ticks[i]), px, y + 19 * S);
  }
  ctx.textAlign = 'left';
}

function kdePath(ctx, arr, x0, base, w, h, peak, close) {
  ctx.beginPath();
  if (close) ctx.moveTo(x0, base);
  for (var i = 0; i <= 200; i++) {
    var m = i / 200;
    var px = x0 + m * w;
    var py = base - (sampleAt(arr, m) / peak) * h;
    if (i === 0 && !close) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  if (close) { ctx.lineTo(x0 + w, base); ctx.closePath(); }
}

function maxOf(rows) {
  var m = 0;
  for (var i = 0; i < rows.length; i++) for (var j = 0; j < rows[i].length; j++) if (rows[i][j] > m) m = rows[i][j];
  return m;
}
