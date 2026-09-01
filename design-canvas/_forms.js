/* The eight abstract forms, as density fields.

   A form is a function of (u, v) in 0..1 returning density. fxStipple throws
   candidates at the frame and keeps each with probability equal to the field,
   so tone comes from how many marks land rather than from how big they are,
   and a form can thin to nothing at an edge.

   Nothing here is derived from any dataset and none of it should be read as
   if it were. Forms carry the IDEA of a piece; data belongs on a figure.

   Lifted out of build-stipple.cjs unchanged, because the applied boards need
   the same eight and two copies of a density field is two places a value can
   be wrong.

   Index order is FORM_ID below, so a board can ask for a form by name. */

function G(z) { return Math.exp(-z * z); }

/* A cheap value hash, so a form can be granular without a texture. Used for
   the fracturing in Erosion and the grit in Skyline: without it a dissolve is
   perfectly smooth, and a perfectly smooth dissolve looks rendered. */
function hash(x, y) {
  var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

var FORMS = [
  /* Dispersion. A head that holds, and a tail that does not. */
  function (u, v) {
    var dx = u - 0.20, dy = v - 0.5;
    var sig = 0.055 + 0.62 * Math.max(0, dx);
    return G(dy / sig) * Math.exp(-Math.max(0, dx) * 2.1) * 1.5;
  },
  /* Convergence. The same in reverse, and denser where it lands. */
  function (u, v) {
    var dx = 0.82 - u, dy = v - 0.5;
    var sig = 0.05 + 0.60 * Math.max(0, dx);
    return G(dy / sig) * (0.18 + 1.5 * Math.pow(u, 2.4));
  },
  /* Erosion. Solid above, fracturing below, with the fractures vertical
     because that is how a face falls away. */
  function (u, v) {
    if (u < 0.20 || u > 0.80) return 0;
    if (v < 0.10) return 0;
    if (v <= 0.44) return 1;
    var d = (v - 0.44) / 0.46;
    var crack = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(u * 58), 0.7);
    return (1.15 - 1.1 * Math.pow(d, 0.85)) * crack * (0.55 + 0.45 * hash(Math.floor(u * 90), Math.floor(v * 90)));
  },
  /* Confluence. Two bands that find each other. */
  function (u, v) {
    var m = 1 / (1 + Math.exp(-(u - 0.46) * 13));
    var w = 0.030 + 0.028 * (1 - m);
    var a = 0.34 + 0.16 * m, b = 0.66 - 0.16 * m;
    return (G((v - a) / w) + G((v - b) / w)) * (0.5 + 0.7 * u);
  },
  /* Threshold. A line most of the mass stops at. */
  function (u, v) {
    if (v < 0.08 || v > 0.92) return 0;
    var line = 0.54 + 0.055 * Math.sin(v * 7.2);
    if (u < line) return 0.55 + 0.55 * (u / line);
    var past = (u - line) / 0.30;
    return 0.34 * Math.exp(-past * past * 2.6);
  },
  /* Concentration. Not one blob.

     The first version was three nested gaussians on a common centre, which is
     radially symmetric and therefore inert: no direction, nothing to count,
     and no way to see that it is ABOUT concentration rather than merely
     concentrated. This is a field of cores whose weights fall off steeply,
     one dominant, a few real, a long tail of small ones, plus a thin haze
     that never quite reaches zero. That is what a concentrated market looks
     like, and it can be read: the eye counts three or four before giving up,
     which is the point being made.

     Each core is a wide skirt plus a tight spike rather than a single
     gaussian. A lone gaussian has no peak to it at stipple density; the spike
     is what makes a core read as a summit instead of a smudge. */
  function (u, v) {
    var CORES = [
      [0.42, 0.47, 0.088, 1.30], [0.67, 0.31, 0.054, 0.74], [0.29, 0.67, 0.050, 0.62],
      [0.73, 0.63, 0.034, 0.42], [0.21, 0.31, 0.030, 0.33], [0.55, 0.79, 0.026, 0.27],
      [0.84, 0.47, 0.021, 0.21], [0.37, 0.19, 0.019, 0.17], [0.63, 0.13, 0.015, 0.12],
      [0.15, 0.52, 0.014, 0.10], [0.79, 0.80, 0.012, 0.08], [0.46, 0.90, 0.011, 0.07]
    ];
    var t = 0;
    for (var i = 0; i < CORES.length; i++) {
      var c = CORES[i];
      var dx = (u - c[0]) * 1.04, dy = v - c[1];
      /* Bail before the sqrt and the two exps. Twelve cores evaluated in full
         for every candidate made this the most expensive field on the board
         by a wide margin, and beyond three sigma a core contributes nothing
         a stipple can show. */
      var lim = c[2] * 3.1;
      if (dx > lim || dx < -lim || dy > lim || dy < -lim) continue;
      var r = Math.sqrt(dx * dx + dy * dy);
      t += c[3] * (0.52 * G(r / c[2]) + 0.48 * G(r / (c[2] * 0.40)));
    }
    /* The tail. Never zero, so the frame is never empty, and thinner at the
       edges so the field still has a shape. */
    var ex = (u - 0.5) * 1.04, ey = v - 0.5;
    return t + 0.075 * G(Math.sqrt(ex * ex + ey * ey) / 0.46);
  },
  /* Skyline. Heights are made up: this is a picture of an industry, not a
     count of anything. */
  function (u, v) {
    var TOW = [0.60, 0.34, 0.72, 0.46, 0.86, 0.52, 0.30, 0.66, 0.40, 0.76, 0.28, 0.58];
    if (u < 0.06 || u > 0.94) return 0;
    var span = 0.88 / TOW.length;
    var i = Math.floor((u - 0.06) / span);
    if (i < 0 || i >= TOW.length) return 0;
    var within = ((u - 0.06) / span) - i;
    if (within < 0.08 || within > 0.92) return 0;
    var top = 0.88 - 0.62 * TOW[i];
    if (v < top || v > 0.94) return 0;
    var down = (v - top) / (0.94 - top);
    return (1.05 - 0.98 * Math.pow(down, 1.6)) * (0.6 + 0.4 * hash(Math.floor(u * 120), Math.floor(v * 120)));
  },
  /* Strata. Bands of different weight, thinning downward. */
  function (u, v) {
    if (u < 0.10 || u > 0.90) return 0;
    var BANDS = [[0.14, 0.055, 1.0], [0.27, 0.040, 0.72], [0.38, 0.070, 0.95], [0.53, 0.032, 0.55], [0.63, 0.058, 0.78], [0.76, 0.045, 0.42], [0.87, 0.030, 0.22]];
    var t = 0;
    for (var i = 0; i < BANDS.length; i++) {
      var b = BANDS[i];
      var z = (v - b[0]) / b[1];
      if (z > -2.4 && z < 2.4) t += b[2] * G(z);
    }
    var edge = Math.min(1, (u - 0.10) / 0.10) * Math.min(1, (0.90 - u) / 0.10);
    return t * (0.35 + 0.65 * edge);
  }
];

var FORM_ID = ['dispersion', 'convergence', 'erosion', 'confluence', 'threshold', 'concentration', 'skyline', 'strata'];

function formNamed(n) { return FORMS[FORM_ID.indexOf(n)]; }
