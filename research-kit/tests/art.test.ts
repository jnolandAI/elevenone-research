import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/**
 * The imagery pipeline, exercised without ever calling the API.
 *
 * Every test here runs generate-art in --dry-run or expects it to fail before
 * it would reach the network. A test suite that spends money on each run is a
 * suite people stop running.
 */

const GEN = 'research-kit/scripts/generate-art.mjs';
const CHK = 'research-kit/scripts/artcheck.mjs';

function run(script: string, args: string[]) {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, out: stdout, err: '' };
  } catch (e: any) {
    return { code: e.status ?? 1, out: e.stdout ?? '', err: e.stderr ?? '' };
  }
}

let dir: string;
let out: string;
let src: string;
let manifest: string;
let adapter: string;
let adapterNoDirection: string;

const DIRECTION = 'saturated single-subject colour-field photography, no people, no text';

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'artcheck-'));
  out = join(dir, 'art');
  src = join(dir, 'src');
  mkdirSync(out);
  mkdirSync(src);

  manifest = join(dir, 'manifest.json');
  writeFileSync(
    manifest,
    JSON.stringify({
      publicBase: '/assets/art',
      items: [
        {
          id: 'cover-one',
          role: 'cover',
          subject: 'A single steel tray on a seamless surface',
          alt: 'A steel tray standing alone on a seamless surface.',
        },
      ],
    }),
  );

  adapter = join(dir, 'adapter.css');
  writeFileSync(adapter, `:root {\n  --ct-art-direction: "${DIRECTION}";\n}\n`);

  adapterNoDirection = join(dir, 'bare.css');
  writeFileSync(adapterNoDirection, ':root { --ct-ground: #fff; }\n');

  writeFileSync(
    join(src, 'page.astro'),
    '<img src="/assets/art/cover-one.png" alt="A steel tray standing alone on a seamless surface." />',
  );
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('generate-art composes prompts from the contract, not from itself', () => {
  it('puts the subject first and the site direction after it', () => {
    const r = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r.code).toBe(0);
    // Subject leads: image models weight the opening of a prompt most, and the
    // subject is the part that differs per image.
    expect(r.out).toContain(`A single steel tray on a seamless surface. ${DIRECTION}`);
  });

  it('spends nothing and writes nothing on a dry run', () => {
    run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(existsSync(join(out, 'cover-one.png'))).toBe(false);
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
    writeFileSync(
      bad,
      JSON.stringify({ items: [{ id: 'x', role: 'hero', subject: 'A tray', alt: 'A tray on a surface.' }] }),
    );
    const r = run(GEN, ['--manifest', bad, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/role "hero" is not one of/);
  });

  it('skips an item whose recorded prompt hash is unchanged, so a rebuild is free', () => {
    const r1 = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r1.out).toMatch(/would generate\s+cover-one/);

    // Stand in for a generated image by writing what the generator would.
    writeFileSync(join(out, 'cover-one.png'), 'not-a-real-png');
    const prompt = `A single steel tray on a seamless surface. ${DIRECTION}`;
    const { createHash } = require('node:crypto');
    const promptHash = createHash('sha256')
      .update(`gpt-image-2|2560x1440|${prompt}`)
      .digest('hex')
      .slice(0, 16);
    writeFileSync(
      join(out, 'cover-one.json'),
      JSON.stringify({ id: 'cover-one', model: 'gpt-image-2', size: '2560x1440', prompt, promptHash }),
    );

    const r2 = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--dry-run']);
    expect(r2.out).toMatch(/skip\s+cover-one/);
  });
});

describe('the import path, for a subscription rather than an API key', () => {
  it('ingests a staged file and writes a record artcheck accepts as current', () => {
    // The defect this pins: the hash is computed from the model name that is
    // also recorded. Hashing with gpt-image-2 while recording chatgpt-ui
    // marked every imported image stale the moment it landed.
    const stage = join(dir, 'stage');
    mkdirSync(stage, { recursive: true });
    writeFileSync(join(stage, 'cover-one.png'), 'staged-bytes');

    const g = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--import', stage, '--force']);
    expect(g.code).toBe(0);
    expect(g.out).toMatch(/imported\s+cover-one/);

    const rec = JSON.parse(readFileSync(join(out, 'cover-one.json'), 'utf8'));
    expect(rec.source).toBe('imported');
    expect(rec.model).toBe('chatgpt-ui');

    const c = run(CHK, ['--manifest', manifest, '--out', out, '--src', src, '--adapter', adapter]);
    expect(c.out).toContain('clean');
    expect(c.code).toBe(0);
  });

  it('reports a staged file with the wrong extension rather than skipping it', () => {
    const stage2 = join(dir, 'stage2');
    mkdirSync(stage2, { recursive: true });
    writeFileSync(join(stage2, 'cover-one.webp'), 'x');
    const r = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--import', stage2, '--force']);
    expect(r.code).toBe(2);
    expect(r.err).toMatch(/found cover-one\.webp but the pages reference \.png/);
  });

  it('prints prompts alone, with no generation machinery around them', () => {
    const r = run(GEN, ['--manifest', manifest, '--out', out, '--adapter', adapter, '--prompts']);
    expect(r.code).toBe(0);
    expect(r.out).toContain('cover-one  [cover, 2560x1440]');
    expect(r.out).toContain(`A single steel tray on a seamless surface. ${DIRECTION}`);
    expect(r.out).not.toMatch(/would generate|skip /);
  });
});

describe('artcheck', () => {
  it('passes once the asset, the provenance and the alt are all present', () => {
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src, '--adapter', adapter]);
    expect(r.out).toContain('clean');
    expect(r.code).toBe(0);
  });

  it('fails on a missing asset', () => {
    rmSync(join(out, 'cover-one.png'));
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/no asset at/);
    writeFileSync(join(out, 'cover-one.png'), 'not-a-real-png');
  });

  it('fails on alt text that names the medium instead of the subject', () => {
    const bad = join(dir, 'bad-alt.json');
    writeFileSync(
      bad,
      JSON.stringify({
        publicBase: '/assets/art',
        items: [{ id: 'cover-one', role: 'cover', subject: 'A tray', alt: 'Cover image for the piece' }],
      }),
    );
    const r = run(CHK, ['--manifest', bad, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/opens by naming the medium/);
  });

  it('fails on an asset that no manifest entry claims', () => {
    writeFileSync(join(out, 'orphan.png'), 'x');
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/orphan\.png is on disk but not in the manifest/);
    rmSync(join(out, 'orphan.png'));
  });

  it('fails when a page references an id the manifest does not carry', () => {
    writeFileSync(join(src, 'stray.astro'), '<img src="/assets/art/ghost.png" alt="x" />');
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/references "ghost"/);
    rmSync(join(src, 'stray.astro'));
  });

  it('fails when the committed image was generated from a different prompt', () => {
    const moved = join(dir, 'moved.json');
    writeFileSync(
      moved,
      JSON.stringify({
        publicBase: '/assets/art',
        items: [
          {
            id: 'cover-one',
            role: 'cover',
            subject: 'A completely different subject',
            alt: 'A steel tray standing alone on a seamless surface.',
          },
        ],
      }),
    );
    const r = run(CHK, ['--manifest', moved, '--out', out, '--src', src, '--adapter', adapter]);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/generated from a different prompt/);
  });

  it('says so rather than passing silently when it cannot check staleness', () => {
    const r = run(CHK, ['--manifest', manifest, '--out', out, '--src', src]);
    expect(r.out).toMatch(/staleness not checked/);
  });
});
