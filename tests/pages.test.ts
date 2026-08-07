import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const pages = ['index', 'reports', 'method', 'about', '404'].map((p) => ({
  name: p,
  src: readFileSync(`src/pages/${p}.astro`, 'utf8'),
}));

describe('the structural pages', () => {
  it('never uses an em dash', () => {
    for (const p of pages) expect(p.src, p.name).not.toContain('—');
  });

  it('never says I: the site speaks as a firm', () => {
    for (const p of pages) {
      expect(p.src.match(/\bI\b/g) ?? [], p.name).toHaveLength(0);
      // "I" alone is not the whole of the first person singular. A regression
      // phrased as "my analysis" or "trust me" passes a check for the pronoun
      // and still breaks the register.
      expect(p.src.match(/\b(my|mine|myself)\b/gi) ?? [], p.name).toHaveLength(0);
    }
  });

  it('never mentions Noland Advisory, which is out of scope for this brand', () => {
    // Also catches the unspaced domain form. The constraint is about what a
    // reader sees, and a reader sees the brand name inside
    // john@nolandadvisory.com whether or not a space happens to separate it.
    for (const p of pages) expect(p.src, p.name).not.toMatch(/noland\s*advisory/i);
  });

  it('claims no price, because no real price exists yet', () => {
    // Every page, not just Reports, and a price written in words is still a
    // price: requiring a dollar sign lets "five hundred dollars" ship.
    for (const p of pages) {
      // Any whitespace, and a leading decimal point: $  500 and $.99 both
      // slip past one optional space followed by a digit.
      expect(p.src, p.name).not.toMatch(/[$£€]\s*[\d.]/);
      // No word boundary before the three-letter codes, because 500USD has
      // none: a digit and a letter are both word characters, so \b never
      // fires between them. But fully unanchored, this also matched inside
      // Europe, European, compounds and neural. dollars/pounds/euros are real
      // words, so \b works for them; USD/EUR/GBP instead use a negative
      // lookaround that only excludes a letter on either side, which still
      // allows a digit (500USD) while blocking European and neural.
      expect(p.src, p.name).not.toMatch(/\b(dollars?|pounds|euros)\b|(?<![A-Za-z])(USD|EUR|GBP)(?![A-Za-z])/i);
    }
  });

  it('claims no client, testimonial or track record', () => {
    for (const p of pages) {
      expect(p.src, p.name).not.toMatch(/testimonial|case study|trusted by|our clients/i);
    }
  });
});
