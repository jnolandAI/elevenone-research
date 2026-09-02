/* Emits the four hue-budget covers. One template, one variable: the ramp.
   Everything else -- copy, geometry, type, the 15 degree lattice, the grain
   layer -- is identical to Main.dc.html, so the artboards differ only in how
   much of the spectrum they admit. */
const fs = require('fs');

const SHARED = fs.readFileSync('_shared.js', 'utf8');
const RAMPS = fs.readFileSync('_ramps.js', 'utf8');

const MARK_SMALL = '<circle cx="86.17" cy="8.90" r="0.96"/><circle cx="45.66" cy="2.24" r="0.69"/><circle cx="54.35" cy="10.65" r="2.15"/><circle cx="79.36" cy="22.59" r="3.29"/><circle cx="32.48" cy="18.89" r="1.11"/><circle cx="36.07" cy="28.19" r="2.15"/><circle cx="61.97" cy="33.56" r="3.29"/><circle cx="85.01" cy="38.73" r="4.50"/><circle cx="8.86" cy="39.46" r="0.69"/><circle cx="31.28" cy="41.76" r="2.15"/><circle cx="49.40" cy="49.03" r="3.29"/><circle cx="70.95" cy="55.29" r="4.50"/><circle cx="92.10" cy="65.02" r="3.56"/><circle cx="10.43" cy="59.96" r="2.15"/><circle cx="33.54" cy="62.13" r="3.29"/><circle cx="55.52" cy="70.70" r="4.50"/><circle cx="74.88" cy="76.00" r="5.77"/><circle cx="95.93" cy="83.07" r="1.30"/><circle cx="19.62" cy="79.88" r="3.29"/><circle cx="40.27" cy="85.40" r="4.50"/><circle cx="61.09" cy="91.99" r="3.56"/><circle cx="79.18" cy="97.79" r="1.30"/><circle cx="4.10" cy="94.37" r="0.96"/>';

const NOISE = "url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E&quot;)";

const OPTIONS = [
  {
    file: 'SingleHue.dc.html', id: 'fieldD', dark: false,
    ramp: 'rampD', tExpr: 'var t = m;', composite: false,
    caption: 'D. One hue, 250 degrees. 8 degrees of arc travelled.'
  },
  {
    file: 'Diverging.dc.html', id: 'fieldE', dark: false,
    ramp: 'rampE', composite: false,
    /* The crossing is placed on the median rather than on the middle of the
       axis, so the neutral band in the field IS 0.388 and the warm and cool
       halves are the two sides the subtitle is about. */
    tExpr: 'var t = m < 0.388 ? 0.5 * (m / 0.388) : 0.5 + 0.5 * ((m - 0.388) / 0.612);',
    caption: 'E. Warm below the median, cool above, neutral at 0.388.'
  },
  {
    file: 'Achromatic.dc.html', id: 'fieldF', dark: true,
    ramp: 'rampF', tExpr: 'var t = Math.pow(amp, 0.45);', composite: true,
    caption: 'F. No hue at all. Brightness is density.'
  },
  {
    file: 'TwoAnchor.dc.html', id: 'fieldG', dark: false,
    ramp: 'rampG', tExpr: 'var t = m;', composite: false,
    caption: 'G. Cream to violet-blue, blended through Lab.'
  }
];

