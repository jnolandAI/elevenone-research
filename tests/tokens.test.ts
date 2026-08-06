import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/tokens.css', 'utf8');
const value = (name: string) => {
  const m = css.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  return m ? m[1]!.trim() : null;
};

describe('design tokens', () => {
  it('carries the twelve interface greys at their exact literals', () => {
    const greys: Record<string, string> = {
      w: '#FFFFFF', g05: '#FAFAF9', g10: '#F4F4F3', g20: '#EBEBEA',
      g30: '#DEDEDD', g40: '#C9C9C7', g50: '#AEAEAC', g60: '#8C8C8A',
      g70: '#6C6C6A', g80: '#4A4A48', g90: '#2B2B2A', ink: '#131312',
    };
    for (const [name, hex] of Object.entries(greys)) {
      expect(value(name), `--${name}`).toBe(hex);
    }
  });

  it('carries the two brief widths and no third', () => {
    expect(value('read')).toBe('624px');
    expect(value('doc')).toBe('1044px');
  });

  it('carries the four elevations and the rail geometry', () => {
    for (const n of ['e1', 'e2', 'e3', 'e4', 'rail', 'gut', 'ez']) {
      expect(value(n), `--${n}`).not.toBeNull();
    }
  });

  it('introduces no colour: every token is neutral or a shadow', () => {
    // any hex token must have R, G and B within 4 of each other
    const hexes = [...css.matchAll(/#([0-9A-Fa-f]{6})\b/g)].map((m) => m[1]!);
    for (const h of hexes) {
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
      const spread = Math.max(r!, g!, b!) - Math.min(r!, g!, b!);
      expect(spread, `#${h} is not neutral`).toBeLessThanOrEqual(4);
    }
  });
});
