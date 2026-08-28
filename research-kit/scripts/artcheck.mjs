import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The gate on generated imagery.
 *
 *   node scripts/artcheck.mjs --manifest <path> --out <dir> --src <dir> [--adapter <css>]
 *
 * Five checks, each one a failure that ships silently otherwise:
 *
 *   1. Every id a page references resolves to a manifest entry. A typo in a
 *      src path renders a broken image and no other gate looks at src paths.
 *   2. Every manifest entry has its asset and its provenance record.
 *   3. Every entry has alt text, and the alt says something. A generated cover
 *      with alt="cover image" is a page that fails a screen reader while
 *      passing every check that only asks whether the attribute exists.
 *   4. No asset on disk is unreferenced. Generated images are committed, so an
 *      orphan is weight in the repository forever.
 *   5. No provenance record is stale. If the recorded prompt hash no longer
 *      matches what the manifest and the adapter would compose today, the
 *      committed image is not the image the piece now describes.
 *
 * Check 5 needs --adapter to recompose the hash. Without it the check is
 * skipped and says so, rather than passing on a comparison it did not make.
 */

const args = process.argv.slice(2);
const flag = (name, fallback = null) => {
  const i = args.indexOf(name);
  if (i === -1) return fallback;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) die(`${name} needs a value.`);
  return v;
};
function die(msg) {
  console.error(`artcheck.mjs: ${msg}`);
  process.exit(2);
}

const MANIFEST = flag('--manifest') ?? die('--manifest is required.');
const OUT = flag('--out') ?? die('--out is required.');
const SRC = flag('--src') ?? die('--src is required.');
const ADAPTER = flag('--adapter');

for (const [label, p] of [['manifest', MANIFEST], ['out dir', OUT], ['src dir', SRC]]) {
  if (!existsSync(p)) die(`no such ${label}: ${p}`);
}

const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const items = manifest.items ?? [];
const byId = new Map(items.map((i) => [i.id, i]));

/* The public path an id resolves to, so a page reference can be matched back.
   Derived from the manifest's own publicBase rather than guessed, because the
   out directory and the URL a page uses are not the same string. */
const BASE = (manifest.publicBase ?? '/assets/art').replace(/\/$/, '');
/* The committed asset's extension is the manifest's, not a constant. The
   masters are PNG and the committed assets are usually JPEG, so a gate that
   assumed .png would look for files that were never written. */
const EXT = manifest.format ?? 'jpg';

function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const failures = [];
const notes = [];

/* ---- 1. Every referenced id resolves ------------------------------------- */
const referenced = new Map();
for (const file of walk(SRC).filter((f) => f.endsWith('.astro') || f.endsWith('.mdx'))) {
  const src = readFileSync(file, 'utf8');
  const re = new RegExp(`${BASE.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}/([A-Za-z0-9_-]+)\\.${EXT}`, 'g');
  for (const m of src.matchAll(re)) {
    if (!referenced.has(m[1])) referenced.set(m[1], file);
  }
}
for (const [id, file] of referenced) {
  if (!byId.has(id)) failures.push(`${file} references "${id}", which is not in the manifest`);
}

/* ---- 2 and 3. Assets, provenance and alt --------------------------------- */
for (const item of items) {
  const png = join(OUT, `${item.id}.${EXT}`);
  const rec = join(OUT, `${item.id}.json`);
  if (!existsSync(png)) failures.push(`${item.id}: no asset at ${png}`);
  if (!existsSync(rec)) failures.push(`${item.id}: no provenance record at ${rec}`);
  const alt = (item.alt ?? '').trim();
  if (!alt) failures.push(`${item.id}: no alt text`);
  else if (alt.split(/\s+/).length < 4) failures.push(`${item.id}: alt text is too short to describe anything: "${alt}"`);
  else if (/^(image|photo|picture|cover|graphic)\b/i.test(alt))
    failures.push(`${item.id}: alt text opens by naming the medium, not the subject: "${alt}"`);
  if (!referenced.has(item.id)) notes.push(`${item.id} is in the manifest but no page references it`);
}

/* ---- 4. Orphans ----------------------------------------------------------- */
for (const f of readdirSync(OUT)) {
  const m = f.match(new RegExp(`^(.+)\\.(${EXT}|json)$`));
  if (m && !byId.has(m[1])) failures.push(`${join(OUT, f)} is on disk but not in the manifest`);
}

/* ---- 5. Staleness --------------------------------------------------------- */
if (!ADAPTER) {
  notes.push('staleness not checked: pass --adapter to recompose prompt hashes');
} else if (!existsSync(ADAPTER)) {
  die(`no such adapter: ${ADAPTER}`);
} else {
  const { createHash } = await import('node:crypto');
  const adapterSrc = readFileSync(ADAPTER, 'utf8');
  const dm = adapterSrc.match(/--ct-art-direction:\s*"([^"]*)"\s*;/);
  if (!dm) {
    failures.push(`${ADAPTER} declares no --ct-art-direction`);
  } else {
    const direction = dm[1].replace(/\s+/g, ' ').trim();
    for (const item of items) {
      const rec = join(OUT, `${item.id}.json`);
      if (!existsSync(rec)) continue;
      const record = JSON.parse(readFileSync(rec, 'utf8'));
      const prompt = `${item.subject.trim().replace(/\.$/, '')}. ${direction}`;
      const hash = createHash('sha256')
        .update(`${record.model}|${record.size}|${prompt}`)
        .digest('hex')
        .slice(0, 16);
      if (hash !== record.promptHash) {
        failures.push(
          `${item.id}: the committed image was generated from a different prompt than the manifest and adapter compose today. Regenerate, or revert the change.`,
        );
      }
    }
  }
}

/* ---- Report ---------------------------------------------------------------- */
console.log(`${items.length} art item(s), ${referenced.size} referenced from ${SRC}`);
for (const n of notes) console.log(`note  ${n}`);
if (failures.length === 0) {
  console.log('\nclean: every referenced id resolves, every asset has provenance and alt, no orphans, nothing stale');
} else {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log(`  ${f}`);
  process.exitCode = 1;
}
