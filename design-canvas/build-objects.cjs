/* Four constructions of one object.

   The object is the joint density surface: 72 rows by 96 columns, revenue on
   one axis and gross margin on the other, density as elevation. It is not a
   shape chosen to look like something. It is the terrain the brief describes,
   and it has two summits, which is the title.

   All four share one isometric projection and one emission ramp, so they read
   as four drawings of the same thing rather than four unrelated pictures. */
const fs = require('fs');

const GRIDJS = fs.readFileSync('grid.js', 'utf8');
const DARK = fs.readFileSync('_dark.js', 'utf8');
const KDEJS = fs.readFileSync('kde.js', 'utf8');

const MARK = '<circle cx="92.07" cy="8.73" r="6.45"/><circle cx="20.08" cy="9.38" r="1.31"/><circle cx="36.97" cy="20.30" r="3.72"/><circle cx="69.93" cy="28.25" r="6.45"/><circle cx="22.23" cy="40.54" r="3.72"/><circle cx="49.76" cy="49.61" r="6.45"/><circle cx="79.01" cy="57.74" r="9.39"/><circle cx="28.24" cy="70.00" r="6.45"/><circle cx="57.76" cy="78.98" r="9.39"/><circle cx="86.74" cy="86.74" r="11.00"/><circle cx="7.51" cy="92.28" r="6.45"/>';

const NOISE = "url(&quot;data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E&quot;)";

/* One projection for all four. Tuned so the surface sits right of centre and
   its sparse corner -- tiny revenue, high margin, almost no filers -- falls
   under the type, where the ground is nearly black anyway. */
const ISO = 'var O = { ox: 1500, oy: 900, sx: 1280, sy: 820, hz: 400 };';

/* The stack needs a shallower plane than the terrain does. A sheet seen at a
   flatter angle costs less vertical room, which is what buys the six layers
   their separation, and it is also how Palantir draws a plane. */
const ISO_PLANES = 'var O = { ox: 1520, oy: 880, sx: 1180, sy: 520, hz: 400 };';

