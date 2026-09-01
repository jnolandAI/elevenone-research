/* Does the artboard actually paint, and does the paint land on the canvas?

   dc-smoke.cjs proves draw() ran. It does not prove anything appeared: a
   drawing with every alpha at zero, or one projected off the frame, runs
   perfectly and shows nothing. So run the same code against a ctx that
   RECORDS path coordinates, then report the painted bounding box against the
   canvas it has to sit in.

   Every canvas on the page gets its OWN recorder, keyed by element id, with
   its own declared size. Sharing one recorder across a page that has a hero
   and a figure on it merges two bounding boxes into a meaningless union and
   reports a spill on whichever frame happens to be smaller.

   fillRect is excluded from the bounding box on purpose: every dark page
   starts by flooding the frame, and counting that would make every bbox
   trivially perfect. */
const fs = require('fs');
const vm = require('vm');

/* Mid grey, not zeroes. A board that paints its density field onto an
   offscreen canvas and reads it back gets nothing from a buffer of zeroes, so
   the subject vanishes and the board reports blank when it is fine. */
function greyPixels(w, h) {
  const n = Math.max(4, (w | 0) * (h | 0) * 4);
  const a = new Uint8ClampedArray(n);
  a.fill(128);
  return a;
}

function recorder() {
  const rec = { ops: 0, fills: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity, pts: 0 };
  const note = (x, y) => {
    if (typeof x !== 'number' || typeof y !== 'number' || !isFinite(x) || !isFinite(y)) return;
    rec.pts++;
    if (x < rec.minX) rec.minX = x;
    if (y < rec.minY) rec.minY = y;
    if (x > rec.maxX) rec.maxX = x;
    if (y > rec.maxY) rec.maxY = y;
  };
  const grad = { addColorStop() {} };
  const target = {
    moveTo: note, lineTo: note,
    arc: (x, y, r) => { note(x - r, y - r); note(x + r, y + r); },
    rect: (x, y, w, h) => { note(x, y); note(x + w, y + h); },
    strokeRect: (x, y, w, h) => { note(x, y); note(x + w, y + h); rec.ops++; },
    fillText: (t, x, y) => note(x, y),
    strokeText: (t, x, y) => note(x, y),
    stroke: () => { rec.ops++; },
    fill: () => { rec.ops++; },
    fillRect: () => { rec.fills++; }, clearRect: () => {},
    beginPath: () => {}, closePath: () => {}, save: () => {}, restore: () => {},
    setLineDash: () => {}, translate: () => {}, rotate: () => {}, scale: () => {},
    createLinearGradient: () => grad, createRadialGradient: () => grad,
    createPattern: () => ({ setTransform() {} }),
    drawImage: () => {},
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: greyPixels(w, h) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    putImageData: () => {},
    measureText: () => ({ width: 40 })
  };
  const ctx = new Proxy(target, {
    get(t, p) { return p in t ? t[p] : function () {}; },
    set() { return true; }
  });
  return { ctx, rec };
}

/* Pages that draw with CSS instead of canvas still have to produce something. */
function runVals(body, file) {
  const sandbox = { Math, JSON, console, Array, Object, String, Number, Uint8ClampedArray, requestAnimationFrame: () => {}, document: { getElementById: () => null, createElement: () => ({ style: {}, getContext: () => recorder().ctx }) }, window: {} };
  sandbox.DCLogic = class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState() {} forceUpdate() {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(body + '\n;globalThis.__C = Component;', sandbox, { filename: file });
  const inst = new sandbox.__C({ chroma: 1 });
  return inst.renderVals ? Object.values(inst.renderVals() || {}) : [];
}

function run(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sm = src.match(/<script data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!sm) return { file, skip: 'no script' };

  const canvases = {};
  const re = /<canvas[^>]*id="([^"]+)"[^>]*width="(\d+)"[^>]*height="(\d+)"/g;
  let m;
  while ((m = re.exec(src)) !== null) canvases[m[1]] = { W: +m[2], H: +m[3] };
  if (!Object.keys(canvases).length) return { file, skip: 'no canvas', vals: runVals(sm[1], file) };

  const recs = {};
  const els = {};
  for (const id of Object.keys(canvases)) {
    const { ctx, rec } = recorder();
    recs[id] = rec;
    els[id] = { width: canvases[id].W, height: canvases[id].H, style: {}, getContext: () => ctx };
  }

  const sandbox = {
    Math, JSON, console, Array, Object, String, Number,
    requestAnimationFrame: () => {},
    /* The grain tile is built on an offscreen canvas, so the sandbox needs a
       document that can make one. Its recorder is thrown away: grain is not
       part of any bounding box. */
    document: {
      getElementById: (id) => els[id] || null,
      createElement: (tag) => (tag === 'canvas'
        ? { width: 0, height: 0, style: {}, getContext: () => recorder().ctx }
        : { style: {} })
    },
    Uint8ClampedArray,
    window: {}
  };
  sandbox.DCLogic = class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState() {} forceUpdate() {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(sm[1] + '\n;globalThis.__C = Component;', sandbox, { filename: file });

  const inst = new sandbox.__C({ chroma: 1 });
  if (inst.renderVals) inst.renderVals();
  inst.componentDidMount();

  return { file, canvases, recs };
}

