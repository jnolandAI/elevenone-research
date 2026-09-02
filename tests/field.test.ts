import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { fieldAsset } from '../src/lib/field';

// The contract this file holds the assets to is docs/field.md.
const DIR = 'public/assets/field';
const manifestPath = join(DIR, 'manifest.json');
const manifest: Record<string, any> = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, 'utf8'))
  : {};
const sha = (file: string) => createHash('sha256').update(readFileSync(file)).digest('hex');

// Set from the q80 measurement recorded in docs/field.md: measured KB times
// 1.2, rounded up to the nearest 10 KB.
const CEILING_KB: Record<string, number> = { 'home-wide.webp': 220, 'home-narrow.webp': 150 };

// A PNG's IHDR chunk starts at byte 16: four bytes of width, four of height,
// big-endian. No image library needed to read a size.
const pngSize = (file: string) => {
  const b = readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
};

describe('the field renders', () => {
  it('names exactly the two renders the band uses', () => {
    expect(Object.keys(manifest).sort()).toEqual(['home-narrow.png', 'home-wide.png']);
  });

  it('ships every file the manifest names, at the size it states', () => {
    for (const [png, m] of Object.entries(manifest)) {
      expect(existsSync(join(DIR, png)), png).toBe(true);
      expect(existsSync(join(DIR, m.webp)), m.webp).toBe(true);
      expect(pngSize(join(DIR, png)), png).toEqual({ w: m.w, h: m.h });
    }
    expect(manifest['home-wide.png']).toMatchObject({ w: 2400, h: 900 });
    expect(manifest['home-narrow.png']).toMatchObject({ w: 1200, h: 1200 });
  });

  it('matches the shas recorded at the last render', () => {
    for (const [png, m] of Object.entries(manifest)) {
      expect(sha(join(DIR, png)), png).toBe(m.png_sha);
      expect(sha(join(DIR, m.webp)), m.webp).toBe(m.webp_sha);
    }
  });

  // The cheap half of render_field.mjs --check. The full check needs a
  // browser; this runs on every npm test and catches the common case, which
  // is _fx.js changing under a render nobody redid.
  it('was drawn by the _fx.js on disk', () => {
    const fx = sha('design-canvas/_fx.js');
    for (const [png, m] of Object.entries(manifest)) {
      expect(m.fx_sha, `${png}: re-render with node scripts/render_field.mjs`).toBe(fx);
    }
  });

  it('records the member, grain and seed the spec fixes', () => {
    for (const m of Object.values(manifest)) {
      expect(m).toMatchObject({ gradient: 'cobalt-iris', grain: 0.06, seed: 17, scale: 1, composite: 'lighter' });
    }
  });

  it('keeps each WebP under its ceiling', () => {
    for (const m of Object.values(manifest)) {
      const kb = statSync(join(DIR, m.webp)).size / 1024;
      expect(kb, `${m.webp} is ${kb.toFixed(0)} KB`).toBeLessThan(CEILING_KB[m.webp]!);
    }
  });

  // The inverse of the guard the dot pipeline carried. A halftone lattice
  // must be lossless because lossy smears the dots; a grainy field is the
  // opposite case, where lossless WebP of noise runs to megabytes and lossy
  // at 0.80 keeps the grain.
  //
  // A WebP names its encoding in a chunk tag: "VP8 " is lossy, "VP8L" is
  // lossless. The dot guard read bytes 12 to 15 because Pillow writes the
  // simple container, where that chunk comes first. Chromium writes the
  // extended container: VP8X first, carrying the canvas size and an ICC
  // profile, and the image chunk after it. So walk the chunks to the one
  // that names the encoding rather than trusting the offset.
  const webpImageChunk = (file: string): string => {
    const b = readFileSync(file);
    expect(b.subarray(0, 4).toString('ascii'), file).toBe('RIFF');
    expect(b.subarray(8, 12).toString('ascii'), file).toBe('WEBP');
    let off = 12;
    while (off + 8 <= b.length) {
      const tag = b.subarray(off, off + 4).toString('ascii');
      const size = b.readUInt32LE(off + 4);
      if (tag === 'VP8 ' || tag === 'VP8L') return tag;
      off += 8 + size + (size & 1);
    }
    return '';
  };

  it('encodes each WebP lossy, since the field is noise and not a lattice', () => {
    for (const m of Object.values(manifest)) {
      expect(webpImageChunk(join(DIR, m.webp)), `${m.webp} is not lossy`).toBe('VP8 ');
    }
  });
});

describe('fieldAsset()', () => {
  it('resolves a render to the WebP the band ships, with the PNG beside it', () => {
    const a = fieldAsset('home-wide');
    expect(a.src).toBe('/assets/field/home-wide.webp');
    expect(a.png).toBe('/assets/field/home-wide.png');
    expect(a.width).toBe(2400);
    expect(a.height).toBe(900);
  });

  // A band that 404s still renders a structurally correct page, so the
  // build has to be the thing that fails.
  it('throws on a name the manifest does not carry, and says what it does carry', () => {
    expect(() => fieldAsset('home-square')).toThrow(/home-square/);
    expect(() => fieldAsset('home-square')).toThrow(/home-wide/);
  });

  it('throws when an entry has no derived webp', () => {
    const entries = { 'x.png': { w: 1, h: 1 } } as any;
    expect(() => fieldAsset('x', entries)).toThrow(/webp/i);
  });
});
