import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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
  // Fault injection: re-deriving either shipped asset without lossless WebP,
  // or pointing SHIPPED_HERO at a busier subject, turns this red.
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
});
