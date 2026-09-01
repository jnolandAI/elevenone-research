const fs = require('fs');
eval(fs.readFileSync('_shared.js', 'utf8'));

// Mirror of Main.dc.html draw(), same constants, counting instead of painting.
function simulateA(cellCss, chroma) {
  const W = 2560, H = 1440, S = 2, cell = cellCss * S;
  const fx0 = 0.40 * W, fx1 = 1.06 * W, fy0 = 0.06 * H, fy1 = 1.10 * H;
  const cx = (fx0 + fx1) / 2, cy = (fy0 + fy1) / 2;
  const hw = (fx1 - fx0) / 2, hh = (fy1 - fy0) / 2;

  let totMax = 0;
  for (let i = 0; i <= 200; i++) {
    const m = i / 200; let tot = 0;
    for (let k = 0; k < KDE.length; k++) tot += sampleAt(KDE[k], m);
    if (tot > totMax) totMax = tot;
  }

  const ang = 15 * Math.PI / 180, cs = Math.cos(ang), sn = Math.sin(ang);
  const diag = Math.sqrt(W * W + H * H);
  const steps = Math.ceil(diag / cell) + 2;

  let drawn = 0, visited = 0, tMin = 1, tMax = 0, rMin = 1e9, rMax = 0, ampMax = 0;
  for (let a = -steps; a <= steps; a++) {
    for (let b = -steps; b <= steps; b++) {
      const lx = a * cell, ly = b * cell;
      const px = cx + lx * cs - ly * sn;
      const py = cy + lx * sn + ly * cs;
      if (px < -cell || px > W + cell || py < -cell || py > H + cell) continue;
      visited++;
      const ex = 1 - Math.pow((px - cx) / hw, 2);
      const ey = 1 - Math.pow((py - cy) / hh, 2);
      if (ex <= 0 || ey <= 0) continue;
      const m = (px - fx0) / (fx1 - fx0);
      if (m < 0 || m > 1) continue;
      let tot = 0, wsum = 0;
      for (let k = 0; k < KDE.length; k++) { const d = sampleAt(KDE[k], m); tot += d; wsum += k * d; }
      if (tot <= 0.001) continue;
      const t = m;
      const amp = (tot / totMax) * ex * ey;
      if (amp <= 0.004) continue;
      const r = cell * 0.5 * Math.pow(amp, 0.55) * 0.94;
      if (r < 0.35) continue;
      drawn++;
      if (t < tMin) tMin = t; if (t > tMax) tMax = t;
      if (r < rMin) rMin = r; if (r > rMax) rMax = r;
      if (amp > ampMax) ampMax = amp;
    }
  }
  return { drawn, visited, tMin, tMax, rMin, rMax, ampMax, totMax };
}

for (const cell of [5, 9, 18]) {
  const s = simulateA(cell, 0.15);
  console.log(`cell=${cell}px  drawn=${s.drawn}  of visited=${s.visited}  ` +
    `t ${s.tMin.toFixed(3)}..${s.tMax.toFixed(3)}  r ${s.rMin.toFixed(2)}..${s.rMax.toFixed(2)}px  ampMax=${s.ampMax.toFixed(3)}`);
}

// What hues does the cover field actually span?
const s = simulateA(9, 0.15);
const hex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
console.log('\nfield hue span:', hex(disp(s.tMin, 0.15)), 'to', hex(disp(s.tMax, 0.15)),
  `(H ${dispH(s.tMin).toFixed(0)} to ${dispH(s.tMax).toFixed(0)})`);

// Figure panel: does any cohort curve exceed the panel height?
let peak = 0;
for (let k = 0; k < KDE.length; k++) for (let i = 0; i < KDE[k].length; i++) if (KDE[k][i] > peak) peak = KDE[k][i];
console.log('\nfigure peak density (panel is normalised to this):', peak.toFixed(3));
console.log('per-cohort peaks:', KDE.map(a => Math.max(...a).toFixed(2)).join(', '));
