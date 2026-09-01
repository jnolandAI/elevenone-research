/* Render artboards in a real browser so they can be LOOKED AT.

   Everything in this directory has been verified numerically: dc-smoke proves
   draw() ran, dc-paint proves it painted inside the frame. Neither proves the
   drawing looks like anything. Two rounds of colour work shipped without a
   human or an agent ever seeing a pixel.

   So: strip the <x-dc> wrapper, shim DCLogic, substitute renderVals() into the
   {{...}} slots, and write a plain HTML file that a browser can open. One page
   per sheet, artboards tiled, labelled. */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '_preview');

function convert(file) {
  const src = fs.readFileSync(file, 'utf8');
  const helmet = (src.match(/<helmet>([\s\S]*?)<\/helmet>/) || [, ''])[1];
  const scriptM = src.match(/<script data-dc-script([^>]*)>([\s\S]*?)<\/script>/);
  const js = scriptM ? scriptM[2] : 'class Component extends DCLogic {}';
  const propsAttr = (scriptM ? scriptM[1] : '').match(/data-props='([\s\S]*?)'/);
  let defaults = {};
  if (propsAttr) {
    try {
      const spec = JSON.parse(propsAttr[1].replace(/&quot;/g, '"'));
      for (const k of Object.keys(spec)) defaults[k] = spec[k].default;
    } catch (e) { /* no props */ }
  }
  let body = src
    .replace(/[\s\S]*<\/helmet>/, '')
    .replace(/<script data-dc-script[\s\S]*/, '')
    .replace(/<\/x-dc>[\s\S]*/, '');
  return { helmet, js, body, defaults };
}

/* The shim. Real support.js binds props to an editor panel; here they are
   frozen at their declared defaults, which is what an unedited board shows. */
const SHIM = `
class DCLogic {
  constructor(props) { this.props = props || {}; this.state = {}; }
  setState(s) { Object.assign(this.state, s); }
  forceUpdate() {}
}
function mount(id, html, defaults, factory) {
  var slot = document.getElementById(id);
  var C = factory();
  var inst = new C(defaults);
  var vals = (typeof inst.renderVals === 'function') ? (inst.renderVals() || {}) : {};
  var merged = Object.assign({}, defaults, vals);
  slot.innerHTML = html.replace(new RegExp('[{][{]([a-zA-Z0-9_]+)[}][}]', 'g'), function (m, k) {
    return merged[k] != null ? merged[k] : '';
  });
  if (typeof inst.componentDidMount === 'function') {
    try { inst.componentDidMount(); } catch (e) { console.error(id, e); }
  }
}
`;

/* Every artboard names its canvas `cv`. That is fine when each one is its own
   document, and fatal when four share this page: all four Components resolve
   getElementById('cv') to the first canvas, so board one is drawn four times
   and boards two to four stay blank. Prefix every id per board.

   Only LITERAL lookups are rewritten. A board that builds its id, as in
   getElementById('d' + i), gets its markup prefixed and its lookups left
   alone, so every element resolves null and the board renders empty. Write
   artboards with literal ids. */
function scope(c, prefix) {
  const ids = new Set();
  c.body.replace(/id="([A-Za-z][\w-]*)"/g, (m, id) => { ids.add(id); return m; });
  let body = c.body, js = c.js;
  for (const id of ids) {
    body = body.split('id="' + id + '"').join('id="' + prefix + id + '"');
    js = js.split("getElementById('" + id + "')").join("getElementById('" + prefix + id + "')");
    js = js.split('getElementById("' + id + '")').join('getElementById("' + prefix + id + '")');
  }
  return { ...c, body, js };
}

function sheet(files, name, opts) {
  opts = opts || {};
  const cols = opts.cols || 2;
  const boards = files.map((f, i) => {
    const c = scope(convert(f), 'b' + i + '_');
    const defaults = { ...c.defaults };
    const ov = { ...((opts.overrides || {}).all || {}), ...((opts.overrides || {})[i] || {}) };
    for (const [k, v] of Object.entries(ov)) {
      if (!(k in defaults)) continue;
      defaults[k] = /^-?[0-9.]+$/.test(v) ? Number(v) : v;
    }
    return { id: 'b' + i, label: path.basename(f, '.dc.html'), ...c, defaults };
  });
  const heads = boards.map((b) => b.helmet).join('\n');
  const cells = boards.map((b) => `
  <figure style="margin:0;">
    <figcaption style="font:11px ui-monospace,monospace;color:#888;padding:0 0 6px;">${b.label}</figcaption>
    <div id="${b.id}" style="display:inline-block;outline:1px solid #ddd;"></div>
  </figure>`).join('\n');
  const scripts = boards.map((b) => `
mount(${JSON.stringify(b.id)},
  ${JSON.stringify(b.body)},
  ${JSON.stringify(b.defaults)},
  function () { ${b.js}
    return Component; });`).join('\n');

  const html = `<!doctype html><html><head><meta charset="utf-8">
${heads}
<style>
  body { margin:0; padding:24px; background:${opts.bg || '#9a9a9a'}; }
  .grid { display:grid; grid-template-columns:repeat(${cols}, max-content); gap:36px 36px; }
</style>
</head><body>
<div class="grid">${cells}</div>
<script>${SHIM}${scripts}</script>
</body></html>`;
  fs.mkdirSync(OUT, { recursive: true });
  const dest = path.join(OUT, name + '.html');
  fs.writeFileSync(dest, html);
  return dest;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  let name = 'sheet', cols = 2, bg = '#9a9a9a';
  const overrides = {};
  const files = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name') name = args[++i];
    else if (args[i] === '--cols') cols = +args[++i];
    else if (args[i] === '--bg') bg = args[++i];
    // --set warmEnd=#FF7A1A applies to every board on the sheet, so a tweak
    // can be seen doing something without opening the published canvas
    // --set warmEnd=#FF7A1A applies to every board; --set 2:warmEnd=... to
    // board 2 only, so one sheet can show a tweak across its range
    else if (args[i] === '--set') {
      const [k, ...v] = args[++i].split('=');
      const m = k.match(/^(\d+):(.+)$/);
      if (m) { (overrides[+m[1]] = overrides[+m[1]] || {})[m[2]] = v.join('='); }
      else { (overrides.all = overrides.all || {})[k] = v.join('='); }
    }
    else files.push(args[i]);
  }
  const dest = sheet(files, name, { cols, bg, overrides });
  console.log('wrote ' + dest + '  (' + files.length + ' boards)');
}

module.exports = { sheet, convert };
