/* Shared by the three applied generators: covers, body pages and homepages.

   Pages 5 to 7 of the canvas settle WHAT the system is. These settle what it
   looks like when it is used, which is the part still open.

   One thing varies inside each group and it is the DEVICE, not the colour.
   Which gradient goes on a piece is decided: any of the eleven, one per
   piece. How often a piece is allowed a device is not, so that is what moves.

   The gradient is therefore held constant per group. Homepages are all
   cobalt-iris. Covers and body pages are all iris-ember, and they are ONE
   piece rather than two groups: a cover and the pages behind it share a
   gradient or they are not one report.

   cobalt-ember rather than iris-ember for the report, because iris-ember
   spends seven of its nine stops inside magenta and a Hero drawn on it comes
   out one colour. A crossing with a wide arc is what makes a stipple show
   that it is made of a gradient at all.

   Two boards break the hold on purpose. AppCoverSlate runs in slate and
   AppHomeQuiet runs greyscale, because a piece that wants no colour is a
   correct outcome and it has to be visible beside the ones that do. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');

const SUBJECTS_JS = fs.readFileSync(__dirname + '/_subjects.js', 'utf8');
const FORMS_JS = fs.readFileSync(__dirname + '/_forms.js', 'utf8');

const grad = (id) => GRADIENTS.find((x) => x.id === id);
const A_PIECE = grad('cobalt-ember').anchors;
const A_SITE = grad('cobalt-iris').anchors;
const A_SLATE = grad('slate').anchors;

/* Not a gradient and deliberately not in the set. Four neutral anchors for an
   additive field on black, so a page can carry the field CONSTRUCTION with the
   colour turned off. slate is the quietest member of the set and it still
   carries chroma; this carries none. It exists because a band left as flat
   black reads as a failed render rather than as a decision. */
const A_GREY = [[0.17, 0, 0], [0.25, 0, 0], [0.35, 0, 0], [0.47, 0, 0]];

/* Every gradient, in set order, for the breadth sheet. */
const ALL_GRADIENTS = GRADIENTS.map((g) => ({ id: g.id, name: g.name, kind: g.kind, arc: g.hueArc, anchors: g.anchors }));

const { DARK, PAPER, MARK, SPREAD, LABELS, COUNTS } = D;

/* Furniture is greyscale everywhere, so the shell is handed neutral accents
   rather than a direction's. The site boards on page 2 colour the subscribe
   chip and the nav links off d.accent, which is the thing the constitution
   already forbids: colour is a field or an ordered encoding, and never an
   interface element. Fixed here rather than argued about. */
const NEUTRAL = { accent: '#2B2B2A', accentDark: '#DEDEDD', name: 'Applied' };

const G = {
  w: '#FFFFFF', g10: '#F4F4F3', g20: '#EBEBEA', g30: '#DEDEDD', g40: '#C9C9C7',
  g50: '#AEAEAC', g60: '#8C8C8A', g70: '#6C6C6A', g80: '#4A4A48', g90: '#2B2B2A', ink: '#131312'
};

const CW = 1280, CH = 720;
const HW = 1440;

/* Backing-store scale for a canvas, and the single most important number on
   these boards.

   At 2 a cover canvas is 2560 by 1440, which is 3.7 million pixels, and six
   of them mounting together took the canvas runtime past its patience: every
   frame on the covers page came back "the preview stopped answering the
   editor". At 1.6 the same canvas is 2.4 million, a third less, and a stipple
   is the one kind of image that loses almost nothing to it, because its
   detail is carried by where marks land rather than by their edges.

   time-board.cjs cannot see any of this. Its own header says so: the stub
   charges for property access and nothing for drawing, so forty thousand arc
   fills cost it about the same as four hundred. */
const SCALE = 1.6;
const px = (n) => Math.round(n * SCALE);

function props(section, grainDefault) {
  const g = grainDefault == null ? 0.05 : grainDefault;
  return '{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"' + section + '","tsType":"number"},' +
    '"grain":{"editor":"range","default":' + g + ',"min":0,"max":0.12,"step":0.005,"section":"' + section + '","tsType":"number"}}';
}

/* Only what a board needs. _subjects.js and _forms.js are ten kilobytes each
   and every byte is re-parsed on every redraw of every artboard on the page,
   so a cover that carries no form should not be shipping eight density
   fields it never calls. */
