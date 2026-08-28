import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * The imagery pipeline, exercised without ever calling the API.
 *
 * The child process runs with OPENAI_API_KEY removed, so a test CANNOT reach
 * the API even by mistake: the script exits 2 with "OPENAI_API_KEY is not set"
 * instead of buying a picture. This is enforced rather than intended. The
 * first version of this suite merely avoided the API by how its assertions
 * were written, and one test then took a wrong branch and spent real money on
 * a real image. A suite that can bill you is a suite people stop running.
 *
 * The fixtures use real PNG bytes rather than a string, because stage two of
 * the pipeline encodes the master with sharp and a fake master would fail
 * there for a reason that has nothing to do with what is being tested.
 */

const GEN = 'research-kit/scripts/generate-art.mjs';
const CHK = 'research-kit/scripts/artcheck.mjs';
const DIRECTION = 'saturated single-subject colour-field photography, no people, no text';
const SUBJECT = 'A single steel tray on a seamless surface';
const ALT = 'A steel tray standing alone on a seamless surface.';

const NO_KEY = { ...process.env };
delete NO_KEY.OPENAI_API_KEY;

function run(script: string, args: string[]) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: NO_KEY,
    });
    return { code: 0, out: stdout, err: '' };
  } catch (e: any) {
    return { code: e.status ?? 1, out: e.stdout ?? '', err: e.stderr ?? '' };
  }
}

let dir: string;
let out: string;
let src: string;
let originals: string;
let manifest: string;
let adapter: string;
let adapterNoDirection: string;
let pngBytes: Buffer;

/** What generate-art would hash for the single fixture item. */
function fixtureHash(model: string, subject = SUBJECT) {
  return createHash('sha256')
    .update(`${model}|2560x1440|${subject}. ${DIRECTION}`)
    .digest('hex')
    .slice(0, 16);
}

function writeManifest(path: string, over: Record<string, unknown> = {}) {
  writeFileSync(
    path,
    JSON.stringify({
      publicBase: '/assets/art',
      items: [{ id: 'cover-one', role: 'cover', subject: SUBJECT, alt: ALT }],
      ...over,
    }),
  );
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'artcheck-'));
  out = join(dir, 'art');
  src = join(dir, 'src');
  originals = join(dir, 'original');
  mkdirSync(out);
  mkdirSync(src);
  mkdirSync(originals);

  pngBytes = await sharp({
    create: { width: 32, height: 18, channels: 3, background: { r: 200, g: 160, b: 20 } },
  })
    .png()
    .toBuffer();

  manifest = join(dir, 'manifest.json');
  writeManifest(manifest);

  adapter = join(dir, 'adapter.css');
  writeFileSync(adapter, `:root {\n  --ct-art-direction: "${DIRECTION}";\n}\n`);

  adapterNoDirection = join(dir, 'bare.css');
  writeFileSync(adapterNoDirection, ':root { --ct-ground: #fff; }\n');

  // The page references the committed format, which defaults to jpg.
  writeFileSync(join(src, 'page.astro'), `<img src="/assets/art/cover-one.jpg" alt="${ALT}" />`);
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('generate-art composes prompts from the contract, not from itself', () => {
  it('puts the subject first and the site direction after it', () => {
    const r = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r.code).toBe(0);
    // Subject leads: image models weight the opening of a prompt most, and the
    // subject is the part that differs per image.
    expect(r.out).toContain(`${SUBJECT}. ${DIRECTION}`);
  });

  it('spends nothing and writes nothing on a dry run', () => {
    run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(existsSync(join(out, 'cover-one.jpg'))).toBe(false);
    expect(existsSync(join(out, 'cover-one.json'))).toBe(false);
  });

  it('refuses an adapter that declares no art direction', () => {
    // Composing without it would silently produce imagery in no house style,
    // which is worse than not generating.
    const r = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapterNoDirection, '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/no --ct-art-direction/);
  });

  it('refuses a role the contract does not define', () => {
    const bad = join(dir, 'bad-role.json');
    writeFileSync(bad, JSON.stringify({ items: [{ id: 'x', role: 'hero', subject: 'A tray', alt: ALT }] }));
    const r = run(GEN, ['--manifest', bad, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/role "hero" is not one of/);
  });

  it('refuses a format it cannot encode', () => {
    const bad = join(dir, 'bad-format.json');
    writeManifest(bad, { format: 'tiff' });
    const r = run(GEN, ['--manifest', bad, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/format "tiff" is not one of/);
  });
});

describe('the import path, for a subscription rather than an API key', () => {
  it('encodes the master to the committed format and keeps the master aside', () => {
    const stage = join(dir, 'stage');
    mkdirSync(stage, { recursive: true });
    writeFileSync(join(stage, 'cover-one.png'), pngBytes);

    const g = run(GEN, [
      '--manifest', manifest, '--out', out, '--adapter', adapter,
      '--originals', originals, '--import', stage, '--force',
    ]);
    expect(g.code).toBe(0);
    expect(g.out).toMatch(/imported\s+cover-one/);

    // The committed asset is the encoded one; the PNG master is not in --out.
    expect(existsSync(join(out, 'cover-one.jpg'))).toBe(true);
    expect(existsSync(join(out, 'cover-one.png'))).toBe(false);
    expect(existsSync(join(originals, 'cover-one.png'))).toBe(true);
  });

  it('writes a record artcheck accepts as current', () => {
    // The defect this pins: the hash is computed from the model name that is
    // also recorded. Hashing with gpt-image-2 while recording chatgpt-ui
    // marked every imported image stale the moment it landed.
    const rec = JSON.parse(readFileSync(join(out, 'cover-one.json'), 'utf8'));
    expect(rec.source).toBe('imported');
    expect(rec.model).toBe('chatgpt-ui');
    expect(rec.format).toBe('jpg');
    expect(rec.promptHash).toBe(fixtureHash('chatgpt-ui'));
    // Not asserting the encoded file is smaller: on a 32 by 18 fixture a JPEG
    // is larger than the PNG it came from. Compression is measured on the real
    // piece, where three 4MB masters encoded to 714KB of committed asset.
    expect(rec.sourceBytes).toBeGreaterThan(0);
    expect(rec.bytes).toBeGreaterThan(0);

    const c = run(CHK, ['--manifest', manifest, '--out', out, '--src', src, '--adapter', adapter]);
    expect(c.out).toContain('clean');
    expect(c.code).toBe(0);
  });

  it('re-encodes from the master rather than calling the API when only the format moved', () => {
    // The point of keeping masters: tuning quality must not cost an image.
    const webp = join(dir, 'as-webp.json');
    writeManifest(webp, { format: 'webp', quality: 70 });
    writeFileSync(join(src, 'page.astro'), `<img src="/assets/art/cover-one.webp" alt="${ALT}" />`);

    const r = run(GEN, ['--manifest', webp, '--out', out, '--adapter', adapter, '--originals', originals]);
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/re-encode\s+cover-one/);
    expect(r.out).toMatch(/0 API call\(s\), 1 re-encoded from disk/);
    // The master came in through the import path; re-encoding it in API mode
    // must not change who is recorded as having produced it.
    expect(JSON.parse(readFileSync(join(out, 'cover-one.json'), 'utf8')).model).toBe('chatgpt-ui');
    expect(existsSync(join(out, 'cover-one.webp'))).toBe(true);

    // Put the fixture back for the checks that follow.
    rmSync(join(out, 'cover-one.webp'));
    writeFileSync(join(src, 'page.astro'), `<img src="/assets/art/cover-one.jpg" alt="${ALT}" />`);
    run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--originals', originals]);
  });

  it('reports a staged file with the wrong extension rather than skipping it', () => {
    const stage2 = join(dir, 'stage2');
    mkdirSync(stage2, { recursive: true });
    writeFileSync(join(stage2, 'cover-one.webp'), pngBytes);
    const r = run(GEN, [
      '--manifest', manifest, '--out', out, '--adapter', adapter,
      '--originals', originals, '--import', stage2, '--force',
    ]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/found cover-one\.webp but the importer takes \.png masters/);
  });

  it('prints prompts alone, with no generation machinery around them', () => {
    const r = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--prompts']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('cover-one  [cover, 2560x1440]');
    expect(r.out).toContain(`${SUBJECT}. ${DIRECTION}`);
    expect(r.out).not.toMatch(/would produce|skip /);
  });
});

