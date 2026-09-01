/* Is a palette actually vivid?

   "Looks dull" is a real complaint with a measurable cause, so measure it.
   Chroma over the ramp, sampled 41 times, against what sRGB would allow at
   the same lightness and hue. `used` is the fraction of the available ceiling
   the gradient actually takes: a member at 0.30 is leaving most of the space
   on the table, which is what the first palettes were doing everywhere. */
const vm = require('vm');
const fs = require('fs');
const { PALETTES } = require('./_palettes.cjs');
const { maxChroma } = require('./gamut.cjs');

const box = { Math };
vm.createContext(box);
vm.runInContext(fs.readFileSync(__dirname + '/_lang.js', 'utf8'), box);

for (const p of PALETTES) {
  console.log(p.key);
  for (const g of p.grads) {
    let sum = 0, peak = 0, used = 0, n = 0;
    for (let i = 0; i <= 40; i++) {
      const c = box.anchorRamp(g.a, i / 40, 1);
      const s = box.rgbToLch(c[0], c[1], c[2]);
      const ceil = maxChroma(s.L, s.H);
      sum += s.C; n++;
      if (s.C > peak) peak = s.C;
      used += ceil > 0.01 ? s.C / ceil : 0;
    }
    const mean = sum / n, frac = used / n;
    const flag = g.n.startsWith('Ash') && g.n === 'Ash' ? '' : (peak < 0.16 ? '  <-- flat' : '');
    console.log('   ' + g.n.padEnd(12) + 'mean ' + mean.toFixed(3) + '   peak ' + peak.toFixed(3) +
      '   uses ' + (frac * 100).toFixed(0) + '% of the ceiling' + flag);
  }
}
