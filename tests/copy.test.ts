import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// This file holds the mechanical half of the voice rules for the site proper. The reading
// half (verdict labels, stitched comparisons, teaser leads) has no regex;
// see the noland-advisory-voice skill for why the attempt was abandoned.
// This file catches what a machine gets right: banned words, the plural
// first person, em dashes, and heading shape.
const FILES = [
  ...['index', 'work', 'method', 'about', '404'].map((p) => `src/pages/${p}.astro`),
  ...readdirSync('src/components/home').filter((f) => f.endsWith('.astro')).map((f) => `src/components/home/${f}`),
  ...readdirSync('src/components/site').filter((f) => f.endsWith('.astro')).map((f) => `src/components/site/${f}`),
  'src/components/Footer.astro',
  'src/components/Nav.astro',
];
const sources = FILES.map((name) => ({ name, src: readFileSync(name, 'utf8') }));

// Only markup and frontmatter strings are swept. A code comment explaining why
// a word is banned would otherwise trip the ban.
const withoutComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/<!--[\s\S]*?-->/g, '');

// These are the words the spec bars from the site proper (spec section 5.7). Each is
// either a Claude tell, a piece of the retired apparatus, or a phrase John
// has rejected on this brand or the sibling one.
const BANNED = [
  'apparatus', 'falsifier', 'load path', 'load-bearing', 'for a living', 'rather than',
  'hard to reverse', 'leverage', 'robust', 'seamless', 'comprehensive', 'holistic',
  'delve', 'landscape',
];

describe('the site copy', () => {
  it('uses no em dash', () => {
    for (const p of sources) expect(p.src, p.name).not.toContain('—');
  });

  it('uses none of the barred words', () => {
    for (const p of sources) {
      const s = withoutComments(p.src);
      for (const w of BANNED) {
        expect(s, `${p.name}: ${w}`).not.toMatch(new RegExp(`\\b${w.replace(/[-\s]/g, '[-\\s]')}\\b`, 'i'));
      }
    }
  });

  // "Working" as the noun for the method is barred; the verb and the
  // adjective are ordinary English, so only the article-plus-noun form is
  // matched.
  it('never calls the method the working', () => {
    for (const p of sources) expect(withoutComments(p.src), p.name).not.toMatch(/\b(its|the|their) working\b/i);
  });

  // The practice is one person and the site is in the third person. "We"
  // would be a fiction and "I" is barred by pages.test.ts.
  it('never says we or our', () => {
    for (const p of sources) {
      const s = withoutComments(p.src);
      expect(s.match(/\b(we|our|ours|us)\b/gi) ?? [], p.name).toHaveLength(0);
    }
  });

  it('says decision-grade once, in the headline, and nowhere else', () => {
    let hits = 0;
    for (const p of sources) {
      const n = (withoutComments(p.src).match(/decision-grade/gi) ?? []).length;
      if (n > 0) expect(p.name).toBe('src/pages/index.astro');
      hits += n;
    }
    expect(hits).toBe(1);
  });

  // A section label is a flat noun phrase. Four words and no full stop is
  // the mechanical proxy; a label that needs more than that is a sentence.
  it('gives every section a label of at most four words with no full stop', () => {
    for (const p of sources) {
      for (const m of p.src.matchAll(/<Section\s+label="([^"]+)"/g)) {
        const label = m[1]!;
        expect(label.split(/\s+/).length, `${p.name}: "${label}"`).toBeLessThanOrEqual(4);
        expect(label, `${p.name}: "${label}"`).not.toMatch(/\.$/);
      }
    }
  });
});