describe('the suite cannot spend money', () => {
  it('reaches the API path only to find no key, and stops there', () => {
    const fresh = mkdtempSync(join(tmpdir(), 'art-nokey-'));
    const m = join(fresh, 'manifest.json');
    writeManifest(m);
    const r = run(GEN, ['--manifest', m, '--out', join(fresh, 'art'), '--adapter', adapter]);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/OPENAI_API_KEY is not set/);
    rmSync(fresh, { recursive: true, force: true });
  });
});

describe('artcheck', () => {
  it('passes once the asset, the provenance and the alt are all present', () => {
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src, '--adapter', adapter]);
    expect(r.out).toContain('clean');
    expect(r.code).toBe(0);
  });

  it('fails on a missing asset', () => {
    const asset = join(out, 'cover-one.jpg');
    const keep = readFileSync(asset);
    rmSync(asset);
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no asset at/);
    writeFileSync(asset, keep);
  });

  it('fails on alt text that names the medium instead of the subject', () => {
    const bad = join(dir, 'bad-alt.json');
    writeManifest(bad, {
      items: [{ id: 'cover-one', role: 'cover', subject: SUBJECT, alt: 'Cover image for the piece' }],
    });
    const r = run(CHK, ['--manifest', bad, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/opens by naming the medium/);
  });

  it('fails on an asset that no manifest entry claims', () => {
    writeFileSync(join(out, 'orphan.jpg'), pngBytes);
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/orphan\.jpg is on disk but not in the manifest/);
    rmSync(join(out, 'orphan.jpg'));
  });

  it('fails when a page references an id the manifest does not carry', () => {
    writeFileSync(join(src, 'stray.astro'), '<img src="/assets/art/ghost.jpg" alt="x" />');
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/references "ghost"/);
    rmSync(join(src, 'stray.astro'));
  });

  it('fails when the committed image was generated from a different prompt', () => {
    const moved = join(dir, 'moved.json');
    writeManifest(moved, {
      items: [{ id: 'cover-one', role: 'cover', subject: 'A completely different subject', alt: ALT }],
    });
    const r = run(CHK, ['--manifest', moved, '--out', out, '--src', src, '--adapter', adapter]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/generated from a different prompt/);
  });

  it('says so rather than passing silently when it cannot check staleness', () => {
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.out).toMatch(/staleness not checked/);
  });
});
