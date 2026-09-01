/* How long does a board take to draw?

   This exists because a board shipped broken and no check could see it. The
   stipple board took five seconds to draw, the canvas runtime killed the
   preview with "the preview stopped answering the editor", and dc-smoke had
   passed it: the smoke stub makes every fill and stroke free, so it proves a
   board runs and says nothing about whether it runs in time.

   The numbers here are NOT browser numbers. The stub is a Proxy and charges
   for every context property access, while charging nothing for the drawing
   itself. It overstates JavaScript and understates paint. What it is good for
   is catching the order of magnitude that kills a preview, so the budget
   below is deliberately loose. */
const BUDGET = 1500;
const fs = require('fs');
const vm = require('vm');

function stubCtx() {
  const grad = { addColorStop() {} };
  const target = {
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => ({ setTransform() {} }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    measureText: () => ({ width: 40 }), canvas: null
  };
  return new Proxy(target, { get(t, p) { return p in t ? t[p] : function () {}; }, set() { return true; } });
}

let over = 0;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/<script data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!m) { console.log(file.padEnd(26) + 'no script'); continue; }

  // Every canvas on the page, at its declared size.
  const els = {};
  const re = /<canvas[^>]*id="([^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)"/g;
  let c, px = 0;
  while ((c = re.exec(src)) !== null) {
    els[c[1]] = { width: +c[2], height: +c[3], style: {}, getContext: () => stubCtx() };
    px += (+c[2]) * (+c[3]);
  }

  const sandbox = {
    Math, JSON, Date, console, Uint8ClampedArray, Array, Object, String, Number,
    requestAnimationFrame: () => {},
    document: {
      getElementById: (id) => els[id] || null,
      createElement: (t) => (t === 'canvas' ? { width: 0, height: 0, style: {}, getContext: () => stubCtx() } : { style: {} })
    },
    window: {}
  };
  sandbox.DCLogic = class { constructor(p) { this.props = p || {}; this.state = {}; } setState() {} forceUpdate() {} };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  const t0 = Date.now();
  vm.runInContext(m[1] + '\n;globalThis.__C = Component;', sandbox, { filename: file });
  const parsed = Date.now() - t0;
  const inst = new sandbox.__C({ chroma: 1 });
  const t1 = Date.now();
  try { inst.componentDidMount(); } catch (e) { console.log(file.padEnd(26) + 'THREW  ' + e.message); continue; }
  const drew = Date.now() - t1;
  const t2 = Date.now();
  inst.componentDidMount();
  const redrew = Date.now() - t2;

  const flag = drew > BUDGET ? '   <-- OVER BUDGET' : '';
  if (drew > BUDGET) over++;
  console.log(file.padEnd(26) +
    Object.keys(els).length + ' canvases  ' + (px / 1e6).toFixed(1) + 'Mpx  ' +
    'parse ' + String(parsed).padStart(4) + 'ms  first ' + String(drew).padStart(5) + 'ms  again ' +
    String(redrew).padStart(5) + 'ms' + flag);
}

console.log('\nbudget ' + BUDGET + 'ms per board (stub time, not browser time) — ' +
  (over ? over + ' over' : 'all inside'));
process.exit(over ? 1 : 0);