const DRAWS = {

  Terrain: `
    /* Every cell of the grid as one point of light. Radius and colour both
       rise with density, so the surface is legible even at chroma 0. */
    ctx.globalCompositeOperation = 'lighter';
    for (var r = 0; r < GROWS; r++) {
      for (var c = 0; c < GCOLS; c++) {
        var h = GRID[r][c] / GMAX;
        var p = isoPoint(c / (GCOLS - 1), r / (GROWS - 1), h, O);
        if (p[0] < -20 || p[0] > W + 20 || p[1] < -20 || p[1] > H + 20) continue;
        var rad = (1.1 + 5.2 * Math.pow(h, 1.35)) * S;
        ctx.fillStyle = ems(emit(h, k));
        ctx.globalAlpha = 0.30 + 0.65 * Math.pow(h, 0.6);
        ctx.beginPath();
        ctx.arc(p[0], p[1], rad, 0, 6.283185);
        ctx.fill();
      }
    }`,

  Wireframe: `
    /* The same surface as a mesh. Lines every fourth row and column, drawn
       segment by segment so colour tracks elevation along the wire rather
       than being flat per line. */
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    var STEP = 4, i;

    for (var r = 0; r < GROWS; r += STEP) {
      for (var c = 0; c < GCOLS - 1; c++) {
        var h0 = GRID[r][c] / GMAX, h1 = GRID[r][c + 1] / GMAX;
        var a = isoPoint(c / (GCOLS - 1), r / (GROWS - 1), h0, O);
        var b = isoPoint((c + 1) / (GCOLS - 1), r / (GROWS - 1), h1, O);
        var hm = (h0 + h1) / 2;
        ctx.strokeStyle = ema(emit(hm, k), 0.18 + 0.62 * Math.pow(hm, 0.7));
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
        ctx.strokeStyle = ema(emit(hm2, k), 0.14 + 0.52 * Math.pow(hm2, 0.7));
        ctx.lineWidth = (0.5 + 1.2 * hm2) * S;
        ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }
    }

    /* The two summits, marked where they actually are. */
    ctx.globalCompositeOperation = 'source-over';
    var marks = [
      { p: GPEAK, label: '01' },
      { p: GRIDGE, label: '02' }
    ];
    for (i = 0; i < marks.length; i++) {
      var mk = marks[i];
      var hh = GRID[mk.p.row][mk.p.col] / GMAX;
      var top = isoPoint(mk.p.col / (GCOLS - 1), mk.p.row / (GROWS - 1), hh, O);
      var foot = isoPoint(mk.p.col / (GCOLS - 1), mk.p.row / (GROWS - 1), 0, O);
      ctx.strokeStyle = 'rgba(244,244,243,0.42)';
      ctx.lineWidth = 1 * S;
      ctx.setLineDash([4 * S, 5 * S]);
      ctx.beginPath(); ctx.moveTo(foot[0], foot[1]); ctx.lineTo(top[0], top[1] - 26 * S); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#FFF5D4';
      ctx.beginPath(); ctx.arc(top[0], top[1], 3.4 * S, 0, 6.283185); ctx.fill();
      ctx.fillStyle = 'rgba(244,244,243,0.85)';
      ctx.font = (10 * S) + 'px "Martian Mono", ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(mk.label, top[0], top[1] - 36 * S);
    }
    ctx.textAlign = 'left';`,

  Planes: `
    /* Palantir's exploded layers, with the layers meaning something: one
       plane per revenue cohort, stacked smallest at the bottom. Each plane
       carries its own density across margin as a dot lattice, so the stack
       is the six distributions the brief is about, seen edge on. */
    var LN = KDE.length, li, lc, lr;
    var peakK = 0;
    for (li = 0; li < LN; li++) for (lc = 0; lc < KDE[li].length; lc++) if (KDE[li][lc] > peakK) peakK = KDE[li][lc];

    for (li = 0; li < LN; li++) {
      var lift = 0.05 + li * 0.18;
      var tCol = li / (LN - 1);

      /* The plane's own outline, so it reads as a sheet in space. */
      ctx.globalCompositeOperation = 'source-over';
      var corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
      ctx.beginPath();
      for (lr = 0; lr < 4; lr++) {
        var cp = isoPoint(corners[lr][0], corners[lr][1], lift, O);
        if (lr === 0) ctx.moveTo(cp[0], cp[1]); else ctx.lineTo(cp[0], cp[1]);
      }
      ctx.closePath();
      ctx.fillStyle = ema(emit(0.10 + tCol * 0.28, k), 0.10);
      ctx.fill();
      ctx.strokeStyle = ema(emit(0.35 + tCol * 0.4, k), 0.30);
      ctx.lineWidth = 1 * S;
      ctx.stroke();

      /* The cohort's density, as a lattice of points across the plane. */
      ctx.globalCompositeOperation = 'lighter';
      for (lc = 0; lc <= 76; lc++) {
        var u = lc / 76;
        var dens = sampleAt(KDE[li], u) / peakK;
        if (dens <= 0.02) continue;
        for (lr = 0; lr <= 12; lr++) {
          var v = lr / 12;
          var jitter = 0.5 + 0.5 * Math.cos((lc * 1.7 + lr * 2.3));
          var amp = dens * (0.55 + 0.45 * jitter);
          var pp = isoPoint(u, v, lift, O);
          var rad = (0.7 + 3.4 * Math.pow(amp, 1.2)) * S;
          ctx.fillStyle = ems(emit(0.30 + 0.62 * amp, k));
          ctx.globalAlpha = 0.22 + 0.58 * amp;
          ctx.beginPath(); ctx.arc(pp[0], pp[1], rad, 0, 6.283185); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }`,

  Ridges: `
    /* The surface cut into sections and drawn front to back, each section
       filled with the ground so the nearer ones occlude the farther. This is
       the one construction where the two summits read as separate landforms
       rather than as one lumpy sheet. */
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
      var base0 = isoPoint(0, v, 0, O), base1 = isoPoint(1, v, 0, O);

      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (cc = 1; cc < pts.length; cc++) ctx.lineTo(pts[cc][0], pts[cc][1]);
      ctx.lineTo(base1[0], base1[1] + 900);
      ctx.lineTo(base0[0], base0[1] + 900);
      ctx.closePath();

      var gy0 = isoPoint(0, v, 1, O)[1], gy1 = base0[1];
      var grd = ctx.createLinearGradient(0, gy0, 0, gy1);
      grd.addColorStop(0, ema(emit(0.55, k), 0.30));
      grd.addColorStop(1, '#131312');
      ctx.fillStyle = grd;
      ctx.fill();

      /* The crest, coloured by how high this section actually gets. */
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (cc = 1; cc < pts.length; cc++) ctx.lineTo(pts[cc][0], pts[cc][1]);
      ctx.strokeStyle = ema(emit(0.22 + 0.75 * hmax, k), 0.55 + 0.4 * hmax);
      ctx.lineWidth = (0.7 + 1.5 * hmax) * S;
      ctx.stroke();
    }`
};

const OPTIONS = [
  {
    file: 'Terrain.dc.html', id: 'objH', draw: 'Terrain', needKde: false,
    name: 'H. Terrain', chroma: 0.85,
    caption: 'Every cell of the density grid as one point of light.'
  },
  {
    file: 'Wireframe.dc.html', id: 'objI', draw: 'Wireframe', needKde: false,
    name: 'I. Wireframe', chroma: 0.9,
    caption: 'The same surface as a mesh, with both summits marked where they sit.'
  },
  {
    file: 'Planes.dc.html', id: 'objJ', draw: 'Planes', needKde: true, iso: ISO_PLANES,
    name: 'J. Stacked planes', chroma: 0.9,
    caption: 'Six cohorts as six sheets in space. Palantir layers that mean something.'
  },
  {
    file: 'Ridges.dc.html', id: 'objL', draw: 'Ridges', needKde: false,
    name: 'L. Ridges', chroma: 0.85,
    caption: 'The surface cut into sections, front occluding back.'
  }
];

