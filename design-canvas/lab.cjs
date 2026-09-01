/* Fast iteration surface for the fx primitives.

   Not an artboard. A plain page that inlines the same sources an artboard
   inlines and draws panels straight onto canvases, so a change is one node
   run and one reload instead of a full 41-board rebuild. Tune here, then move
   the settled numbers into _dirs.cjs. */
const fs = require('fs');
const path = require('path');
const D = require('./_dirs.cjs');

const SRC = D.LANGJS + '\n' + D.GRIDJS + '\n' + D.KDEJS + '\n' + fs.readFileSync(__dirname + '/_fx.js', 'utf8');

const only = process.argv.slice(2);
const dirs = only.length ? D.DIRS.filter((d) => only.indexOf(d.key) >= 0) : D.DIRS;

const panels = [];
dirs.forEach((d) => {
  panels.push({ id: d.key + '_dark', label: d.key + ' — dark field', w: 1280, h: 720, bg: D.DARK, kind: 'dark', d });
  panels.push({ id: d.key + '_light', label: d.key + ' — paper field + cloud', w: 1280, h: 720, bg: '#FFFFFF', kind: 'light', d });
});

const cells = panels.map((p) => `
  <figure style="margin:0">
    <figcaption style="font:11px ui-monospace,monospace;color:#bbb;padding:0 0 6px">${p.label}</figcaption>
    <canvas id="${p.id}" width="${p.w * 2}" height="${p.h * 2}" style="width:${p.w/2}px;height:${p.h/2}px;display:block;background:${p.bg};outline:1px solid #333"></canvas>
  </figure>`).join('\n');

const specs = JSON.stringify(dirs.map((d) => ({
  key: d.key, dark: d.dark, light: d.light, fieldDark: d.fieldDark, fieldLight: d.fieldLight,
  blend: d.blend, grain: d.grain, accent: d.accent, accentDark: d.accentDark
})));

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>body{margin:0;padding:24px;background:#1a1a1a}.g{display:grid;grid-template-columns:repeat(2,max-content);gap:32px}</style>
</head><body><div class="g">${cells}</div>
<script>
${SRC}
var DIRS = ${specs};
${fs.readFileSync(__dirname + '/_labdraw.js', 'utf8')}
DIRS.forEach(function (d) {
  drawDark(document.getElementById(d.key + '_dark'), d);
  drawLight(document.getElementById(d.key + '_light'), d);
});
</script></body></html>`;

fs.mkdirSync(path.join(__dirname, '_preview'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '_preview', 'lab.html'), html);
console.log('wrote _preview/lab.html  (' + panels.length + ' panels)');
