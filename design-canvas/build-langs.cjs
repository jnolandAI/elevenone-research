/* Three design languages, four pages each.

   A language here is not a palette. It is one organizing idea that decides
   the cover, the section break, the reading page and the exhibit, including
   what a chart is allowed to look like. The three ideas are:

     STACK       everything is a sheet at a depth
     TERRAIN     everything is a surface with elevation
     INSTRUMENT  everything is a measured construction

   All three use the same type, the same greyscale spine, the same data and
   the same two ramps. What differs is the idea, and the idea is what you are
   actually choosing between. */
const fs = require('fs');

const LANGJS = fs.readFileSync('_lang.js', 'utf8');
const GRIDJS = fs.readFileSync('grid.js', 'utf8');
const KDEJS = fs.readFileSync('kde.js', 'utf8');

const MARK_MICRO = '<circle cx="92.07" cy="8.73" r="6.45"/><circle cx="20.08" cy="9.38" r="1.31"/><circle cx="36.97" cy="20.30" r="3.72"/><circle cx="69.93" cy="28.25" r="6.45"/><circle cx="22.23" cy="40.54" r="3.72"/><circle cx="49.76" cy="49.61" r="6.45"/><circle cx="79.01" cy="57.74" r="9.39"/><circle cx="28.24" cy="70.00" r="6.45"/><circle cx="57.76" cy="78.98" r="9.39"/><circle cx="86.74" cy="86.74" r="11.00"/><circle cx="7.51" cy="92.28" r="6.45"/>';

const NOISE = "url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E&quot;)";

const FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&amp;family=Martian+Mono:wght@200..600&amp;display=swap">';

/* Real cohort figures, from the brief's own restsOn line. p10 to p90 spread
   in points: this is the series the monotonic claim actually rests on. */
const SPREAD = [72.2, 67.9, 60.1, 59.1, 55.4, 52.7];
const MEDIANS = [40.8, 35.8, 44.1, 39.8, 36.6, 29.2];
const LABELS = ['Under $30m', '$30m to $150m', '$150m to $600m', '$600m to $2.5bn', '$2.5bn to $10bn', 'Over $10bn'];
const COUNTS = [607, 339, 360, 427, 302, 151];

// ---------------------------------------------------------------- languages

const LANGS = {
  Stack: {
    key: 'Stack',
    name: 'Stack',
    idea: 'Everything is a sheet at a depth.',
    iso: 'var O = { ox: 1520, oy: 880, sx: 1180, sy: 520, hz: 400 };',
    chroma: 0.85,
    section: { n: '02', title: 'The spread swamps the middle' }
  },
  Terrain: {
    key: 'Terrain',
    name: 'Terrain',
    idea: 'Everything is a surface with elevation.',
    iso: 'var O = { ox: 1500, oy: 900, sx: 1280, sy: 820, hz: 400 };',
    chroma: 0.95,
    section: { n: '02', title: 'The spread swamps the middle' }
  },
  Instrument: {
    key: 'Instrument',
    name: 'Instrument',
    idea: 'Everything is a measured construction.',
    iso: 'var O = { ox: 1500, oy: 900, sx: 1280, sy: 820, hz: 400 };',
    chroma: 0.35,
    section: { n: '02', title: 'The spread swamps the middle' }
  }
};

// ------------------------------------------------------------- cover drawing

