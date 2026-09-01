const fs = require('fs');
const shared = fs.readFileSync('_shared.js', 'utf8');
eval(shared);
const D = JSON.parse(fs.readFileSync('data.json','utf8'));
const LAB = D.cohorts.map(c=>c.label), CN = D.cohorts.map(c=>c.n), P25 = D.cohorts.map(c=>c.p25), P50 = D.cohorts.map(c=>c.p50), P75 = D.cohorts.map(c=>c.p75);

const hex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = a => 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
const cr = (a, b) => { const l1 = Math.max(lum(a), lum(b)), l2 = Math.min(lum(a), lum(b)); return (l1 + 0.05) / (l2 + 0.05); };

const G10 = [244, 244, 243], W = [255, 255, 255], INK = [19, 19, 18];

console.log('--- dispersion ramp at C=0.15 (t, hex, oklch, relative luminance) ---');
for (let i = 0; i <= 10; i++) {
  const t = i / 10, c = disp(t, 0.15);
  console.log(t.toFixed(1), hex(c), `oklch(${dispL(t).toFixed(3)} 0.150 ${dispH(t).toFixed(0)})`, 'Y=' + lum(c).toFixed(4));
}

console.log('\n--- six cohort samples (t = i/5) ---');
const six = [];
for (let i = 0; i < 6; i++) {
  const t = i / 5, c = disp(t, 0.15);
  six.push(c);
  console.log(i, LAB[i].padEnd(16), hex(c), 'Y=' + lum(c).toFixed(4), 'vs g10 ' + cr(c, G10).toFixed(2) + ':1');
}

console.log('\n--- greyscale collapse: the six as relative luminance only ---');
console.log(six.map(c => lum(c).toFixed(4)).join('   '));
const ys = six.map(lum).sort((a, b) => a - b);
let minGap = 1;
for (let i = 1; i < ys.length; i++) minGap = Math.min(minGap, ys[i] - ys[i - 1]);
console.log('smallest luminance gap between any two:', minGap.toFixed(4));
console.log('pairwise contrast of the two closest:', ((Math.max(...ys) + 0.05) / (Math.min(...ys) + 0.05)).toFixed(2) + ':1 across the whole set');

console.log('\n--- accent candidates on the light substrate ---');
[[0.52, 0.18, 255], [0.50, 0.19, 258], [0.48, 0.20, 262], [0.45, 0.20, 262], [0.55, 0.17, 250]].forEach(p => {
  const c = ok2rgb(p[0], p[1], p[2]);
  console.log(`oklch(${p[0]} ${p[1]} ${p[2]})`, hex(c),
    'g10 ' + cr(c, G10).toFixed(2), '| white ' + cr(c, W).toFixed(2), '| ink ' + cr(c, INK).toFixed(2));
});

console.log('\n--- accent candidates on the dark substrate #131312 ---');
[[0.70, 0.15, 255], [0.72, 0.16, 250], [0.75, 0.14, 245]].forEach(p => {
  const c = ok2rgb(p[0], p[1], p[2]);
  console.log(`oklch(${p[0]} ${p[1]} ${p[2]})`, hex(c), 'vs ink ' + cr(c, INK).toFixed(2));
});

console.log('\n--- gradient stops for the unscreened field (t at 0, .2, .4, .6, .8, 1) ---');
console.log([0, 0.2, 0.4, 0.6, 0.8, 1].map(t => hex(disp(t, 0.15))).join(' '));

console.log('\n--- cohort spread, the thing claim B is about ---');
for (let i = 0; i < 6; i++) {
  console.log(LAB[i].padEnd(16), 'n=' + String(CN[i]).padStart(3),
    'p25 ' + P25[i].toFixed(3), 'p50 ' + P50[i].toFixed(3), 'p75 ' + P75[i].toFixed(3),
    'IQR ' + (P75[i] - P25[i]).toFixed(3));
}

console.log('\n=== MONOTONIC VARIANT: L ramps steadily down the arc ===');
function dispL2(t){ return 0.82 - 0.30 * t; }
function disp2(t, C){ return ok2rgb(dispL2(t), C, dispH(t)); }
const six2 = [];
for (let i = 0; i < 6; i++) {
  const t = i / 5, c = disp2(t, 0.14);
  six2.push(c);
  console.log(i, LAB[i].padEnd(16), hex(c), 'Y=' + lum(c).toFixed(4), 'vs g10 ' + cr(c, G10).toFixed(2) + ':1');
}
const ys2 = six2.map(lum);
let mono = true, minGap2 = 1;
for (let i = 1; i < ys2.length; i++) { if (ys2[i] >= ys2[i-1]) mono = false; minGap2 = Math.min(minGap2, Math.abs(ys2[i] - ys2[i-1])); }
console.log('strictly descending in luminance:', mono, '| smallest gap:', minGap2.toFixed(4));
console.log('adjacent contrast ratios:', ys2.slice(1).map((y,i)=>(((Math.max(y,ys2[i])+0.05)/(Math.min(y,ys2[i])+0.05)).toFixed(2))).join(' '));
console.log('stops:', [0,0.2,0.4,0.6,0.8,1].map(t=>hex(disp2(t,0.14))).join(' '));
