#!/usr/bin/env node
/* The homepage band's field, baked.

   Runs the three draw calls AppHomeField.dc.html makes, in a real browser,
   against the same _fx.js and _lang.js the canvas boards run, and writes
   the result into public/assets/field/. Nothing here is a copy of a value
   from design-canvas: the anchors, the masses, the ground and the drawing
   code are all required or inlined from there, so a change to the board is
   a change to this render and --check will say so.

   Why a browser rather than a raster in node: so the field has ONE
   implementation. A second one here could drift from _fx.js and no check
   would notice. Why not CSS: fxFieldCss exists, but _fx.js records that
   grain in CSS at 0.06 is invisible, which is why grain went into the
   pixels, and a field without grain reads as rendered.

     node scripts/render_field.mjs              write PNGs, WebPs, manifest
     node scripts/render_field.mjs --check      re-render, compare PNG shas
     node scripts/render_field.mjs --measure    WebP sizes at four qualities

   The PNG is the render of record. --check compares only the PNG, because
   Chromium's WebP encoder is the one thing here most likely to change under
   a browser upgrade; tests/field.test.ts checks the WebP against the sha
   this script recorded at the last real render. */
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { chromium } from '@playwright/test';

const require = createRequire(import.meta.url);
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CANVAS = join(ROOT, 'design-canvas');
const OUT = join(ROOT, 'public', 'assets', 'field');

const A = require(join(CANVAS, '_applied.cjs'));
const gradientsFile = require(join(CANVAS, 'gradients.json'));
const GRADIENTS = Array.isArray(gradientsFile) ? gradientsFile : gradientsFile.gradients;

// docs/field.md fixes every one of these. Change them there first.
const GRADIENT = 'cobalt-iris';
const K = 1;
const COMPOSITE = 'lighter';
const GRAIN = 0.06;
const SEED = 17;
const SCALE = 1;
const QUALITY = 0.80;
const SIZES = [
  { name: 'home-wide', w: 2400, h: 900 },
  { name: 'home-narrow', w: 1200, h: 1200 },
];

// A_SITE is what the board draws with. The manifest claims it is
// cobalt-iris; make that claim true or stop.
const member = GRADIENTS.find((g) => g.id === GRADIENT);
if (!member) throw new Error(`${GRADIENT} is not in gradients.json`);
if (JSON.stringify(member.anchors) !== JSON.stringify(A.A_SITE)) {
  throw new Error(`_applied.cjs A_SITE is not the ${GRADIENT} anchors. The site runs one member; fix whichever moved.`);
}

const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const FX_SHA = sha(readFileSync(join(CANVAS, '_fx.js')));

function html(w, h) {
  return `<!doctype html><meta charset="utf-8">
<body style="margin:0"><canvas id="c" width="${w}" height="${h}"></canvas>
<script>
${A.D.LANGJS}
${A.D.FXJS}
var ANCHORS = ${JSON.stringify(A.A_SITE)};
function ramp(t, k) { return anchorRamp(ANCHORS, t, k); }
var c = document.getElementById('c'), ctx = c.getContext('2d');
var W = c.width, H = c.height;
ctx.fillStyle = ${JSON.stringify(A.DARK)}; ctx.fillRect(0, 0, W, H);
fxField(ctx, W, H, ramp, ${K}, ${JSON.stringify(A.BLOBS_HOME)}, ${JSON.stringify(COMPOSITE)});
fxGrain(ctx, W, H, ${GRAIN}, ${SEED}, ${SCALE});
window.__done = true;
</script></body>`;
}

const fromDataUrl = (url) => Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');

async function render(browser, size, quality) {
  const page = await browser.newPage();
  await page.setContent(html(size.w, size.h));
  await page.waitForFunction(() => window.__done === true);
  const png = fromDataUrl(await page.evaluate(() => document.getElementById('c').toDataURL('image/png')));
  const webp = fromDataUrl(await page.evaluate((q) => document.getElementById('c').toDataURL('image/webp', q), quality));
  await page.close();
  return { png, webp };
}

async function withBrowser(fn) {
  // The same software-GL flags render_dot.py launches with, so the render
  // does not depend on whatever GPU the machine has.
  const browser = await chromium.launch({
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

async function write() {
  mkdirSync(OUT, { recursive: true });
  const manifest = {};
  await withBrowser(async (browser) => {
    for (const size of SIZES) {
      const { png, webp } = await render(browser, size, QUALITY);
      writeFileSync(join(OUT, `${size.name}.png`), png);
      writeFileSync(join(OUT, `${size.name}.webp`), webp);
      manifest[`${size.name}.png`] = {
        w: size.w, h: size.h, webp: `${size.name}.webp`,
        gradient: GRADIENT, grain: GRAIN, seed: SEED, scale: SCALE, composite: COMPOSITE,
        fx_sha: FX_SHA, png_sha: sha(png), webp_sha: sha(webp),
      };
      console.log(`${size.name}  ${size.w}x${size.h}  png ${(png.length / 1024).toFixed(0)} KB  webp ${(webp.length / 1024).toFixed(0)} KB`);
    }
  });
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`wrote ${Object.keys(manifest).length} renders and manifest.json`);
}

async function check() {
  const manifestPath = join(OUT, 'manifest.json');
  if (!existsSync(manifestPath)) {
    console.error('no manifest to check against. Run without --check first.');
    return 1;
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const faults = [];
  if (Object.values(manifest).some((m) => m.fx_sha !== FX_SHA)) {
    faults.push('_fx.js has changed since the last render');
  }
  await withBrowser(async (browser) => {
    for (const size of SIZES) {
      const { png } = await render(browser, size, QUALITY);
      const want = manifest[`${size.name}.png`]?.png_sha;
      if (sha(png) !== want) faults.push(`${size.name}.png draws differently now`);
    }
  });
  if (faults.length) {
    for (const f of faults) console.error(`field: ${f}`);
    console.error('re-render with: node scripts/render_field.mjs');
    return 1;
  }
  console.log(`field: ${SIZES.length} renders match`);
  return 0;
}

async function measure() {
  const dir = join(tmpdir(), 'field-measure');
  mkdirSync(dir, { recursive: true });
  await withBrowser(async (browser) => {
    for (const size of SIZES) {
      for (const q of [0.7, 0.8, 0.85, 0.9]) {
        const { webp } = await render(browser, size, q);
        const file = join(dir, `${size.name}-q${Math.round(q * 100)}.webp`);
        writeFileSync(file, webp);
        console.log(`${size.name}  q${Math.round(q * 100)}  ${(webp.length / 1024).toFixed(0)} KB  ${file}`);
      }
    }
  });
  console.log('open the files above at 100 per cent and look for the grain before choosing');
}

const mode = process.argv[2];
const run = mode === '--check' ? check : mode === '--measure' ? measure : write;
run().then((code) => process.exit(code || 0), (e) => { console.error(e); process.exit(1); });