const COVER_DRAW = {
  Stack: `
    var LN = KDE.length, li, lc, lr;
    var peakK = maxOf(KDE);
    for (li = 0; li < LN; li++) {
      var lift = 0.05 + li * 0.18;
      var tCol = li / (LN - 1);
      ctx.globalCompositeOperation = 'source-over';
      var corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
      ctx.beginPath();
      for (lr = 0; lr < 4; lr++) {
        var cp = isoPoint(corners[lr][0], corners[lr][1], lift, O);
        if (lr === 0) ctx.moveTo(cp[0], cp[1]); else ctx.lineTo(cp[0], cp[1]);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(emit(0.10 + tCol * 0.28, k), 0.10);
      ctx.fill();
      ctx.strokeStyle = rgba(emit(0.35 + tCol * 0.40, k), 0.32);
      ctx.lineWidth = 1 * S; ctx.stroke();
      ctx.globalCompositeOperation = 'lighter';
      for (lc = 0; lc <= 76; lc++) {
        var u = lc / 76;
        var dens = sampleAt(KDE[li], u) / peakK;
        if (dens <= 0.02) continue;
        for (lr = 0; lr <= 12; lr++) {
          var v = lr / 12;
          var jit = 0.5 + 0.5 * Math.cos(lc * 1.7 + lr * 2.3);
          var amp = dens * (0.55 + 0.45 * jit);
          var pp = isoPoint(u, v, lift, O);
          ctx.fillStyle = rgbs(emit(0.30 + 0.62 * amp, k));
          ctx.globalAlpha = 0.22 + 0.58 * amp;
          ctx.beginPath(); ctx.arc(pp[0], pp[1], (0.7 + 3.4 * Math.pow(amp, 1.2)) * S, 0, 6.283185); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }`,

  Terrain: `
    ctx.globalCompositeOperation = 'source-over';
    var STEP2 = 2, rr, cc;
    for (rr = 0; rr < GROWS; rr += STEP2) {
      var v = rr / (GROWS - 1);
      var pts = [], hmax = 0;
      for (cc = 0; cc < GCOLS; cc++) {
        var hgt = GRID[rr][cc] / GMAX;
        if (hgt > hmax) hmax = hgt;
        pts.push(isoPoint(cc / (GCOLS - 1), v, hgt, O));
      }
      var b0 = isoPoint(0, v, 0, O), b1 = isoPoint(1, v, 0, O);
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (cc = 1; cc < pts.length; cc++) ctx.lineTo(pts[cc][0], pts[cc][1]);
      ctx.lineTo(b1[0], b1[1] + 900); ctx.lineTo(b0[0], b0[1] + 900); ctx.closePath();
      var grd = ctx.createLinearGradient(0, isoPoint(0, v, 1, O)[1], 0, b0[1]);
      grd.addColorStop(0, rgba(emit(0.55, k), 0.30));
      grd.addColorStop(1, '#131312');
      ctx.fillStyle = grd; ctx.fill();
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (cc = 1; cc < pts.length; cc++) ctx.lineTo(pts[cc][0], pts[cc][1]);
      ctx.strokeStyle = rgba(emit(0.22 + 0.75 * hmax, k), 0.55 + 0.40 * hmax);
      ctx.lineWidth = (0.7 + 1.5 * hmax) * S; ctx.stroke();
    }`,

  Instrument: `
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    var STEP = 4, r, c, i;
    for (r = 0; r < GROWS; r += STEP) {
      for (c = 0; c < GCOLS - 1; c++) {
        var h0 = GRID[r][c] / GMAX, h1 = GRID[r][c + 1] / GMAX;
        var a = isoPoint(c / (GCOLS - 1), r / (GROWS - 1), h0, O);
        var b = isoPoint((c + 1) / (GCOLS - 1), r / (GROWS - 1), h1, O);
        var hm = (h0 + h1) / 2;
        ctx.strokeStyle = rgba(emit(hm, k), 0.18 + 0.62 * Math.pow(hm, 0.7));
        ctx.lineWidth = (0.6 + 1.5 * hm) * S;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      }
    }
    for (var c2 = 0; c2 < GCOLS; c2 += STEP) {
      for (var r2 = 0; r2 < GROWS - 1; r2++) {
        var g0 = GRID[r2][c2] / GMAX, g1 = GRID[r2 + 1][c2] / GMAX;
        var a2 = isoPoint(c2 / (GCOLS - 1), r2 / (GROWS - 1), g0, O);
        var b2 = isoPoint(c2 / (GCOLS - 1), (r2 + 1) / (GROWS - 1), g1, O);
        var hm2 = (g0 + g1) / 2;
        ctx.strokeStyle = rgba(emit(hm2, k), 0.14 + 0.52 * Math.pow(hm2, 0.7));
        ctx.lineWidth = (0.5 + 1.2 * hm2) * S;
        ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    var marks = [{ p: GPEAK, l: '01', t: '$1.44bn  27.8%' }, { p: GRIDGE, l: '02', t: '$654m  70.1%' }];
    for (i = 0; i < marks.length; i++) {
      var mk = marks[i];
      var hh = GRID[mk.p.row][mk.p.col] / GMAX;
      var top = isoPoint(mk.p.col / (GCOLS - 1), mk.p.row / (GROWS - 1), hh, O);
      var foot = isoPoint(mk.p.col / (GCOLS - 1), mk.p.row / (GROWS - 1), 0, O);
      ctx.strokeStyle = 'rgba(244,244,243,0.40)';
      ctx.lineWidth = 1 * S;
      ctx.setLineDash([4 * S, 5 * S]);
      ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(top[0], top[1] - 30 * S); ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(244,244,243,0.55)';
      ctx.beginPath(); ctx.moveTo(top[0], top[1] - 30 * S); ctx.lineTo(top[0] + 92 * S, top[1] - 30 * S); ctx.stroke();
      ctx.fillStyle = '#FFF5D4';
      ctx.beginPath(); ctx.arc(top[0], top[1], 3.4 * S, 0, 6.283185); ctx.fill();
      ctx.fillStyle = 'rgba(244,244,243,0.9)';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.fillText(mk.l, top[0] + 100 * S, top[1] - 34 * S);
      ctx.fillStyle = 'rgba(174,174,172,0.9)';
      ctx.fillText(mk.t, top[0] + 100 * S, top[1] - 18 * S);
    }`
};

