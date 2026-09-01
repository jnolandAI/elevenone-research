/* Is an artboard's template well formed?

   The runtime parses the body between <helmet> and the script as a Design
   Component template, not as loose HTML: every non-void element closed, every
   attribute quoted. A browser forgives all of that and the preview harness
   inherits the forgiveness, so a board can render perfectly here and fail
   where it actually ships. This checks the thing the runtime checks. */
const fs = require('fs');
const vm = require('vm');

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr']);

function body(src) {
  const a = src.indexOf('</helmet>');
  const b = src.indexOf('<script data-dc-script');
  if (a < 0 || b < 0) return null;
  return src.slice(a + 9, b).replace(/<\/x-dc>[\s\S]*$/, '');
}

function check(file) {
  const src = fs.readFileSync(file, 'utf8');
  const t = body(src);
  const bad = [];
  if (t == null) return ['no template found'];

  const stack = [];
  const tag = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
  let m;
  while ((m = tag.exec(t)) !== null) {
    const closing = m[1] === '/', name = m[2].toLowerCase(), attrs = m[3];
    const selfClosed = /\/\s*$/.test(attrs);
    if (!closing) {
      // Every attribute value quoted.
      const at = /([a-zA-Z_:][\w:.-]*)\s*=\s*([^\s"'>]+)/g;
      let a2;
      while ((a2 = at.exec(attrs)) !== null) bad.push(name + ': attribute ' + a2[1] + ' is unquoted');
      if (!VOID.has(name) && !selfClosed) stack.push({ name, at: m.index });
    } else {
      const top = stack.pop();
      if (!top) bad.push('stray </' + name + '>');
      else if (top.name !== name) bad.push('</' + name + '> closes <' + top.name + '>');
    }
  }
  for (const s of stack) bad.push('<' + s.name + '> is never closed');

  // Bare ampersands. The runtime reads the template as markup; a loose & is
  // the kind of thing a browser fixes silently and a parser does not.
  const amp = /&(?!#\d+;|#x[0-9a-fA-F]+;|[a-zA-Z][a-zA-Z0-9]{1,31};)/g;
  let a3, n = 0;
  while ((a3 = amp.exec(t)) !== null) n++;
  if (n) bad.push(n + ' bare ampersand' + (n > 1 ? 's' : ''));

  /* A template hole with no prop and no renderVals key behind it renders as
     literal braces on the page.

     renderVals is EXECUTED rather than pattern-matched. The first version read
     it with a regex and reported six finished boards as broken: one writes its
     keys computed, `out['r' + i]`, and the row boards write theirs on a single
     line, and neither shape is findable by looking. A check with false
     positives is worse than no check, because it trains you to skim it. */
  const holes = new Set();
  let h;
  const hx = /\{\{\s*([\w.$]+)\s*\}\}/g;
  while ((h = hx.exec(t)) !== null) holes.add(h[1]);
  if (holes.size) {
    const sm = src.match(/data-props=(['"])([\s\S]*?)/);
    let declared = new Set();
    if (sm) {
      try { declared = new Set(Object.keys(JSON.parse(sm[2].replace(/&quot;/g, '"')))); }
      catch (e) { bad.push('data-props does not parse'); }
    }
    let produced = new Set();
    const script = src.match(/<script data-dc-script[^>]*>([\s\S]*?)<\/script>/);
    if (script) {
      try {
        const grad = { addColorStop() {} };
        const ctx = new Proxy({
          createLinearGradient: () => grad, createRadialGradient: () => grad,
          createPattern: () => ({ setTransform() {} }), measureText: () => ({ width: 40 }),
          getImageData: (x, y, w2, h2) => ({ width: w2, height: h2, data: new Uint8ClampedArray(Math.max(4, w2 * h2 * 4)) }),
          createImageData: (w2, h2) => ({ width: w2, height: h2, data: new Uint8ClampedArray(Math.max(4, w2 * h2 * 4)) })
        }, { get(o, k) { return k in o ? o[k] : function () {}; }, set() { return true; } });
        const el = () => ({ width: 64, height: 64, style: {}, getContext: () => ctx });
        const box = {
          Math, JSON, console, Array, Object, String, Number, Uint8ClampedArray,
          requestAnimationFrame: () => {},
          document: { getElementById: el, createElement: el },
          window: {}
        };
        box.DCLogic = class { constructor(p) { this.props = p || {}; this.state = {}; } setState() {} forceUpdate() {} };
        box.globalThis = box;
        vm.createContext(box);
        vm.runInContext(script[1] + '\n;globalThis.__C = Component;', box);
        const inst = new box.__C(Object.fromEntries([...declared].map((k) => [k, 1])));
        if (typeof inst.renderVals === 'function') produced = new Set(Object.keys(inst.renderVals() || {}));
      } catch (e) {
        bad.push('renderVals threw: ' + e.message);
      }
    }
    for (const k of holes) {
      if (!declared.has(k) && !produced.has(k)) bad.push('hole {{' + k + '}} is neither a prop nor a renderVals key');
    }
  }
  return bad;
}

const files = process.argv.slice(2).length ? process.argv.slice(2)
  : fs.readdirSync('.').filter((f) => f.endsWith('.dc.html')).sort();
let bad = 0;
for (const f of files) {
  const r = check(f);
  if (r.length) { bad++; console.log('  FAIL ' + f); for (const x of r) console.log('         ' + x); }
}
console.log('\n' + (files.length - bad) + ' of ' + files.length + ' templates well formed');
process.exit(bad ? 1 : 0);