function page(o) {
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
    a { color: #8FD3E8; text-decoration: none; }
    a:hover { color: #C9DFD0; }
    .mk circle { fill: #F4F4F3; }
    .meta { font-family: 'Martian Mono', ui-monospace, monospace; font-weight: 300; font-size: 11px; line-height: 16px; letter-spacing: -0.012em; color: #8C8C8A; }
  </style>
</helmet>
<div style="position: relative; width: 1280px; height: 720px; overflow: hidden; background: #131312; font-family: 'Familjen Grotesk', system-ui, sans-serif; color: #F4F4F3;">

  <canvas id="${o.id}" width="2560" height="1440" style="position: absolute; inset: 0; width: 1280px; height: 720px;"></canvas>

  <div style="position: absolute; inset: 0; pointer-events: none; opacity: {{grain}}; background-image: ${NOISE};"></div>

  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 44px 60px 40px 60px;">

    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 32px;">
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg class="mk" style="width: 24px; height: 24px; display: block;" viewBox="0 0 100 100" role="img" aria-label="Eleven One Research"><g>${MARK}</g></svg>
        <span style="font-size: 13px; line-height: 20px; color: #C9C9C7;">Eleven One Research</span>
      </div>
      <span style="font-size: 13px; line-height: 20px; color: #8C8C8A;">Cross-sector financial analysis</span>
    </div>

    <div style="display: flex; flex-direction: column; gap: 18px; max-width: 470px;">
      <span class="meta" style="color: #6C6C6A;">001</span>
      <h1 style="margin: 0; font-size: 44px; line-height: 50px; font-weight: 500; letter-spacing: -0.03em; color: #FFFFFF; text-wrap: pretty;">Reported gross margin is not one distribution</h1>
      <p style="margin: 0; font-size: 20px; line-height: 29px; font-weight: 400; letter-spacing: -0.02em; color: #C9C9C7; text-wrap: pretty;">The peer median sits between two of them</p>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: flex-end; gap: 40px;">
      <p style="margin: 0; max-width: 430px; font-size: 14px; line-height: 22px; color: #AEAEAC; text-wrap: pretty;">Revenue rises left to right on a log scale, gross margin front to back, elevation is how many filers fall in each cell. The primary summit sits at $1.44bn and 27.8%. A second ridge stands at $654m and 70.1%.</p>
      <span class="meta" style="text-align: right; white-space: pre-line; color: #6C6C6A;">SEC XBRL frames API, us-gaap, CY2024
n=2,186  retrieved 2026-08-05</span>
    </div>

  </div>
</div>
</x-dc>
<script data-dc-script data-props='{"chroma":{"editor":"range","default":${o.chroma},"min":0,"max":1.5,"step":0.05,"section":"Object","tsType":"number"},"grain":{"editor":"range","default":0.05,"min":0,"max":0.16,"step":0.01,"section":"Object","tsType":"number"}}'>
${GRIDJS}
${o.needKde ? KDEJS : ''}
${DARK}
${o.needKde ? 'function sampleAt(arr,m){var p=(m+0.05)/1.05*(arr.length-1);if(p<=0)return arr[0];if(p>=arr.length-1)return arr[arr.length-1];var i=Math.floor(p),f=p-i;return arr[i]*(1-f)+arr[i+1]*f;}' : ''}

/* ${o.name}. ${o.caption} */
class Component extends DCLogic {
  componentDidMount() { this.draw(); }
  componentDidUpdate() { this.draw(); }

  draw() {
    var cv = document.getElementById('${o.id}');
    if (!cv) { requestAnimationFrame(this.draw.bind(this)); return; }
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height, S = 2;
    var k = this.props.chroma != null ? this.props.chroma : ${o.chroma};

    ${o.iso || ISO}

    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#131312';
    ctx.fillRect(0, 0, W, H);

    /* A little atmosphere behind the object, drawn rather than blurred: a
       radial fall-off on the ground, not a shadow under a panel. */
    var glow = ctx.createRadialGradient(O.ox, O.oy - 120, 0, O.ox, O.oy - 120, 1200);
    glow.addColorStop(0, ema(emit(0.30, k), 0.30));
    glow.addColorStop(1, 'rgba(19,19,18,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

${DRAWS[o.draw]}

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
  fs.writeFileSync(o.file, page(o));
  console.log(o.file, fs.statSync(o.file).size, 'bytes');
}
