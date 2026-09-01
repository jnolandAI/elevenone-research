const fs = require('fs');
eval(fs.readFileSync('_ramps.js', 'utf8'));

const hex = a => '#' + a.map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
const lin = c => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = a => 0.2126 * lin(a[0]) + 0.7152 * lin(a[1]) + 0.0722 * lin(a[2]);
const cr = (a, b) => { const l1 = Math.max(lum(a), lum(b)), l2 = Math.min(lum(a), lum(b)); return (l1 + 0.05) / (l2 + 0.05); };
const G10 = [244, 244, 243];

// How far around the hue wheel does each ramp actually travel? That is the
// number that decides whether something reads as a rainbow.
function hueOf(c) {
  const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const r = f(c[0]), g = f(c[1]), b = f(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  const C = Math.hypot(A, B);
  let H = Math.atan2(B, A) * 180 / Math.PI; if (H < 0) H += 360;
  return { H, C };
}

function report(name, f) {
  const N = 41, hs = [], out = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1), c = f(t);
    const { H, C } = hueOf(c);
    if (C > 0.012) hs.push(H);
    if (i % 8 === 0) out.push(t.toFixed(2) + ' ' + hex(c));
  }
  // widest gap on the circle tells us the true arc travelled
  let arc = 0;
  if (hs.length > 1) {
    const s = hs.slice().sort((a, b) => a - b);
    let gap = 360 - (s[s.length - 1] - s[0]);
    for (let i = 1; i < s.length; i++) gap = Math.max(gap, s[i] - s[i - 1]);
    arc = 360 - gap;
  }
  console.log(`\n${name}`);
  console.log('  ' + out.join('   '));
  console.log(`  hue arc travelled: ${arc.toFixed(0)} deg   (the full-spectrum version travels 280)`);
  const ends = [f(0), f(0.5), f(1)];
  console.log('  contrast vs #F4F4F3: ' + ends.map(c => cr(c, G10).toFixed(2)).join('  '));
}

report('D. Single hue, 250 deg', t => rampD(t));
report('E. Diverging, warm / near-white / cool', t => rampE(t));
report('F. Achromatic', t => rampF(t));
report('G. Two anchor, cream to violet-blue', t => rampG(t));

console.log('\n--- six ordinal samples from each, for a series scale ---');
[['D', rampD], ['E', rampE], ['G', rampG]].forEach(([n, f]) => {
  const s = [];
  for (let i = 0; i < 6; i++) s.push(hex(f(i / 5)));
  console.log(n + ': ' + s.join(' '));
});

console.log('\n--- does each survive greyscale? min luminance gap over six samples ---');
[['D', rampD], ['E', rampE], ['F', rampF], ['G', rampG]].forEach(([n, f]) => {
  const ys = [];
  for (let i = 0; i < 6; i++) ys.push(lum(f(i / 5)));
  let mono = true;
  for (let i = 1; i < ys.length; i++) if (ys[i] >= ys[i - 1]) mono = false;
  const sorted = ys.slice().sort((a, b) => a - b);
  let gap = 1;
  for (let i = 1; i < sorted.length; i++) gap = Math.min(gap, sorted[i] - sorted[i - 1]);
  console.log(`${n}: strictly descending ${mono}, min gap ${gap.toFixed(4)}`);
});
