import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// src/components/home/* is unchecked otherwise: this file only reads
// src/pages/*.astro directly, so a component mounted on a page (Working.astro
// on index.astro, say) never has its own copy swept for an em dash, a first
// person pronoun, or an invented track record.
const homeComponents = readdirSync('src/components/home')
  .filter((f) => f.endsWith('.astro'))
  .map((f) => `src/components/home/${f}`);

const pages = [
  ...['index', 'reports', 'method', 'about', '404'].map((p) => ({
    name: p,
    src: readFileSync(`src/pages/${p}.astro`, 'utf8'),
  })),
  ...homeComponents.map((path) => ({ name: path, src: readFileSync(path, 'utf8') })),
];

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

describe('site-wide navigation targets', () => {
  // The briefs index moved from / to /briefs. Every link labelled Briefs has
  // to move with it, and nothing did until a reviewer read the footer by hand.
  // Fault injection: point either link back at "/" and this turns red.
  it('sends the footer Briefs link to the briefs index, not the homepage', () => {
    const src = readFileSync('src/components/Footer.astro', 'utf8');
    const briefsLinks = [...src.matchAll(/href=["']([^"']+)["'][^>]*>\s*Briefs\s*</g)];
    expect(briefsLinks.length, 'Footer.astro has no Briefs link').toBeGreaterThan(0);
    for (const m of briefsLinks) expect(m[1], 'Footer.astro').toBe('/briefs');
  });

  it('sends the nav Briefs link to the briefs index, not the homepage', () => {
    // Nav builds its links from a data array, not literal anchors, so the
    // footer's text-based regex above has nothing to match here: the label
    // and href never appear next to rendered markup in this file, only in
    // the array entry. Match the entry itself instead.
    const src = readFileSync('src/components/Nav.astro', 'utf8');
    const entry = src.match(/key:\s*['"]briefs['"],\s*label:\s*['"]Briefs['"],\s*href:\s*['"]([^'"]+)['"]/);
    expect(entry, 'Nav.astro has no briefs link entry').toBeTruthy();
    expect(entry![1], 'Nav.astro').toBe('/briefs');
  });
});
