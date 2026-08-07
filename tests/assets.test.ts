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
});