/* Count PATH POINTS, not draw calls. A chart draws six long curves and an
   axis in thirty calls and twelve hundred points; a mesh draws thousands of
   short segments. Only the point count separates sparse from absent. */
const MIN_PTS = 200;

/* A field is allowed to bleed off the frame; the page clips it. Ten percent
   of the frame is bleed, past that it is a projection fault. */
const BLEED = 0.10;

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync('.').filter((f) => f.endsWith('.dc.html')).sort();

let bad = 0;
for (const f of files) {
  let r;
  try { r = run(f); } catch (e) { console.log('  ERROR ' + f + '  ' + e.message); bad++; continue; }

  if (r.skip) {
    if (r.vals) {
      const g = r.vals.filter((v) => typeof v === 'string' && v.indexOf('gradient(') > -1).length;
      // A page with no renderVals has nothing to produce; only a page that
      // declared one and returned no gradients is actually broken.
      const okv = g > 0 || r.vals.length === 0;
      if (!okv) bad++;
      console.log(`  ${okv ? 'ok   ' : 'EMPTY'} ${f.padEnd(30)} ${r.skip}, ${g} css gradients`);
    } else {
      console.log('  --    ' + f.padEnd(30) + r.skip);
    }
    continue;
  }

  const ids = Object.keys(r.canvases);
  for (const id of ids) {
    const q = r.recs[id], C = r.canvases[id];
    const bx = C.W * BLEED, by = C.H * BLEED;
    /* A background canvas that carries only a field paints entirely through
       fillRect, which is excluded from the bounding box on purpose. That is
       not the same as a blank frame: a blank frame has no fills either. */
    /* Sparse is not empty. A bar chart of six rows draws about forty path
       points and is complete; a mesh draws thousands. The point count alone
       called two finished figures blank. What separates them from a blank
       canvas is that a blank one issues no stroke or fill AT ALL, so the op
       count is the discriminator and the point count only says how dense the
       drawing is. */
    const fieldOnly = q.pts < MIN_PTS && q.fills > 0 && q.ops < 8;
    const sparse = q.pts < MIN_PTS && q.ops >= 8;
    const empty = q.pts < MIN_PTS && !fieldOnly && !sparse;
    const off = q.pts >= MIN_PTS && (q.minX < -bx || q.minY < -by || q.maxX > C.W + bx || q.maxY > C.H + by);
    const flag = empty ? 'EMPTY' : off ? 'SPILLS' : fieldOnly ? 'field' : sparse ? 'sparse' : 'ok   ';
    if (empty || off) bad++;
    const box = q.pts
      ? `x ${Math.round(q.minX)}..${Math.round(q.maxX)}  y ${Math.round(q.minY)}..${Math.round(q.maxY)}`
      : '(nothing drawn)';
    const label = ids.length > 1 ? f + ' #' + id : f;
    console.log(`  ${flag} ${label.padEnd(34)} ${String(q.pts).padStart(7)} pts  ${box}   frame ${C.W}x${C.H}`);
  }
}

console.log('\n' + (bad ? bad + ' canvases outside tolerance' : 'every canvas painted inside its frame'));
process.exit(bad ? 1 : 0);