// ----------------------------------------------------------- section drawing

const SECTION_DRAW = {
  Stack: `
    /* One sheet, tilted into view. The section marker is which sheet you are on. */
    var li, lr;
    for (li = 0; li < 6; li++) {
      var lift = 0.06 + li * 0.15;
      var on = (li === 3);
      var corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
      ctx.beginPath();
      for (lr = 0; lr < 4; lr++) {
        var cp = isoPoint(corners[lr][0], corners[lr][1], lift, O);
        if (lr === 0) ctx.moveTo(cp[0], cp[1]); else ctx.lineTo(cp[0], cp[1]);
      }
      ctx.closePath();
      ctx.fillStyle = rgba(emit(on ? 0.55 : 0.16, k), on ? 0.20 : 0.05);
      ctx.fill();
      ctx.strokeStyle = rgba(emit(on ? 0.80 : 0.30, k), on ? 0.75 : 0.16);
      ctx.lineWidth = (on ? 1.6 : 1) * S;
      ctx.stroke();
    }`,

  Terrain: `
    /* Contour bands only: the surface reduced to where it crosses six levels. */
    var lv, rr, cc;
    for (lv = 1; lv <= 6; lv++) {
      var level = lv / 7;
      ctx.strokeStyle = rgba(emit(0.15 + level * 0.8, k), 0.20 + 0.5 * level);
      ctx.lineWidth = (0.7 + level * 1.4) * S;
      for (rr = 0; rr < GROWS - 1; rr++) {
        var run = null;
        for (cc = 0; cc < GCOLS; cc++) {
          var above = (GRID[rr][cc] / GMAX) >= level;
          if (above && run === null) run = cc;
          if ((!above || cc === GCOLS - 1) && run !== null) {
            var end = above ? cc : cc - 1;
            if (end > run) {
              ctx.beginPath();
              var pA = isoPoint(run / (GCOLS - 1), rr / (GROWS - 1), level, O);
              ctx.moveTo(pA[0], pA[1]);
              for (var q = run + 1; q <= end; q++) {
                var pB = isoPoint(q / (GCOLS - 1), rr / (GROWS - 1), level, O);
                ctx.lineTo(pB[0], pB[1]);
              }
              ctx.stroke();
            }
            run = null;
          }
        }
      }
    }`,

  Instrument: `
    /* A bracket and a dimensioned base plane. Nothing floats. */
    var corners = [[0, 0], [1, 0], [1, 1], [0, 1]], lr;
    ctx.beginPath();
    for (lr = 0; lr < 4; lr++) {
      var cp = isoPoint(corners[lr][0], corners[lr][1], 0, O);
      if (lr === 0) ctx.moveTo(cp[0], cp[1]); else ctx.lineTo(cp[0], cp[1]);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(174,174,172,0.35)';
    ctx.lineWidth = 1 * S; ctx.stroke();
    var STEPG = 8, gi;
    ctx.strokeStyle = 'rgba(140,140,138,0.20)';
    for (gi = 0; gi <= GCOLS; gi += STEPG) {
      var u = Math.min(gi / (GCOLS - 1), 1);
      var q0 = isoPoint(u, 0, 0, O), q1 = isoPoint(u, 1, 0, O);
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
    }
    for (gi = 0; gi <= GROWS; gi += STEPG) {
      var v2 = Math.min(gi / (GROWS - 1), 1);
      var w0 = isoPoint(0, v2, 0, O), w1 = isoPoint(1, v2, 0, O);
      ctx.beginPath(); ctx.moveTo(w0[0], w0[1]); ctx.lineTo(w1[0], w1[1]); ctx.stroke();
    }
    var hh = GRID[GPEAK.row][GPEAK.col] / GMAX;
    var tp = isoPoint(GPEAK.col / (GCOLS - 1), GPEAK.row / (GROWS - 1), hh, O);
    var ft = isoPoint(GPEAK.col / (GCOLS - 1), GPEAK.row / (GROWS - 1), 0, O);
    ctx.strokeStyle = 'rgba(244,244,243,0.5)';
    ctx.setLineDash([4 * S, 5 * S]);
    ctx.beginPath(); ctx.moveTo(ft[0], ft[1]); ctx.lineTo(tp[0], tp[1]); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#FFF5D4';
    ctx.beginPath(); ctx.arc(tp[0], tp[1], 4 * S, 0, 6.283185); ctx.fill();`
};