function cover(o) {
  const ground = o.dark ? '#131312' : '#F4F4F3';
  const ink = o.dark ? '#F4F4F3' : '#131312';
  const h1 = o.dark ? '#FFFFFF' : '#131312';
  const sub = o.dark ? '#C9C9C7' : '#4A4A48';
  const body = o.dark ? '#C9C9C7' : '#4A4A48';
  const quiet = o.dark ? '#8C8C8A' : '#8C8C8A';
  const label = o.dark ? '#6C6C6A' : '#8C8C8A';
  const markFill = o.dark ? '#F4F4F3' : '#131312';
  const blend = o.dark ? '' : 'mix-blend-mode: multiply; ';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400..700&amp;family=Martian+Mono:wght@200..600&amp;display=swap">
  <style>
    body { margin: 0; }
    a { color: ${o.dark ? '#49A9FF' : '#005CCC'}; text-decoration: none; }
    a:hover { color: ${o.dark ? '#57B6FF' : '#0647C1'}; }
    .mk circle { fill: ${markFill}; }
  </style>
</helmet>
<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: ${ground}; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: ${ink};">

  <canvas id="${o.id}" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>

  <div style="position: absolute; inset: 0; pointer-events: none; ${blend}opacity: {{grain}}; background-image: ${NOISE};"></div>

  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 48px 64px 44px 64px;">

    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 32px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg class="mk" style="width: 26px; height: 26px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g>${MARK_SMALL}</g></svg>
        <span style="font-size: 13px; line-height: 20px; color: ${body};">Eleven One Research</span>
      </div>
      <span style="font-size: 13px; line-height: 20px; color: ${quiet};">Cross-sector financial analysis</span>
    </div>

    <div style="display: flex; flex-direction: column; gap: 20px; max-width: 620px;">
      <span style="font-family: 'Martian Mono', ui-monospace, monospace; font-weight: 300; font-size: 12px; letter-spacing: -0.012em; color: ${label};">001</span>
      <h1 style="margin: 0; font-size: 48px; line-height: 56px; font-weight: 500; letter-spacing: -0.03em; color: ${h1}; text-wrap: pretty;">Reported gross margin is not one distribution</h1>
      <p style="margin: 0; font-size: 22px; line-height: 32px; font-weight: 400; letter-spacing: -0.02em; color: ${sub}; text-wrap: pretty;">The peer median sits between two of them</p>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 48px;">
      <p style="margin: 0; max-width: 560px; font-size: 15px; line-height: 24px; color: ${body}; text-wrap: pretty;">We pulled every SEC registrant that reported both revenue and gross profit for calendar 2024. The median is 38.8%. About one company in six sits within five points of it, and almost exactly as many report above 70%.</p>
      <span style="font-family: 'Martian Mono', ui-monospace, monospace; font-weight: 300; font-size: 11px; line-height: 16px; letter-spacing: -0.012em; color: ${label}; text-align: right; white-space: pre-line;">SEC XBRL frames API, us-gaap, CY2024
n=2,186  retrieved 2026-08-05</span>
    </div>

  </div>
</div>
</x-dc>
<script data-dc-script data-props='{"chroma":{"editor":"range","default":1,"min":0.2,"max":1.6,"step":0.05,"section":"Hue budget","tsType":"number"},"cell":{"editor":"int","default":9,"min":5,"max":18,"unit":"px","section":"Hue budget","tsType":"number"},"grain":{"editor":"range","default":${o.dark ? '0.05' : '0.05'},"min":0,"max":0.16,"step":0.01,"section":"Hue budget","tsType":"number"}}'>
${SHARED}
${RAMPS}

/* ${o.caption}
   Same cover, same data, same 15 degree lattice as Direction A. The only
   thing that changes between these four is how much of the spectrum the
   ramp is allowed to travel. */
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  draw() {
    var cv = document.getElementById('${o.id}');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : 1;
    var cell = (this.props.cell != null ? this.props.cell : 9) * S;

    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ${o.composite ? "ctx.globalCompositeOperation = 'lighter';" : ''}

    var fx0 = 0.40 * W, fx1 = 1.06 * W, fy0 = 0.06 * H, fy1 = 1.10 * H;
    var cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
    var hw = (fx1 - fx0) / 2, hh = (fy1 - fy0) / 2;

    var totMax = 0, i, m, j, tot;
    for (i = 0; i <= 200; i++) {
      m = i / 200; tot = 0;
      for (j = 0; j < KDE.length; j++) tot += sampleAt(KDE[j], m);
      if (tot > totMax) totMax = tot;
    }

    var ang = 15 * Math.PI / 180, cs = Math.cos(ang), sn = Math.sin(ang);
    var diag = Math.sqrt(W * W + H * H);
    var steps = Math.ceil(diag / cell) + 2;

    for (var a = -steps; a <= steps; a++) {
      for (var b = -steps; b <= steps; b++) {
        var lx = a * cell, ly = b * cell;
        var px = cx + lx * cs - ly * sn;
        var py = cy + lx * sn + ly * cs;
        if (px < -cell || px > W + cell || py < -cell || py > H + cell) continue;

        var ex = 1 - Math.pow((px - cx) / hw, 2);
        var ey = 1 - Math.pow((py - cy) / hh, 2);
        if (ex <= 0 || ey <= 0) continue;

        m = (px - fx0) / (fx1 - fx0);
        if (m < 0 || m > 1) continue;

        tot = 0;
        for (j = 0; j < KDE.length; j++) tot += sampleAt(KDE[j], m);
        if (tot <= 0.001) continue;

        var amp = (tot / totMax) * ex * ey;
        if (amp <= 0.004) continue;

        ${o.tExpr}
        var r = cell * 0.5 * Math.pow(amp, 0.55) * 0.94;
        if (r < 0.35) continue;

        ctx.fillStyle = rgbs(${o.ramp}(t, k));
        ${o.composite ? 'ctx.globalAlpha = 0.85;' : ''}
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.283185);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  renderVals() {
    return { grain: this.props.grain != null ? this.props.grain : 0.05 };
  }
}
</script>
</body>
</html>
`;
}

for (const o of OPTIONS) {
  fs.writeFileSync(o.file, cover(o));
  console.log(o.file, fs.statSync(o.file).size, 'bytes');
}
