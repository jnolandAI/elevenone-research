/* One artboard per candidate, carrying all seven pages.

   John wants a tweak to move every page in a theme at once. The canvas editor
   cannot do that across artboards: artboards share nothing at runtime, no
   state, no logic, no tweaks, and there is no mechanism to make one board's
   chip drive another's. So the only way to get it is for the theme to BE one
   artboard. Seven pages in one frame, one set of chips, one Component. The
   sharing is structural rather than wired, which is why it cannot drift.

   This composes the page files the normal generator already writes rather
   than reimplementing them, so a row cannot fall behind the pages it is made
   of. The surgery below is on generated code whose exact shape is known,
   which is the only reason regex is safe here. */
const fs = require('fs');
const D = require('./_dirs.cjs');
const { VARIANT_DIRS } = require('./build-variants.cjs');
const { PAGE_TYPES } = require('./build-directions.cjs');

const GAP = 80, PAD = 32, LABEL = 26, PW = 1280, PH = 720;

function part(src, open, close) {
  const a = src.indexOf(open);
  if (a < 0) return '';
  const b = src.indexOf(close, a + open.length);
  return src.slice(a + open.length, b);
}

/* Every page names its canvas cv, bg or sp. Seven pages in one document means
   seven elements called cv, and getElementById returns the first: six pages
   would draw onto the first page's canvas and the rest would stay blank. This
   is the same fault the preview harness hit, and it is silent both times. */
function scopeIds(body, js, n) {
  const ids = new Set();
  body.replace(/id="([A-Za-z][\w-]*)"/g, (m, id) => { ids.add(id); return m; });
  for (const id of ids) {
    body = body.split('id="' + id + '"').join('id="p' + n + '_' + id + '"');
    js = js.split("getElementById('" + id + "')").join("getElementById('p" + n + "_" + id + "')");
  }
  return { body, js };
}

/* Turn a page's Component into methods on the row's Component. The lifecycle
   hooks go, because the row owns the lifecycle; everything else is renamed so
   seven of them can sit side by side. */
function methods(cls, n) {
  return cls
    .replace('componentDidMount() { this.draw(); }', '')
    .replace('componentDidUpdate() { this.draw(); }', '')
    .split('this.draw.bind(this)').join('this.draw_' + n + '.bind(this)')
    .replace('draw() {', 'draw_' + n + '() {')
    .replace('renderVals() {', 'vals_' + n + '() {')
    .replace('strip(arr, peak, k) {', 'strip_' + n + '(arr, peak, k) {')
    .split('this.strip(').join('this.strip_' + n + '(')
    .trim();
}

/* The page helmets carry rules that disagree: link colour and mark fill are
   one thing on a dark page and another on paper. In one document the last one
   wins and half the pages get the wrong one, so every rule is scoped to the
   page that declared it. */
function scopeCss(css, n) {
  return css
    .split('}')
    .map((chunk) => {
      const i = chunk.indexOf('{');
      if (i < 0) return '';
      const sel = chunk.slice(0, i).trim();
      const decl = chunk.slice(i + 1).trim();
      if (!sel || sel === 'body') return '';
      return '.pg' + n + ' ' + sel + ' { ' + decl + ' }';
    })
    .filter(Boolean)
    .join('\n    ');
}