function pre(anchors, opt) {
  const o = opt || {};
  return [
    D.LANGJS,
    D.FXJS,
    o.subjects ? SUBJECTS_JS : '',
    o.forms ? FORMS_JS : '',
    o.kde ? D.KDEJS : '',
    'var A = ' + JSON.stringify(anchors) + ';',
    'function ramp(t, k) { return anchorRamp(A, t, k); }',
    'var SPREAD = ' + JSON.stringify(SPREAD) + ';',
    'var LABELS = ' + JSON.stringify(LABELS) + ';',
    'var COUNTS = ' + JSON.stringify(COUNTS) + ';',
    'var GG = ' + JSON.stringify(G) + ';',
    /* A subject paints into the whole W by H box it is handed. This puts that
       box somewhere else, so a rack row can occupy the right two thirds of a
       cover without the subject needing to know where it landed. */
    'function placed(fn, x, y, w, h) {',
    '  return function (g, W, H) {',
    '    g.save(); g.translate(x * W, y * H); g.scale(w, h); fn(g, W, H); g.restore();',
    '  };',
    '}',
    /* A form is a density across the whole frame. This crops one into a
       window and leaves the rest of the frame at zero, which is what lets a
       form sit in a margin rather than fill a page. */
    'function windowed(fn, x, y, w, h) {',
    '  return function (u, v) {',
    '    var uu = (u - x) / w, vv = (v - y) / h;',
    '    if (uu < 0 || uu > 1 || vv < 0 || vv > 1) return 0;',
    '    return fn(uu, vv);',
    '  };',
    '}',
    /* A cheap value hash, so a dissolve can be granular without becoming a
       texture of its own. Named apart from the one in _forms.js so a board
       may carry both. */
    'function ahash(x, y) {',
    '  var s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;',
    '  return s - Math.floor(s);',
    '}',
    /* Dissolve a density field toward an edge.

       A subject has hard edges everywhere, which is right for a silhouette
       and wrong where the image meets the layout: a skyline that stops dead
       on its ground line reads as a cut-out pasted onto the page rather than
       as an image the page is made of. Multiply the field by a falloff over
       the last stretch before the named edge, and break that falloff with a
       hash, because a perfectly smooth density ramp reads as rendered rather
       than as dissolving. */
    /* Each edge is a PAIR: full density up to the first value, nothing past
       the second. A single threshold with the frame edge as its end never
       finished the dissolve, because a subject stops at its own base well
       short of the frame and the falloff was still at four fifths there: the
       object went on stopping dead, just slightly dimmer. The end of the
       fade has to be placed at the object, not at the frame. */
    'function faded(m, o) {',
    '  var grit = o.grit == null ? 0.55 : o.grit;',
    '  function seg(x, r, rising) {',
    '    if (!r) return 1;',
    '    var z = (x - r[0]) / (r[1] - r[0]);',
    '    if (!rising) z = -z;',
    '    if (z <= 0) return 1;',
    '    return z >= 1 ? 0 : 1 - z;',
    '  }',
    '  return function (u, v) {',
    '    var d = m(u, v);',
    '    if (!(d > 0)) return 0;',
    '    var f = seg(v, o.bot, true) * seg(v, o.top, false) * seg(u, o.right, true) * seg(u, o.left, false);',
    '    if (f >= 1) return d;',
    '    if (!(f > 0)) return 0;',
    '    var n = ahash(Math.floor(u * 150), Math.floor(v * 150));',
    '    return d * f * f * (1 - (1 - f) * grit * (1 - n));',
    '  };',
    '}'
  ].filter(Boolean).join('\n');
}

/* ---------------------------------------------------------------- figures */
/* Three exhibits, shared by the body pages and the homepages, so the same
   chart can be seen with the gradient carrying the cohort and without it.

   `grey` is not a styling flag. It is the decision the budget question is
   actually about, and it has to be one argument rather than two copies of a
   chart that drift apart.

   All three draw on paper, so all three read the DEEP half of the ramp. The
   first pass ran cohort across the full 0 to 1 and the largest cohort came
   out at the pale end, which on white is nothing at all: six ordered series
   where the sixth is invisible is a five-series chart with a bug in it. */
