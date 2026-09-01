/* Invariants for the locked set.

   "Locked" has to mean something a change can violate, or it is just a word
   in a README. Everything here is a property the set must hold for downstream
   code to be able to trust gradients.json. */
const vm = require('vm');
const fs = require('fs');
const { GRADIENTS } = require('./_gradients.cjs');
const { inGamut, maxChroma } = require('./gamut.cjs');

const box = { Math };
vm.createContext(box);
vm.runInContext(fs.readFileSync(__dirname + '/_lang.js', 'utf8'), box);

const fails = [];
const warn = [];
const fail = (m) => fails.push(m);

// Identity. Downstream code keys off these.
const ids = GRADIENTS.map((g) => g.id);
if (new Set(ids).size !== ids.length) fail('ids are not unique');
for (const id of ids) if (!/^[a-z][a-z0-9-]*$/.test(id)) fail('id is not a token: ' + id);
if (GRADIENTS.length !== 11) fail('expected 11 gradients, found ' + GRADIENTS.length);

for (const g of GRADIENTS) {
  // Anchors have to be reachable, or the stops are a different gradient from
  // the anchors and the two disagree about what the thing is.
  for (const [L, C, H] of g.anchors) {
    if (!inGamut(L, C, H)) fail(g.id + ': anchor L' + L + ' C' + C + ' H' + H + ' is outside sRGB');
    if (L < 0 || L > 1) fail(g.id + ': lightness out of range');
  }
  if (g.stops.length !== 9) fail(g.id + ': expected 9 stops');
  for (const s of g.stops) if (!/^#[0-9A-F]{6}$/.test(s)) fail(g.id + ': bad stop ' + s);

  /* A gradient has to go somewhere. The two quiet members are allowed to be
     quiet, but nothing else may be flat by accident, which is the failure the
     first palettes shipped with. */
  const quiet = g.id === 'slate';
  if (!quiet && g.peakChroma < 0.16) fail(g.id + ': flat, peak chroma ' + g.peakChroma);
  if (!quiet && g.ceilingUsed < 0.45) warn.push(g.id + ': uses only ' + Math.round(g.ceilingUsed * 100) + '% of the ceiling');

  /* No gradient may cross itself in hue: a ramp that turns around mid-path
     reads as two gradients spliced together. */
  const hs = [];
  for (let i = 0; i <= 40; i++) {
    const c = box.anchorRamp(g.anchors, i / 40, 1);
    const s = box.rgbToLch(c[0], c[1], c[2]);
    if (s.C >= 0.03) hs.push(s.H);
  }
  let flips = 0, dir = 0;
  for (let i = 1; i < hs.length; i++) {
    let d = ((hs[i] - hs[i - 1]) % 360 + 540) % 360 - 180;
    if (Math.abs(d) < 0.4) continue;
    const nd = d > 0 ? 1 : -1;
    if (dir !== 0 && nd !== dir) flips++;
    dir = nd;
  }
  if (flips > 3) warn.push(g.id + ': hue direction reverses ' + flips + ' times');
}

// gradients.json must match what the module says, or the export is stale.
if (fs.existsSync(__dirname + '/gradients.json')) {
  const spec = JSON.parse(fs.readFileSync(__dirname + '/gradients.json', 'utf8'));
  if (spec.gradients.length !== GRADIENTS.length) fail('gradients.json is stale: different count');
  for (const g of GRADIENTS) {
    const s = spec.gradients.find((x) => x.id === g.id);
    if (!s) { fail('gradients.json is missing ' + g.id); continue; }
    if (s.stops.join() !== g.stops.join()) fail('gradients.json is stale for ' + g.id);
  }
} else {
  fail('gradients.json has not been emitted');
}

for (const w of warn) console.log('  note  ' + w);
for (const f of fails) console.log('  FAIL  ' + f);
console.log('\n' + GRADIENTS.length + ' gradients, ' + fails.length + ' failures, ' + warn.length + ' notes');
process.exit(fails.length ? 1 : 0);
