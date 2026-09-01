/* Subjects: recognisable things, painted as ordinary shapes.

   Each one is a function that paints greys onto a canvas, where white is full
   dot density and black is none. fxMaskFrom turns it into a density field and
   fxStipple draws it. That is the whole pipeline, and it is the reason a new
   subject is an hour rather than a rewrite: a wordmark, a traced skyline, a
   silhouette off a photograph all enter the same way.

   Two rules that decide whether a subject reads:

   SILHOUETTE FIRST. The outline has to be legible before any detail is added.
   If the shape is not recognisable as a flat black cut-out it will not become
   recognisable once it is made of dots.

   DETAIL AS TONE, NOT AS LINE. A stipple cannot draw a one-pixel line. Panel
   gaps, window grids and structure are painted as areas of DIFFERENT GREY,
   which the stipple turns into changes of density. Anything drawn thinner
   than the dot pitch disappears.

   The tone ladder, used throughout: 1.0 solid, 0.85 primary face, 0.65
   secondary, 0.43 recessed, 0.23 ghosted, 0 ground. Keeping to a fixed ladder
   is what makes separate subjects look like one family, and it is why a new
   subject slots in without retuning. */

/* Tones. Raised from the first pass, where a recessed face sat at 0.34 and
   came out as scattered noise rather than as a surface. For a subject that
   has to be RECOGNISED the gap between object and not-object has to be large:
   the ground is zero, and the quietest part of the object is still well above
   half. */
var SUB_SOLID = '#FFFFFF', SUB_FACE = '#D9D9D9', SUB_SIDE = '#A6A6A6',
    SUB_RECESS = '#6E6E6E', SUB_GHOST = '#3A3A3A';

function subRect(g, x, y, w, h, fill) {
  g.fillStyle = fill;
  g.fillRect(x, y, w, h);
}

function subPoly(g, pts, fill) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(pts[0], pts[1]);
  for (var i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
  g.closePath();
  g.fill();
}

/* A strut. Drawn as a filled quad rather than a stroke, because a stroke thin
   enough to look like structure is thinner than the dot pitch and vanishes. */
function subBar(g, x1, y1, x2, y2, t, fill) {
  var dx = x2 - x1, dy = y2 - y1, L = Math.sqrt(dx * dx + dy * dy) || 1;
  var nx = -dy / L * t * 0.5, ny = dx / L * t * 0.5;
  subPoly(g, [x1 + nx, y1 + ny, x2 + nx, y2 + ny, x2 - nx, y2 - ny, x1 - nx, y1 - ny], fill);
}

/* ------------------------------------------------------------ data centres */
/* A row of racks in elevation. Racks read because of the rhythm of units and
   the column of lights, not because of the box. */
function subjServers(g, W, H) {
  var n = 6, gap = W * 0.016, m = W * 0.075;
  var rw = (W - m * 2 - gap * (n - 1)) / n;
  var top = H * 0.16, rh = H * 0.66;

  subRect(g, m - W * 0.03, top + rh, W - m * 2 + W * 0.06, H * 0.018, SUB_SIDE);

  for (var i = 0; i < n; i++) {
    var x = m + i * (rw + gap);
    subRect(g, x, top, rw, rh, SUB_FACE);
    subRect(g, x, top, rw, H * 0.022, SUB_SOLID);

    /* Units. The gap between them is the drawing. */
    var uh = rh / 13;
    for (var u = 1; u < 13; u++) {
      var uy = top + u * uh;
      var lit = ((i * 7 + u * 13) % 4) !== 0;
      subRect(g, x + rw * 0.06, uy + uh * 0.16, rw * 0.88, uh * 0.62, lit ? SUB_SOLID : SUB_RECESS);
      if (lit) {
        subRect(g, x + rw * 0.10, uy + uh * 0.30, rw * 0.07, uh * 0.34, SUB_GHOST);
        subRect(g, x + rw * 0.22, uy + uh * 0.30, rw * 0.05, uh * 0.34, SUB_GHOST);
      }
    }
    subRect(g, x, top + rh - H * 0.03, rw, H * 0.03, SUB_SIDE);
  }

  /* Cable tray overhead, so the row sits in a room. */
  subRect(g, m - W * 0.05, top - H * 0.055, W - m * 2 + W * 0.10, H * 0.014, SUB_SIDE);
  for (var t = 0; t < 26; t++) {
    var tx = m - W * 0.05 + t * ((W - m * 2 + W * 0.10) / 26);
    subRect(g, tx, top - H * 0.055, W * 0.004, H * 0.055, SUB_RECESS);
  }
}

/* ------------------------------------------------------------- port / trade */
/* A gantry crane over a stack of containers. The crane is the silhouette that
   makes it a port rather than a warehouse. */
