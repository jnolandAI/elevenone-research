import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

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
    expect(existsSync('references/legacy-imagery/Mist over still water.png')).toBe(true);
  });

  it('points both generators at public/assets', () => {
    expect(readFileSync('scripts/render_mark.py', 'utf8')).toContain('"public", "assets", "mark"');
    expect(readFileSync('scripts/render_dot.py', 'utf8')).toContain('"public", "assets", "dot"');
  });
});
