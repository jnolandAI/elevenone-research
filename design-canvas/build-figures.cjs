/* Figures for a published piece, using the gradient set.

   Six specimens, every one drawn from the repository data: the CY2024 margin
   distributions in kde.js. Nothing here is invented, and nothing is shaped to
   make a gradient look good.

   Three of the six use colour as ENCODING rather than as atmosphere, which is
   a departure worth naming. The constitution says colour is a field and never
   furniture. That still holds for rules, borders, labels, axes and panels,
   which stay greyscale on every figure below. What has changed is that a
   gradient may carry an ORDERED variable: revenue cohort runs small to large,
   density runs low to high, and a ramp reads as ordered in a way a set of
   distinct hues does not. A gradient may never carry an unordered category. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { GRADIENTS } = require('./_gradients.cjs');

const FW = 640, FH = 420, GAP = 44, PAD = 48, HEAD = 176, TITLE = 24, SUB = 38, NOTE = 44;
const W = PAD * 2 + 3 * FW + 2 * GAP;
const CELL = TITLE + SUB + FH + NOTE;
const H = PAD * 2 + HEAD + CELL * 2 + 40;

const grad = (id) => GRADIENTS.find((x) => x.id === id);
const USES = ['cobalt', 'cobalt-iris', 'iris-ember', 'moss-ember', 'cobalt-ember', 'slate-iris'];

const FIGS = [
  ['Fig. 1', 'The whole universe, one distribution',
   'Gross margin across all 2,186 filers. The area is the gradient; the curve is a hairline over it.',
   'cobalt', 'Atmosphere. The gradient carries nothing here: one series, one shape, and colour is doing the same job a flat tint would.'],
  ['Fig. 2', 'Six cohorts, ridged',
   'The same estimate cut into six equal-count revenue cohorts, offset so the shapes can be compared.',
   'cobalt-iris', 'Encoding. Cohort runs small to large, so the gradient carries an ordered variable and the legend is the ramp itself.'],
  ['Fig. 3', 'Filers per margin band',
   'One dot per three filers, forty bands from 0 to 100 percent margin. The count is the height of each column.',
   'iris-ember', 'The dot construction, as a chart. Colour comes from position on the page, so it crosses the whole figure rather than belonging to any one column.'],
  ['Fig. 4', 'Dispersion narrows with revenue',
   'The p10 to p90 spread of each cohort, in points of margin. Ordered by cohort, smallest revenue at the top.',
   'moss-ember', 'Encoding, and the one figure where the ordering is the finding: the bars shorten monotonically while the medians do not.'],
  ['Fig. 5', 'Where the mass sits, cohort by cohort',
   'Each strip is that cohort density across the full margin range. Brighter is more filers at that margin.',
   'cobalt-ember', 'Encoding density, not cohort. Every strip uses the same ramp, so a bright band in one row means what it means in every other row.'],
  ['Fig. 6', 'Quartiles, not medians',
   'p25 to p75 for each cohort, with the median marked. The bar is the middle half of the cohort.',
   'slate-iris', 'The quiet crossing. It starts as grey and only becomes colour at the top of the range, which suits a figure whose point is that most of the mass is unremarkable.']
];

const cell = (f, i) => `
      <div style="display: flex; flex-direction: column; width: ${FW}px; flex-shrink: 0;">
        <div style="display: flex; align-items: baseline; gap: 10px; height: ${TITLE}px;">
          <span class="mono" style="font-size: 10px; color: #8C8C8A;">${f[0]}</span>
          <span style="font-size: 15px; font-weight: 500; letter-spacing: -0.01em;">${f[1]}</span>
        </div>
        <p style="margin: 0; height: ${SUB}px; font-size: 12px; line-height: 18px; color: #6C6C6A; text-wrap: pretty;">${f[2]}</p>
        <canvas id="f${i}" width="${FW * 2}" height="${FH * 2}" style="width: ${FW}px; height: ${FH}px; display: block;"></canvas>
        <p style="margin: 8px 0 0 0; height: ${NOTE - 8}px; font-size: 11px; line-height: 17px; color: #8C8C8A; text-wrap: pretty;"><span class="mono" style="color: #4A4A48;">${f[3]}</span> &#183; ${f[4]}</p>
      </div>`;

const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #FFFFFF; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${D.DARK}; padding: ${PAD}px; box-sizing: border-box;">
  <div style="display: flex; flex-direction: column; gap: 10px; height: ${HEAD}px;">
    ${D.BAR(false, 'Figures')}
    <div style="display: flex; gap: 48px; align-items: flex-start; margin-top: 4px;">
      <div style="width: 340px; flex-shrink: 0;">
        <h1 style="margin: 0; font-size: 27px; line-height: 33px; font-weight: 500; letter-spacing: -0.02em;">Figures</h1>
        <p style="margin: 5px 0 0 0; font-size: 14px; line-height: 21px; color: #4A4A48; text-wrap: pretty;">Six specimens for a published piece, on the gradient set.</p>
      </div>
      <p style="margin: 0; max-width: 1200px; font-size: 13px; line-height: 21px; color: #6C6C6A; text-wrap: pretty;">Every figure is drawn from the CY2024 margin data in this repository. Nothing is invented and nothing is shaped to flatter a gradient. Three of the six use colour as ENCODING rather than as atmosphere, which is a departure: the rule was that colour is a field and never furniture. That still holds, and every rule, border, label, axis and tick below is greyscale. What has changed is that a gradient may carry an ORDERED variable, because a ramp reads as ordered in a way a set of distinct hues does not. Cohort runs small to large and density runs low to high; both qualify. A gradient may never carry an unordered category.</p>
    </div>
  </div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${FIGS.slice(0, 3).map((f, i) => cell(f, i)).join('')}
  </div>
  <div style="height: 40px;"></div>
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start;">
${FIGS.slice(3).map((f, i) => cell(f, i + 3)).join('')}
  </div>
</div>`;

const js = `${D.LANGJS}
${D.KDEJS}
${D.FXJS}
var SPREAD = [${D.SPREAD.join(',')}];
var A = ${JSON.stringify(USES.map((id) => grad(id).anchors))};
var GREYRULE = '#DEDEDD';

function rampOf(a) { return function (t, kk) { return anchorRamp(a, t, kk); }; }

class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  frame(cv) {
    var ctx = cv.getContext('2d');
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cv.width, cv.height);
    return ctx;
  }

  /* Fig 1. One series. The gradient is atmosphere, so it runs with height
     rather than with anything in the data. */
  f0(cv, ramp, k, gr) {
    var ctx = this.frame(cv), W = cv.width, H = cv.height, S = 2;
    var x0 = 70, w = W - 140, base = H - 96, h = H - 190;
    var peak = 0, i;
    for (i = 0; i < ALL.length; i++) if (ALL[i] > peak) peak = ALL[i];
    kdePath(ctx, ALL, x0, base, w, h, peak, true);
    var g = ctx.createLinearGradient(0, base - h, 0, base);
    for (i = 0; i <= 8; i++) g.addColorStop(i / 8, rgba(ramp(0.10 + 0.68 * (1 - i / 8), k), 0.88));
    ctx.fillStyle = g; ctx.fill();
    kdePath(ctx, ALL, x0, base, w, h, peak, false);
    ctx.strokeStyle = rgbs(ramp(0.08, k)); ctx.lineWidth = 2 * S; ctx.stroke();
    axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    fxGrain(ctx, W, H, gr * 0.5, 11, 1);
  }

  /* Fig 2. Cohort is ordered, so the ramp is the legend. */
  f1(cv, ramp, k, gr) {
    var ctx = this.frame(cv), W = cv.width, H = cv.height, S = 2;
    var x0 = 150, w = W - 230, base = H - 96, h = 150, step = (H - 250) / 5;
    var peak = maxOf(KDE), i;
    for (i = KDE.length - 1; i >= 0; i--) {
      var yy = base - (KDE.length - 1 - i) * step;
      var col = ramp(0.06 + 0.88 * (i / (KDE.length - 1)), k);
      kdePath(ctx, KDE[i], x0, yy, w, h, peak, true);
      ctx.fillStyle = '#FFFFFF'; ctx.fill();
      kdePath(ctx, KDE[i], x0, yy, w, h, peak, true);
      ctx.fillStyle = rgba(col, 0.16); ctx.fill();
      kdePath(ctx, KDE[i], x0, yy, w, h, peak, false);
      ctx.strokeStyle = rgbs(col); ctx.lineWidth = 2.4 * S; ctx.stroke();
      ctx.fillStyle = '#6C6C6A';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], x0 - 16, yy - 3);
      ctx.textAlign = 'left';
    }
    axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    fxGrain(ctx, W, H, gr * 0.5, 11, 1);
  }

  /* Fig 3. The dot construction as a chart: colour from position on the page,
     never from the column it belongs to. */
  f2(cv, ramp, k, gr) {
    var ctx = this.frame(cv), W = cv.width, H = cv.height, S = 2;
    var x0 = 70, w = W - 140, base = H - 96;
    var per = 3, pitch = w / HIST.length, rad = pitch * 0.26;
    for (var i = 0; i < HIST.length; i++) {
      var n = Math.round(HIST[i] / per);
      var cx = x0 + (i + 0.5) * pitch;
      for (var j = 0; j < n; j++) {
        var cy = base - (j + 0.6) * pitch * 0.82;
        if (cy < 60) break;
        var t = 0.06 + 0.86 * ((cx - x0) / w);
        var col = ramp(t, k);
        ctx.fillStyle = rgba(col, 0.42 + 0.5 * (1 - j / Math.max(1, n)));
        ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 6.283185); ctx.fill();
      }
    }
    axisX(ctx, x0, base + 2, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    ctx.fillStyle = '#8C8C8A';
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    ctx.fillText('one dot = 3 filers', x0, 44);
    fxGrain(ctx, W, H, gr * 0.5, 11, 1);
  }

  /* Fig 4. Ordered, and the ordering is the finding. */
  f3(cv, ramp, k, gr) {
    var ctx = this.frame(cv), W = cv.width, H = cv.height, S = 2;
    var x0 = 300, w = W - 400, top = 70, step = (H - 190) / 6;
    var lo = 45, hi = 78;
    for (var i = 0; i < SPREAD.length; i++) {
      var y = top + i * step + step * 0.5;
      var frac = (SPREAD[i] - lo) / (hi - lo);
      var col = ramp(0.06 + 0.88 * (i / (SPREAD.length - 1)), k);
      ctx.strokeStyle = GREYRULE; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
      var g = ctx.createLinearGradient(x0, 0, x0 + w * frac, 0);
      g.addColorStop(0, rgba(col, 0.30));
      g.addColorStop(1, rgbs(col));
      ctx.strokeStyle = g; ctx.lineWidth = 9 * S; ctx.lineCap = 'butt';
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w * frac, y); ctx.stroke();
      ctx.fillStyle = '#4A4A48';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.fillText(SPREAD[i].toFixed(1), x0 + w * frac + 14, y + 5);
      ctx.fillStyle = '#6C6C6A';
      ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], x0 - 18, y + 5);
      ctx.textAlign = 'left';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    }
    ctx.fillStyle = '#8C8C8A';
    ctx.fillText('p10 to p90, points of margin', x0, 44);
    fxGrain(ctx, W, H, gr * 0.5, 11, 1);
  }

  /* Fig 5. Density is ordered, so the ramp encodes it. Cohort is carried by
     position instead, which is what lets one ramp serve all six rows. */
  f4(cv, ramp, k, gr) {
    var ctx = this.frame(cv), W = cv.width, H = cv.height, S = 2;
    var x0 = 300, w = W - 380, top = 74, step = (H - 200) / 6, sh = step * 0.62;
    var peak = maxOf(KDE);
    for (var i = 0; i < KDE.length; i++) {
      var y = top + i * step;
      for (var c = 0; c < w; c += 2) {
        var dens = sampleAt(KDE[i], c / w) / peak;
        var col = ramp(0.04 + 0.92 * dens, k);
        ctx.fillStyle = rgbs(col);
        ctx.fillRect(x0 + c, y, 2, sh);
      }
      ctx.fillStyle = '#6C6C6A';
      ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], x0 - 18, y + sh * 0.68);
      ctx.textAlign = 'left';
    }
    axisX(ctx, x0, top + 6 * step - step + sh + 8, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    ctx.fillStyle = '#8C8C8A';
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    ctx.fillText('less', x0, 44);
    ctx.textAlign = 'right';
    ctx.fillText('more', x0 + w, 44);
    ctx.textAlign = 'left';
    fxGrain(ctx, W, H, gr * 0.5, 11, 1);
  }

  /* Fig 6. The quiet crossing: grey for most of its length. */
  f5(cv, ramp, k, gr) {
    var ctx = this.frame(cv), W = cv.width, H = cv.height, S = 2;
    var x0 = 300, w = W - 380, top = 78, step = (H - 200) / 6;
    for (var i = 0; i < P50.length; i++) {
      var y = top + i * step + step * 0.5;
      var col = ramp(0.06 + 0.88 * (i / (P50.length - 1)), k);
      ctx.strokeStyle = GREYRULE; ctx.lineWidth = 1 * S;
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + w, y); ctx.stroke();
      ctx.strokeStyle = rgba(col, 0.55); ctx.lineWidth = 7 * S; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(x0 + P25[i] * w, y); ctx.lineTo(x0 + P75[i] * w, y); ctx.stroke();
      ctx.fillStyle = rgbs(col);
      ctx.beginPath(); ctx.arc(x0 + P50[i] * w, y, 5.5 * S, 0, 6.283185); ctx.fill();
      ctx.fillStyle = '#6C6C6A';
      ctx.font = (11 * S) + 'px "Familjen Grotesk", system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(LAB[i], x0 - 18, y + 5);
      ctx.textAlign = 'left';
    }
    axisX(ctx, x0, top + 6 * step - 4, w, S, [0, 0.25, 0.5, 0.75, 1], function (v) { return (v * 100).toFixed(0) + '%'; });
    ctx.fillStyle = '#8C8C8A';
    ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
    ctx.fillText('p25 to p75, median marked', x0, 44);
    fxGrain(ctx, W, H, gr * 0.5, 11, 1);
  }

  draw() {
    if (!document.getElementById('f0')) { requestAnimationFrame(this.draw.bind(this)); return; }
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var gr = this.props.grain != null ? this.props.grain : 0.04;
    this.f0(document.getElementById('f0'), rampOf(A[0]), k, gr);
    this.f1(document.getElementById('f1'), rampOf(A[1]), k, gr);
    this.f2(document.getElementById('f2'), rampOf(A[2]), k, gr);
    this.f3(document.getElementById('f3'), rampOf(A[3]), k, gr);
    this.f4(document.getElementById('f4'), rampOf(A[4]), k, gr);
    this.f5(document.getElementById('f5'), rampOf(A[5]), k, gr);
  }
  renderVals() { return {}; }
}`;

const props = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"Figures","tsType":"number"},"grain":{"editor":"range","default":0.04,"min":0,"max":0.16,"step":0.005,"section":"Figures","tsType":"number"}}`;

fs.writeFileSync('Figures.dc.html', D.shell({ dark: false, d: D.DIRS[3], body, js, props }));
console.log('Figures.dc.html  ' + W + 'x' + H + '  ' + fs.statSync('Figures.dc.html').size + ' bytes');

module.exports = { FIG_BOARD: { file: 'Figures.dc.html', w: W, h: H } };