function subjPort(g, W, H) {
  var base = H * 0.80;

  /* Container stacks, back row lighter so the yard has depth. */
  var bw = W * 0.052, bh = H * 0.042;
  for (var r = 0; r < 5; r++) {
    for (var c = 0; c < 13; c++) {
      var hgt = [3, 5, 4, 5, 2, 4, 5, 3, 4, 2, 5, 3, 4][c];
      if (r >= hgt) continue;
      var x = W * 0.055 + c * (bw + W * 0.008);
      var y = base - (r + 1) * (bh + H * 0.006);
      var tone = r === hgt - 1 ? SUB_SOLID : (c % 3 === 0 ? SUB_FACE : SUB_SIDE);
      subRect(g, x, y, bw, bh, tone);
      subRect(g, x + bw * 0.46, y, bw * 0.04, bh, SUB_GHOST);
    }
  }

  subRect(g, 0, base, W, H * 0.016, SUB_SIDE);

  /* The crane. Portal legs, a boom out over the water, a trolley on it. */
  var lx = W * 0.60, rx = W * 0.86, topY = H * 0.20, legT = W * 0.016;
  subBar(g, lx, topY, lx, base, legT, SUB_SOLID);
  subBar(g, rx, topY, rx, base, legT, SUB_SOLID);
  subBar(g, lx - W * 0.012, topY, rx + W * 0.012, topY, W * 0.020, SUB_SOLID);
  subBar(g, lx, base - H * 0.16, rx, base - H * 0.16, W * 0.010, SUB_FACE);
  subBar(g, lx, topY, rx, base - H * 0.16, W * 0.007, SUB_SIDE);
  subBar(g, rx, topY, lx, base - H * 0.16, W * 0.007, SUB_SIDE);

  /* Boom, reaching left over the yard, with its stay cables. */
  var bx = W * 0.10;
  subBar(g, lx, topY - H * 0.03, bx, topY - H * 0.03, W * 0.014, SUB_SOLID);
  subBar(g, rx, topY - H * 0.12, lx, topY - H * 0.03, W * 0.007, SUB_FACE);
  subBar(g, rx, topY - H * 0.12, bx + W * 0.10, topY - H * 0.03, W * 0.006, SUB_SIDE);
  subBar(g, rx, topY, rx, topY - H * 0.12, W * 0.012, SUB_SOLID);

  /* Trolley and its load, mid lift. */
  var tx2 = W * 0.30;
  subRect(g, tx2 - W * 0.022, topY - H * 0.045, W * 0.044, H * 0.030, SUB_SOLID);
  subBar(g, tx2, topY - H * 0.015, tx2, base - H * 0.20, W * 0.004, SUB_RECESS);
  subRect(g, tx2 - bw * 0.5, base - H * 0.24, bw, bh, SUB_SOLID);
}

/* ------------------------------------------------------------------ a city */
/* A skyline. Distinct crowns are what make one city not another: a mast, a
   set of setbacks, a taper, a drum. Swap the profile array for a real one and
   the same pipeline draws that city. */
function subjCity(g, W, H) {
  var base = H * 0.86;
  var T = [
    [0.045, 0.150, 0.30, 'flat'], [0.100, 0.110, 0.46, 'flat'],
    [0.150, 0.130, 0.62, 'step'], [0.212, 0.095, 0.40, 'flat'],
    [0.262, 0.140, 0.78, 'mast'], [0.330, 0.105, 0.52, 'flat'],
    [0.382, 0.120, 0.66, 'slope'], [0.448, 0.090, 0.44, 'flat'],
    [0.496, 0.135, 0.92, 'taper'], [0.570, 0.100, 0.58, 'flat'],
    [0.620, 0.125, 0.72, 'step'], [0.688, 0.085, 0.38, 'flat'],
    [0.734, 0.115, 0.60, 'drum'], [0.796, 0.130, 0.50, 'flat'],
    [0.862, 0.095, 0.34, 'flat']
  ];
  for (var i = 0; i < T.length; i++) {
    var x = T[i][0] * W, w = T[i][1] * W, h = T[i][2] * (H * 0.62);
    var y = base - h;
    var tone = i % 3 === 0 ? SUB_FACE : (i % 3 === 1 ? SUB_SIDE : SUB_RECESS);
    subRect(g, x, y, w, h, tone);

    /* Windows as tone, never as line. */
    var cols = Math.max(2, Math.round(w / (W * 0.026)));
    var rows = Math.max(3, Math.round(h / (H * 0.046)));
    for (var cc = 0; cc < cols; cc++) {
      for (var rr = 0; rr < rows; rr++) {
        if (((cc * 5 + rr * 3 + i) % 4) === 0) continue;
        subRect(g, x + (cc + 0.22) * (w / cols), y + (rr + 0.25) * (h / rows),
          (w / cols) * 0.56, (h / rows) * 0.5, SUB_SOLID);
      }
    }

    var k = T[i][3];
    if (k === 'mast') {
      subRect(g, x + w * 0.42, y - h * 0.34, w * 0.16, h * 0.34, SUB_SOLID);
      subRect(g, x + w * 0.47, y - h * 0.46, w * 0.06, h * 0.13, SUB_SOLID);
    } else if (k === 'taper') {
      subPoly(g, [x, y, x + w, y, x + w * 0.62, y - h * 0.24, x + w * 0.38, y - h * 0.24], SUB_SOLID);
      subRect(g, x + w * 0.46, y - h * 0.40, w * 0.08, h * 0.17, SUB_SOLID);
    } else if (k === 'step') {
      subRect(g, x + w * 0.16, y - h * 0.12, w * 0.68, h * 0.12, SUB_FACE);
      subRect(g, x + w * 0.32, y - h * 0.20, w * 0.36, h * 0.09, SUB_FACE);
    } else if (k === 'slope') {
      subPoly(g, [x, y, x + w, y - h * 0.20, x + w, y, x, y], SUB_SOLID);
    } else if (k === 'drum') {
      g.fillStyle = SUB_SOLID;
      g.beginPath();
      g.arc(x + w * 0.5, y, w * 0.5, Math.PI, 0);
      g.fill();
    }
  }
  subRect(g, 0, base, W, H * 0.012, SUB_SIDE);
}

