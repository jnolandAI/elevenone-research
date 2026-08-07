import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pages = ['reports', 'method', 'about', '404'].map((p) => ({
  name: p,
  src: readFileSync(`src/pages/${p}.astro`, 'utf8'),
}));

describe('the structural pages', () => {
  it('never uses an em dash', () => {
    for (const p of pages) expect(p.src, p.name).not.toContain('—');
  });

  it('never says I: the site speaks as a firm', () => {
    for (const p of pages) {
      expect(p.src.match(/\bI\b(?!nterface)/g) ?? [], p.name).toHaveLength(0);
    }
  });

  it('never mentions Noland Advisory, which is out of scope for this brand', () => {
    for (const p of pages) expect(p.src, p.name).not.toMatch(/Noland Advisory/i);
  });

  it('claims no price, because no real price exists yet', () => {
    // Every page, not just Reports, and a price written in words is still a
    // price: requiring a dollar sign lets "five hundred dollars" ship.
    for (const p of pages) {
      expect(p.src, p.name).not.toMatch(/\$\s?\d/);
      expect(p.src, p.name).not.toMatch(/\b(dollars?|USD)\b/i);
    }
  });

  it('claims no client, testimonial or track record', () => {
    for (const p of pages) {
      expect(p.src, p.name).not.toMatch(/testimonial|case study|trusted by|our clients/i);
    }
  });
});