// ----------------------------------------------------------- exhibit drawing
// Same subject in all three, so what differs is only the idiom.

/* Exhibit coordinates are absolute canvas pixels on a fixed 2320 by 900
   canvas (1160 by 450 CSS at 2x), not multiples of S. Writing them as
   multiples of a CSS scale is what put the first version 900px wider than
   the frame it had to sit in. Fonts stay in CSS px times S. */
const EXHIBIT_DRAW = {
  Stack: `
    /* Six cohorts as six sheets seen in depth, near to far. The claim is that
       the sheets get narrower going back while their centres wander. */
    var peak = maxOf(KDE), i, j;
    var x0 = 300, w = 1500, base0 = 700, dz = 74, dx = 46, hgt = 210;
    for (i = KDE.length - 1; i >= 0; i--) {
      var bx = x0 + i * dx, by = base0 - i * dz;
      var t = i / (KDE.length - 1);
      var col = ink(0.18 + t * 0.74, k);

      ctx.strokeStyle = GREY.g30; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(bx, by + 1); ctx.lineTo(bx + w, by + 1); ctx.stroke();

      kdePath(ctx, KDE[i], bx, by, w, hgt, peak, true);
      ctx.fillStyle = rgba(col, 0.16); ctx.fill();
      kdePath(ctx, KDE[i], bx, by, w, hgt, peak, false);
      ctx.strokeStyle = rgbs(col); ctx.lineWidth = 1.6 * S; ctx.stroke();

      ctx.fillStyle = GREY.g80;
      ctx.font = (12 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], bx - 14, by - 2);
      ctx.fillStyle = GREY.g60;
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.fillText(SPREAD[i].toFixed(1) + ' pts', bx - 14, by + 16);
      ctx.textAlign = 'left';

      var mp = bx + (MEDIANS[i] / 100) * w;
      ctx.fillStyle = GREY.ink;
      ctx.beginPath(); ctx.arc(mp, by, 6, 0, 6.283185); ctx.fill();
    }
    axisX(ctx, x0, base0 + 34, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });`,

  Terrain: `
    /* The same six as ridgelines, front to back, each filled with the page so
       the nearer ones occlude the farther. A landscape read edge on. */
    var peak = maxOf(KDE), i;
    var x0 = 380, w = 1500, base0 = 700, dz = 66, hgt = 250;
    for (i = KDE.length - 1; i >= 0; i--) {
      var by = base0 - i * dz;
      var t = i / (KDE.length - 1);
      var col = ink(0.14 + t * 0.78, k);

      kdePath(ctx, KDE[i], x0, by, w, hgt, peak, true);
      var g = ctx.createLinearGradient(0, by - hgt, 0, by);
      g.addColorStop(0, rgba(col, 0.30));
      g.addColorStop(1, GREY.g10);
      ctx.fillStyle = g; ctx.fill();

      kdePath(ctx, KDE[i], x0, by, w, hgt, peak, false);
      ctx.strokeStyle = rgbs(col); ctx.lineWidth = 1.8 * S; ctx.stroke();

      ctx.fillStyle = GREY.g80;
      ctx.font = (12 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], x0 - 16, by - 3);
      ctx.fillStyle = GREY.g60;
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.fillText(SPREAD[i].toFixed(1) + ' pts', x0 - 16, by + 15);
      ctx.textAlign = 'left';

      var mp = x0 + (MEDIANS[i] / 100) * w;
      ctx.fillStyle = GREY.ink;
      ctx.beginPath(); ctx.arc(mp, by, 6, 0, 6.283185); ctx.fill();
    }
    axisX(ctx, x0, base0 + 34, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });`,

  Instrument: `
    /* Flat, overlaid, and dimensioned. The bracket on the right measures the
       thing the title claims: the spread, shrinking down the stack. */
    var peak = maxOf(KDE), i;
    var x0 = 300, w = 1400, base = 620, hgt = 400;

    for (i = 0; i < KDE.length; i++) {
      var t = i / (KDE.length - 1);
      var col = ink(0.16 + t * 0.76, k);
      kdePath(ctx, KDE[i], x0, base, w, hgt, peak, false);
      ctx.strokeStyle = rgba(col, 0.92); ctx.lineWidth = 3; ctx.stroke();
    }
    axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });

    /* Dimension bracket: p10 to p90 spread per cohort, drawn as a measured bar. */
    var bx = x0 + w + 54, bw = 190;
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    for (i = 0; i < KDE.length; i++) {
      var yy = 150 + i * 66;
      var t2 = i / (KDE.length - 1);
      var frac = (SPREAD[i] - 45) / 30;
      ctx.strokeStyle = GREY.g40; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(bx, yy - 9); ctx.lineTo(bx, yy + 9); ctx.stroke();
      ctx.strokeStyle = rgbs(ink(0.16 + t2 * 0.76, k)); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(bx, yy); ctx.lineTo(bx + bw * frac, yy); ctx.stroke();
      ctx.strokeStyle = GREY.g40; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(bx + bw * frac, yy - 9); ctx.lineTo(bx + bw * frac, yy + 9); ctx.stroke();
      ctx.fillStyle = GREY.g80;
      ctx.fillText(SPREAD[i].toFixed(1), bx + bw * frac + 12, yy + 5);
      ctx.fillStyle = GREY.g60;
      ctx.font = (10 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], bx - 12, yy + 5);
      ctx.textAlign = 'left';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    }
    ctx.fillStyle = GREY.g60;
    ctx.fillText('p10 to p90, points', bx, 110);`
};

module.exports = { LANGS, COVER_DRAW, SECTION_DRAW, EXHIBIT_DRAW, LANGJS, GRIDJS, KDEJS, MARK_MICRO, NOISE, FONTS, SPREAD, MEDIANS, LABELS, COUNTS };