/* ----------------------------------------------------------------- energy */
/* Turbines. The most legible silhouette in the set: three blades and a tower
   and nothing else needed. */
function subjEnergy(g, W, H) {
  var base = H * 0.86;
  var T = [[0.24, 1.00], [0.53, 0.78], [0.76, 0.58]];
  for (var i = 0; i < T.length; i++) {
    var cx = T[i][0] * W, s = T[i][1];
    var th = H * 0.56 * s, tw = W * 0.016 * s;
    var hubY = base - th;
    subPoly(g, [cx - tw * 1.5, base, cx + tw * 1.5, base, cx + tw * 0.55, hubY, cx - tw * 0.55, hubY],
      i === 0 ? SUB_SOLID : SUB_FACE);
    var R = W * 0.145 * s, rot = i * 0.7;
    for (var b = 0; b < 3; b++) {
      var a = rot + b * 2.0944;
      var ex = cx + Math.cos(a) * R, ey = hubY + Math.sin(a) * R;
      subPoly(g, [
        cx + Math.cos(a + 1.5708) * tw * 0.9, hubY + Math.sin(a + 1.5708) * tw * 0.9,
        ex + Math.cos(a + 1.5708) * tw * 0.18, ey + Math.sin(a + 1.5708) * tw * 0.18,
        ex, ey,
        cx + Math.cos(a - 1.5708) * tw * 0.9, hubY + Math.sin(a - 1.5708) * tw * 0.9
      ], i === 0 ? SUB_SOLID : SUB_FACE);
    }
    g.fillStyle = SUB_SOLID;
    g.beginPath();
    g.arc(cx, hubY, tw * 1.25, 0, 6.283185);
    g.fill();
  }
  subRect(g, 0, base, W, H * 0.010, SUB_SIDE);
}

/* ----------------------------------------------------------------- a mark */
/* The Eleven One mark, at scale. Proof of the logo case: a wordmark or a
   client mark enters exactly here, as a path on a canvas. */
function subjMark(g, W, H) {
  var C = [
    [92.07, 8.73, 6.45], [20.08, 9.38, 1.31], [36.97, 20.30, 3.72],
    [69.93, 28.25, 6.45], [22.23, 40.54, 3.72], [49.76, 49.61, 6.45],
    [79.01, 57.74, 9.39], [28.24, 70.00, 6.45], [57.76, 78.98, 9.39],
    [86.74, 86.74, 11.00], [7.51, 92.28, 6.45]
  ];
  var s = Math.min(W, H) * 0.0084, ox = W * 0.5 - s * 50, oy = H * 0.5 - s * 50;
  for (var i = 0; i < C.length; i++) {
    g.fillStyle = SUB_SOLID;
    g.beginPath();
    g.arc(ox + C[i][0] * s, oy + C[i][1] * s, C[i][2] * s, 0, 6.283185);
    g.fill();
    /* A halo at low tone, so the marks sit in a field rather than float. */
    g.fillStyle = SUB_GHOST;
    g.beginPath();
    g.arc(ox + C[i][0] * s, oy + C[i][1] * s, C[i][2] * s * 2.1, 0, 6.283185);
    g.fill();
    g.fillStyle = SUB_SOLID;
    g.beginPath();
    g.arc(ox + C[i][0] * s, oy + C[i][1] * s, C[i][2] * s, 0, 6.283185);
    g.fill();
  }
}

var SUBJECTS = [subjServers, subjPort, subjCity, subjEnergy, subjMark];
