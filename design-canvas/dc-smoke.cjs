/* Smoke test for artboards.

   The failure this exists to catch: an artboard whose draw() throws on the
   first line and leaves a blank canvas. Nothing about the HTML looks wrong,
   the file is the right size, and the page renders its background and its
   type perfectly. Five artboards shipped that way because grid.js does not
   define GMAX.

   So: actually execute each artboard's script. Stub DCLogic and a canvas
   context that swallows every call, instantiate the component, run the
   lifecycle, and report anything that throws. This does not prove a drawing
   looks right. It proves it ran. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');

/* Mid grey, not zeroes. A board that paints its density field onto an
   offscreen canvas and reads it back gets nothing from a buffer of zeroes, so
   the subject vanishes and the board reports blank when it is fine. */
function greyPixels(w, h) {
  const n = Math.max(4, (w | 0) * (h | 0) * 4);
  const a = new Uint8ClampedArray(n);
  a.fill(128);
  return a;
}

function stubCtx() {
  const grad = { addColorStop() {} };
  const target = {
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    createPattern: () => ({ setTransform() {} }),
    measureText: () => ({ width: 40 }),
    getImageData: (x, y, w, h) => ({ width: w, height: h, data: greyPixels(w, h) }),
    createImageData: (w, h) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
    canvas: null
  };
  return new Proxy(target, {
    get(t, p) {
      if (p in t) return t[p];
      // Unknown member: usable as a method or read as a settable property.
      return function () { return undefined; };
    },
    set() { return true; }
  });
}

function stubCanvas(w, h) {
  const c = { width: w, height: h, style: {}, getContext: () => stubCtx() };
  return c;
}

function run(file) {
  const src = fs.readFileSync(file, 'utf8');
  const m = src.match(/<script data-dc-script[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return { file, ok: true, note: 'no script' };
  const body = m[1];

  // Canvas dimensions declared in the markup, so the stub matches the real one.
  const cm = src.match(/<canvas[^>]*width="(\d+)"[^>]*height="(\d+)"/);
  const CW = cm ? +cm[1] : 2560, CH = cm ? +cm[2] : 1440;

  const errors = [];
  const sandbox = {
    Math, JSON, Date, console,
    Uint8ClampedArray, Array, Object, String, Number,
    requestAnimationFrame: () => {},
    /* fxGrainTile builds its noise on an offscreen canvas, so the stub needs
       a document that can make one. Without createElement every board that
       carries grain throws, which is what this check exists to notice. */
    document: {
      getElementById: () => stubCanvas(CW, CH),
      createElement: (tag) => (tag === 'canvas' ? stubCanvas(256, 256) : { style: {} })
    },
    window: {}
  };
  sandbox.DCLogic = class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(s) { Object.assign(this.state, s); }
    forceUpdate() {}
  };
  sandbox.globalThis = sandbox;
  vm.createContext(sandbox);

  try {
    vm.runInContext(body + '\n;globalThis.__C = Component;', sandbox, { filename: file });
  } catch (e) {
    return { file, ok: false, where: 'parse/preamble', err: e.message };
  }

  // Exercise at both ends of the chroma slider: 0 is a real setting, not a
  // debug affordance, and it takes different branches in the ramp maths.
  for (const chroma of [1, 0]) {
    try {
      const inst = new sandbox.__C({ chroma });
      if (typeof inst.renderVals === 'function') {
        const v = inst.renderVals();
        if (v && typeof v !== 'object') throw new Error('renderVals returned a non-object');
      }
      if (typeof inst.componentDidMount === 'function') inst.componentDidMount();
    } catch (e) {
      errors.push(`chroma=${chroma}: ${e.message}`);
    }
  }

  return errors.length ? { file, ok: false, where: 'runtime', err: errors.join(' | ') } : { file, ok: true };
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : fs.readdirSync('.').filter((f) => f.endsWith('.dc.html')).sort();

let bad = 0;
for (const f of files) {
  const r = run(f);
  if (r.ok) {
    console.log('  ok   ' + path.basename(f) + (r.note ? '  (' + r.note + ')' : ''));
  } else {
    bad++;
    console.log('  FAIL ' + path.basename(f) + '  [' + r.where + ']  ' + r.err);
  }
}
console.log('\n' + (files.length - bad) + ' of ' + files.length + ' artboards ran without throwing');
process.exit(bad ? 1 : 0);
