import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

describe('asset layout', () => {
  it('serves the mark, the dot renders and the datasets from public/assets', () => {
    expect(existsSync('public/assets/mark/mark.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-small.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-inverse.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-small-inverse.svg')).toBe(true);
    expect(existsSync('public/assets/dot/manifest.json')).toBe(true);
    expect(existsSync('public/assets/data/margin-cy2024.json')).toBe(true);
  });

  it('has no capitalised Assets directory left to break a case-sensitive host', () => {
    expect(existsSync('Assets')).toBe(false);
  });

  it('keeps the superseded AI imagery out of public, since public is published', () => {
    // Previously only checked that the references/ copy exists, which is
    // true regardless of whether public/ ALSO carries a copy. A test named
    // for keeping something OUT of public has to look inside public. Fault
    // injection: copying any one of these five files into public/assets
    // turns this red; deleting it green again.
    const legacyNames = readdirSync('references/legacy-imagery');
    expect(legacyNames.length).toBeGreaterThan(0);
    const publicNames = new Set(walk('public').map((f) => f.split(/[\\/]/).pop()));
    for (const name of legacyNames) {
      expect(publicNames.has(name), name).toBe(false);
    }
  });

  it('points both generators at public/assets', () => {
    expect(readFileSync('scripts/render_mark.py', 'utf8')).toContain('"public", "assets", "mark"');
    expect(readFileSync('scripts/render_dot.py', 'utf8')).toContain('"public", "assets", "dot"');
  });

  it('ships a WebP beside every dot PNG the site can reference', () => {
    const manifest = JSON.parse(readFileSync('public/assets/dot/manifest.json', 'utf8'));
    const pngs = Object.keys(manifest).filter((k) => k.endsWith('.png'));
    expect(pngs.length).toBeGreaterThan(0);
    for (const png of pngs) {
      const webp = png.replace(/\.png$/, '.webp');
      expect(existsSync(join('public/assets/dot', webp)), webp).toBe(true);
      expect(manifest[png].webp, png).toBe(webp);
    }
  });

  // The 955 KB grid hero shipped unnoticed because nothing was watching. This
  // is the thing that notices, and it watches the assets a browser actually
  // requests: the homepage hero and the six coverage cards. The other hero
  // renders live in public/ unreferenced, so their weight is repo size rather
  // than page weight and a ceiling on them would guard nothing.
  //
  // SHIPPED_HERO is coupled to the homepage's hero subject on purpose. Changing
  // which subject fronts the site is a deliberate act, and it should carry a
  // deliberate update here.
  //
  // Fault injection: pointing SHIPPED_HERO at a busier subject such as
  // datacenter-hero-dot (628 KB) turns this red. This test cannot catch a
  // switch away from lossless encoding: lossy WebP is smaller, not bigger, so
  // it stays green. See the losslessness test below for that guard.
  it('keeps every asset on the critical path under its byte ceiling', () => {
    const SHIPPED_HERO = 'grid-hero-dot.png';
    const HERO_CEILING_KB = 400;
    const CARD_CEILING_KB = 160;
    const manifest = JSON.parse(readFileSync('public/assets/dot/manifest.json', 'utf8'));

    const hero = manifest[SHIPPED_HERO];
    expect(hero?.webp, SHIPPED_HERO).toBeTruthy();
    const heroKb = statSync(join('public/assets/dot', hero.webp)).size / 1024;
    expect(heroKb, `${hero.webp} is ${heroKb.toFixed(0)} KB`).toBeLessThan(HERO_CEILING_KB);

    const cards = Object.values<any>(manifest).filter((m) => m.role === 'card' && m.webp);
    expect(cards).toHaveLength(6);
    for (const c of cards) {
      const kb = statSync(join('public/assets/dot', c.webp)).size / 1024;
      expect(kb, `${c.webp} is ${kb.toFixed(0)} KB`).toBeLessThan(CARD_CEILING_KB);
    }
  });

  // A byte ceiling cannot catch losing losslessness, because lossy WebP is
  // SMALLER: grid-hero re-encoded at quality 80 is 380 KB, comfortably under
  // the 400 KB ceiling. It is also blurred, which on a halftone lattice means
  // the dots smear into each other. That is the exact degradation this whole
  // pipeline exists to prevent, so it needs its own guard.
  //
  // A WebP names its own encoding in the container: bytes 12-15 hold the first
  // chunk tag, VP8L for lossless and "VP8 " for lossy. No image library needed.
  //
  // Fault injection: drop lossless=True from webp_derive.py, re-derive, and
  // this turns red while the byte-ceiling test stays green.
  it('encodes every derived WebP losslessly, since lossy blurs the dot lattice', () => {
    const manifest = JSON.parse(readFileSync('public/assets/dot/manifest.json', 'utf8'));
    const webps = Object.values<any>(manifest).map((m) => m.webp).filter(Boolean);
    expect(webps.length).toBeGreaterThan(0);
    for (const w of webps) {
      const head = readFileSync(join('public/assets/dot', w)).subarray(0, 16);
      expect(head.subarray(0, 4).toString('ascii'), w).toBe('RIFF');
      expect(head.subarray(8, 12).toString('ascii'), w).toBe('WEBP');
      expect(head.subarray(12, 16).toString('ascii'), `${w} is not lossless`).toBe('VP8L');
    }
  });

  // Node has no image decoder, and a WebP's container is always ARGB, so
  // "single-channel greyscale" cannot be asserted from the bytes. What can:
  // the derived WebP is not resampled from its source PNG (same pixel
  // dimensions), and for dot-mode assets, the darkest pixel is exactly
  // (19, 19, 18): the interface ink at #131312, decoded. This is the check
  // that would have caught webp_derive.py's "L" conversion rounding that
  // ink to (19, 19, 19), see scripts/webp_derive.py and
  // scripts/verify_dot_assets.py.
  //
  // Fault injection: reintroduce `im = im.convert("L")` in webp_derive.py,
  // re-derive, and this turns red while the byte-ceiling and losslessness
  // tests above stay green.
  it(
    'never resamples a derived WebP and never drifts the dot ink off #131312',
    () => {
      const raw = execFileSync('python', ['scripts/verify_dot_assets.py'], { encoding: 'utf8' });
      const report = JSON.parse(raw) as Record<
        string,
        { png_size: [number, number]; webp_size: [number, number]; mode: string; darkest?: [number, number, number] }
      >;
      const keys = Object.keys(report);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) {
        const entry = report[key]!;
        expect(entry.webp_size, key).toEqual(entry.png_size);
        if (entry.mode === 'dot') {
          expect(entry.darkest, key).toEqual([19, 19, 18]);
        }
      }
    },
    // Spawns a Python process that decodes every derived WebP, including
    // three 2880x1200 heroes: past vitest's 5000ms default on a loaded CI
    // box even after darkest_pixel() moved off a per-pixel scan.
    15000,
  );
});