const FIGJS = `
/* t arrives as 0..1 across the ordered variable and is squeezed into the
   deep half of the ramp before it is used. The grey ladder is squeezed the
   same way, so the two versions of a figure have the same contrast. */
function figCol(rp, k, t, grey) {
  if (!grey) return rp(0.03 + 0.63 * t, k);
  var g = Math.round(198 - 156 * t);
  return [g, g, g];
}

/* Six cohorts as ridges. Cohort is ordered, so a ramp may carry it and the
   ramp is then the legend.

   The fill is WHITE and only the curve is coloured. An earlier version tinted
   each area at 0.10 and that was wrong twice over. The tint accumulated down
   the stack into a pale wash that read as one soft blob rather than as six
   series. And a closed kde path runs a STRAIGHT LINE down each end to the
   baseline, so wherever the estimate is not near zero at the edge of its
   domain the fill gets a hard vertical wall: at this width every row looked
   like a rectangle with a wavy top. White keeps the occlusion, which is what
   the fill is actually for, and shows neither fault.

   Overlap is held at 1.32 of the row pitch. At 1.4, with the tint on, the
   lower cohorts, whose mass sits to the left, were eaten by the row above and
   read as curves that started halfway across the frame. Below about 1.2 the
   curves are so shallow the figure reads as six flat lines. */
function figRidge(ctx, W, H, rp, k, grey) {
  var S = 2, x0 = 250, w = W - 330, base = H - 96, step = (H - 300) / 5, h = step * 1.32;
  var peak = maxOf(KDE), i;
  for (i = KDE.length - 1; i >= 0; i--) {
    var yy = base - (KDE.length - 1 - i) * step;
    var col = figCol(rp, k, i / (KDE.length - 1), grey);
    /* The row's own baseline, under the fill, so a row still reads as a row
       where the curve above has occluded most of it. */
    ctx.strokeStyle = GG.g20; ctx.lineWidth = 1 * S;
    ctx.beginPath(); ctx.moveTo(x0, yy); ctx.lineTo(x0 + w, yy); ctx.stroke();
    kdePath(ctx, KDE[i], x0, yy, w, h, peak, true);
    ctx.fillStyle = '#FFFFFF'; ctx.fill();
    kdePath(ctx, KDE[i], x0, yy, w, h, peak, false);
    ctx.strokeStyle = rgbs(col); ctx.lineWidth = 2.4 * S; ctx.stroke();
    ctx.fillStyle = GG.g70;
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(LAB[i], x0 - 20, yy - 5);
    ctx.textAlign = 'left';
  }
  axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; }, GG.g30);
}

/* p10 to p90, cohort by cohort. Ordered, and the ordering is the finding. */
function figSpread(ctx, W, H, rp, k, grey) {
  var S = 2, x0 = 320, w = W - 430, top = 64, step = (H - 176) / 6;
  var lo = 45, hi = 78;
  for (var i = 0; i < SPREAD.length; i++) {
    var y = top + i * step + step * 0.5;
    var frac = (SPREAD[i] - lo) / (hi - lo);
    var col = figCol(rp, k, i / (SPREAD.length - 1), grey);
    ctx.strokeStyle = GG.g30; ctx.lineWidth = 1 * S;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
    var g = ctx.createLinearGradient(x0, 0, x0 + w * frac, 0);
    g.addColorStop(0, rgba(col, 0.30));
    g.addColorStop(1, rgbs(col));
    ctx.strokeStyle = g; ctx.lineWidth = 9 * S; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w * frac, y); ctx.stroke();
    ctx.fillStyle = GG.g80;
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    ctx.fillText(SPREAD[i].toFixed(1), x0 + w * frac + 14, y + 5);
    ctx.fillStyle = GG.g70;
    ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(LAB[i], x0 - 20, y + 5);
    ctx.textAlign = 'left';
  }
  ctx.fillStyle = GG.g60;
  ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
  ctx.fillText('p10 to p90, points of margin', x0, 34);
}

/* The middle half of each cohort, with the median marked. */
function figQuart(ctx, W, H, rp, k, grey) {
  var S = 2, x0 = 320, w = W - 410, top = 64, step = (H - 190) / 6;
  for (var i = 0; i < P25.length; i++) {
    var y = top + i * step + step * 0.5;
    var col = figCol(rp, k, i / (P25.length - 1), grey);
    ctx.strokeStyle = GG.g30; ctx.lineWidth = 1 * S;
    ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
    ctx.strokeStyle = rgba(col, 0.78); ctx.lineWidth = 11 * S; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.moveTo(x0 + w * P25[i], y); ctx.lineTo(x0 + w * P75[i], y); ctx.stroke();
    ctx.strokeStyle = GG.ink; ctx.lineWidth = 2 * S;
    ctx.beginPath(); ctx.moveTo(x0 + w * P50[i], y - 10 * S); ctx.lineTo(x0 + w * P50[i], y + 10 * S); ctx.stroke();
    ctx.fillStyle = GG.g70;
    ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(LAB[i], x0 - 20, y + 5);
    ctx.textAlign = 'left';
    ctx.fillStyle = GG.g80;
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    ctx.fillText((P50[i] * 100).toFixed(1), x0 + w * P75[i] + 14, y + 5);
  }
  axisX(ctx, x0, top + 5.5 * step + 32, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; }, GG.g30);
  ctx.fillStyle = GG.g60;
  ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
  ctx.fillText('p25 to p75, median marked', x0, 34);
}
`;

