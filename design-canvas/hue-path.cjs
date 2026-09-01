/* What hues does a ramp actually pass through?

   The anchors say where it starts and stops. Blending happens in OKLab, so
   the path between them is not the arc the anchor hues suggest: that is the
   point of blending in Lab, and it is also why you cannot read a ramp off its
   anchor list. Convert every sample back to OKLCH and look. */
const fs = require('fs');
const vm = require('vm');
const { DIRS, anchorRamp } = require('./_dirs.cjs');

/* fieldFromEnds and paperFromEnds live in _lang.js, which is browser source
   rather than a module, so run it here to get at them. */
const box = { Math };
vm.createContext(box);
vm.runInContext(fs.readFileSync(__dirname + '/_lang.js', 'utf8'), box);
const { VARIANTS } = require('./_variants.cjs');

function rgbToOklch(c) {
  const f = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const r = f(c[0]), g = f(c[1]), b = f(c[2]);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  let H = Math.atan2(B, A) * 180 / Math.PI; if (H < 0) H += 360;
  return { L, C: Math.hypot(A, B), H };
}

/* The bands this exercise exists to avoid. Rose and violet are what was
   asked about; green was ruled out earlier and is still ruled out. */
const BANDS = [['purple/pink', 285, 355], ['green', 125, 185]];
const LIVE = 0.020;   // below this chroma a hue is not a colour anyone sees

function report(name, anchors) {
  const hits = {};
  const hs = [];
  for (let i = 0; i <= 40; i++) {
    const s = rgbToOklch(anchorRamp(anchors, i / 40, 1));
    if (s.C < LIVE) continue;
    hs.push(s.H);
    for (const [b, a, z] of BANDS) if (s.H >= a && s.H <= z) hits[b] = (hits[b] || 0) + 1;
  }
  /* Arc travelled, not max minus min. A ramp running cream to deep red crosses
     the 0/360 seam, and a linear range calls that 357 degrees when the eye
     sees about 60. Walk the samples and sum the steps the short way round. */
  let arc = 0;
  for (let i = 1; i < hs.length; i++) {
    let d = Math.abs(hs[i] - hs[i - 1]);
    if (d > 180) d = 360 - d;
    arc += d;
  }
  const bad = Object.entries(hits).map(([k, v]) => k + ' x' + v).join(', ');
  console.log('  ' + name.padEnd(26) + 'arc ' + String(Math.round(arc)).padStart(3) + ' deg   ' +
    (bad ? 'HITS ' + bad : 'clear'));
}

const all = [...DIRS.filter((d) => d.key === 'Ember'), ...VARIANTS];
for (const d of all) {
  console.log(d.key);
  report('dark (encoding)', d.dark);
  report('light (encoding + field)', d.light);
  report('fieldDark', d.fieldDark);

  /* The candidates do not paint fieldDark any more: their boards build the
     field from the tweak chips, so checking the anchor arrays checks a ramp
     nothing renders. This is the ramp on the page. Missing it let a claim
     that both candidates were clear survive a change that made one of them
     not clear. */
  if (d.fieldEnds) {
    const e = d.fieldEnds;
    report('field AS PAINTED, dark', box.fieldFromEnds(e.cool, e.warm, e.spread, e.balance));
    report('field AS PAINTED, paper', box.paperFromEnds(e.cool, e.warm, e.spread, e.balance));
  }
}