function row(d) {
  const pages = PAGE_TYPES.map((pt) => ({
    pt,
    src: fs.readFileSync(d.key + pt + '.dc.html', 'utf8')
  }));

  const css = [];
  const cells = [];
  const meths = [];
  const draws = [];
  const vals = [];

  pages.forEach((p, n) => {
    const helmetCss = part(p.src, '<style>', '</style>');
    let body = part(p.src, '</helmet>', '<script data-dc-script');
    body = body.replace(/<\/x-dc>[\s\S]*$/, '').trim();
    /* Not part(src, '>', '</script>'): the first '>' is the doctype's and the
       first '</script>' closes the support.js tag in the head, so that window
       contains no Component at all and every page composed to nothing. The
       smoke test still passed, because nothing threw. */
    const sm = p.src.match(/<script data-dc-script[^>]*>([\s\S]*?)<\/script>/);
    const script = sm ? sm[1] : '';
    const marker = 'class Component extends DCLogic {';
    const at = script.indexOf(marker);
    let cls = at < 0 ? '' : script.slice(at + marker.length).replace(/\}\s*$/, '');

    const scoped = scopeIds(body, cls, n);
    body = scoped.body;
    cls = scoped.js.trim();

    css.push(scopeCss(helmetCss, n));
    cells.push(`
    <div class="pg${n}" style="display: flex; flex-direction: column; gap: 8px; flex-shrink: 0;">
      <span class="mono" style="font-size: 13px; color: #3A3A38; letter-spacing: 0.04em;">${p.pt.replace('CoverLight', 'Cover, light').toUpperCase()}</span>
      ${body}
    </div>`);

    if (cls) {
      meths.push('  ' + methods(cls, n));
      /* Not wrapped in try/catch. A page that throws should take the board
         down where the smoke test can see it, not leave six pages painted and
         one blank, which is the failure mode this directory keeps hitting. */
      if (cls.indexOf('draw() {') >= 0) draws.push('    this.draw_' + n + '();');
      if (cls.indexOf('renderVals() {') >= 0) vals.push('this.vals_' + n + '()');
    }
  });

  const W = PAD * 2 + PAGE_TYPES.length * PW + (PAGE_TYPES.length - 1) * GAP;
  const H = PAD * 2 + LABEL + 8 + PH;

  const body = `<div style="position: relative; width: ${W}px; height: ${H}px; overflow: hidden; background: #9A9A98; font-family: 'Familjen Grotesk', system-ui, sans-serif;">
  <div style="display: flex; gap: ${GAP}px; align-items: flex-start; padding: ${PAD}px;">${cells.join('\n')}
  </div>
</div>`;

  const e = d.fieldEnds;
  const dataProps = `{"chroma":{"editor":"range","default":1,"min":0,"max":1.6,"step":0.05,"section":"${d.name}","tsType":"number"}` +
    `,"grain":{"editor":"range","default":${d.grainAmp},"min":0,"max":0.16,"step":0.005,"section":"${d.name}","tsType":"number"}` +
    `,"coolEnd":{"editor":"color","default":"${e.cool}","section":"Field","tsType":"string"}` +
    `,"warmEnd":{"editor":"color","default":"${e.warm}","section":"Field","tsType":"string"}` +
    `,"warmSpread":{"editor":"range","default":${e.spread},"min":-40,"max":70,"step":1,"unit":"deg","section":"Field","tsType":"number"}` +
    `,"balance":{"editor":"range","default":${e.balance},"min":0.15,"max":0.85,"step":0.01,"section":"Field","tsType":"number"}}`;

  const js = `${D.LANGJS}
${D.GRIDJS}
${D.KDEJS}
${D.FXJS}
var SPREAD = [${D.SPREAD.join(',')}];
${D.RAMPS(d)}
class Component extends DCLogic {
  componentDidMount() { this.all(); }
  componentDidUpdate() { this.all(); }
  all() {
${draws.join('\n')}
  }
${meths.join('\n')}
  renderVals() { return Object.assign({}${vals.length ? ', ' + vals.join(', ') : ''}); }
}`;

  return { src: D.shell({ dark: false, d, body, js, props: dataProps }), w: W, h: H };
}

const out = [];
for (const d of VARIANT_DIRS) {
  const r = row(d);
  const file = d.key + 'Row.dc.html';
  fs.writeFileSync(file, r.src);
  out.push({ file, w: r.w, h: r.h });
  console.log(file.padEnd(26) + r.w + 'x' + r.h + '  ' + fs.statSync(file).size + ' bytes');
}
console.log('\n' + out.length + ' theme rows');

module.exports = { ROWS: out };