/* ------------------------------------------------------------ blob layouts */
/* Two field specs. The cover set leaves the left third quiet, which is where
   every title block on every one of these boards sits. */
const BLOBS_COVER = [
  { x: 0.82, y: 0.24, r: 0.50, t: 0.30, a: 0.80 },
  { x: 1.06, y: 0.72, r: 0.44, t: 0.62, a: 0.62 },
  { x: 0.58, y: 1.10, r: 0.56, t: 0.10, a: 0.55 },
  { x: 0.34, y: -0.16, r: 0.44, t: 0.44, a: 0.26 }
];

/* Under a Hero the field is ground rather than subject: the same masses at a
   third of the alpha and held to the deep end of the ramp, so the stipple
   stays the brightest thing in the frame. At full strength the two composite
   additively and the crane comes out of a white sky. */
const BLOBS_UNDER = BLOBS_COVER.map((b) => ({ x: b.x, y: b.y, r: b.r, t: Math.min(b.t, 0.42), a: b.a * 0.52 }));

const BLOBS_HOME = [
  { x: 0.86, y: 0.22, r: 0.46, t: 0.30, a: 0.82 },
  { x: 1.04, y: 0.74, r: 0.40, t: 0.62, a: 0.60 },
  { x: 0.62, y: 1.14, r: 0.50, t: 0.10, a: 0.52 },
  { x: 0.30, y: -0.20, r: 0.40, t: 0.44, a: 0.22 }
];

const BLOBS_HOME_UNDER = BLOBS_HOME.map((b) => ({ x: b.x, y: b.y, r: b.r, t: Math.min(b.t, 0.42), a: b.a * 0.48 }));

/* ------------------------------------------------------------------ chrome */

const bar = (dark, right) => `
    <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px;">
      <div style="display: flex; align-items: center; gap: 11px;">
        <svg style="width: 20px; height: 20px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g fill="${dark ? PAPER : DARK}">${MARK}</g></svg>
        <span style="font-size: 12px; line-height: 18px; color: ${dark ? G.g40 : G.g80};">Eleven One Research</span>
      </div>
      <span class="mono" style="font-size: 10px; color: ${dark ? G.g70 : G.g60};">${right}</span>
    </div>`;

/* Running furniture for a body page: a hairline, a running head, a folio.
   All greyscale on every page, including the pages that carry a device. */
const running = (n, section) => `
    <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 14px; border-top: 1px solid ${G.g20};">
      <span class="mono" style="font-size: 9px; letter-spacing: 0.06em; color: ${G.g60};">ELEVEN ONE RESEARCH &#183; PIECE 001 &#183; ${section}</span>
      <span class="mono" style="font-size: 9px; color: ${G.g60};">${n}</span>
    </div>`;

module.exports = {
  D, G, NEUTRAL, CW, CH, HW, SCALE, px, DARK, PAPER, MARK,
  A_PIECE, A_SITE, A_SLATE, A_GREY, ALL_GRADIENTS,
  BLOBS_COVER, BLOBS_UNDER, BLOBS_HOME, BLOBS_HOME_UNDER,
  pre, props, FIGJS, bar, running
};
