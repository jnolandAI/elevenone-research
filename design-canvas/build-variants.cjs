/* Render candidate directions as real artboards, off the canvas.

   A candidate has to be judged on a page with type on it, not on a colour
   swatch or a bare canvas panel, so this runs the same page generators the
   four live directions use. The variants are NOT in DIRS and NOT in
   canvas-directions.json: nothing here reaches the published canvas until one
   is chosen and promoted. */
const fs = require('fs');
const { PAGES } = require('./build-directions.cjs');
const { VARIANTS } = require('./_variants.cjs');

const want = process.argv.slice(2).length ? process.argv.slice(2) : PAGES.map(([n]) => n);
const out = [];
for (const d of VARIANTS) {
  for (const [pt, fn] of PAGES) {
    if (want.indexOf(pt) < 0) continue;
    const file = d.key + pt + '.dc.html';
    fs.writeFileSync(file, fn(d));
    out.push(file);
  }
}
console.log(out.length + ' variant artboards');

module.exports = { VARIANT_KEYS: VARIANTS.map((d) => d.key), VARIANT_DIRS: VARIANTS };
