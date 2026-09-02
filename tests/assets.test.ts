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
  it('serves the mark, the field renders and the datasets from public/assets', () => {
    expect(existsSync('public/assets/mark/mark.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-small.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-micro.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-inverse.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-small-inverse.svg')).toBe(true);
    expect(existsSync('public/assets/mark/mark-micro-inverse.svg')).toBe(true);
    expect(existsSync('public/assets/mark/icon.svg')).toBe(true);
    expect(existsSync('public/assets/field/manifest.json')).toBe(true);
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

  // render_dot.py still targets public/assets/dot, which is right: that is
  // where a render lands when someone asks for one. The directory is simply
  // not committed any more. See docs/dot-imagery.md under Roles.
  it('points both generators at public/assets', () => {
    expect(readFileSync('scripts/render_mark.py', 'utf8')).toContain('"public", "assets", "mark"');
    expect(readFileSync('scripts/render_dot.py', 'utf8')).toContain('"public", "assets", "dot"');
  });

  it('ships every icon the layout links, since a renamed raster leaves a blank tab', () => {
    const layout = readFileSync('src/layouts/Base.astro', 'utf8');
    const hrefs = [...layout.matchAll(/href="(\/assets\/mark\/[^"]+)"/g)].map((m) => m[1]);
    // four link tags: the svg favicon, two png favicons, the touch icon
    expect(hrefs).toHaveLength(4);
    for (const href of hrefs) {
      expect(existsSync(`public${href}`)).toBe(true);
    }
  });

  it('points the SVG favicon at the icon family, never the page family', () => {
    // mark-small.svg still exists on disk and resolves fine, so the four-href
    // check above would stay green even if this link reverted to it. The page
    // family and the icon family must not share a path: rule 1 holds on a
    // page, and the ground is scoped to icon files, so the primary favicon
    // has to be icon.svg specifically, not merely a valid file.
    const layout = readFileSync('src/layouts/Base.astro', 'utf8');
    const match = layout.match(/<link rel="icon" type="image\/svg\+xml" href="([^"]+)"/);
    expect(match?.[1]).toBe('/assets/mark/icon.svg');
  });
});
