import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

// Components are swept as well as pages: this file reads src/pages/*.astro
// directly, so anything mounted on a page from src/components/home or
// src/components/site would otherwise never have its own copy checked for
// an em dash, a first person pronoun, or an invented track record.
// src/components/site/* holds the page grammar every page composes, so its
// markup is on every page and gets the same sweep as the home components.
const homeComponents = [
  ...readdirSync('src/components/home').filter((f) => f.endsWith('.astro')).map((f) => `src/components/home/${f}`),
  ...readdirSync('src/components/site').filter((f) => f.endsWith('.astro')).map((f) => `src/components/site/${f}`),
];

const pages = [
  ...['index', 'work', 'method', 'about', '404'].map((p) => ({
    name: p,
    src: readFileSync(`src/pages/${p}.astro`, 'utf8'),
  })),
  ...homeComponents.map((path) => ({ name: path, src: readFileSync(path, 'utf8') })),
];

// Briefs are swept too, but separately. A brief's claims render straight
// onto its page, and an em dash, a first person pronoun or invented
// track-record language in one would reach a reader without any of the
// page sweeps above seeing it.
//
// Kept out of `pages` rather than folded in: a research brief legitimately
// reports dollar figures as data ("$1.44bn of revenue"), which is not the
// same claim as the site quoting a price for its own services. Folding
// briefs into `pages` would make the price check below fail on real,
// wanted content. Every other register rule (em dash, first person, the
// firm's own name, track record) applies to a brief exactly as it does to
// any other page, so briefs join those checks specifically.
const briefFiles = readdirSync('src/content/briefs')
  .filter((f) => f.endsWith('.mdx'))
  .map((f) => ({ name: `src/content/briefs/${f}`, src: readFileSync(`src/content/briefs/${f}`, 'utf8') }));
const withBriefs = [...pages, ...briefFiles];

describe('the structural pages', () => {
  it('never uses an em dash', () => {
    for (const p of withBriefs) expect(p.src, p.name).not.toContain('—');
  });

  it('never says I: the site speaks as a firm', () => {
    for (const p of withBriefs) {
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
    for (const p of withBriefs) expect(p.src, p.name).not.toMatch(/noland\s*advisory/i);
  });

  it('claims no price, because no real price exists yet', () => {
    // Every structural page, not just Reports, and a price written in words
    // is still a price: requiring a dollar sign lets "five hundred dollars"
    // ship. Briefs are deliberately excluded, see `withBriefs` above.
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
    for (const p of withBriefs) {
      expect(p.src, p.name).not.toMatch(/testimonial|case study|trusted by|our clients/i);
    }
  });
});

describe('site-wide navigation targets', () => {
  // Briefs left the nav and the footer on 2026-09-02 because nothing was
  // published and the first thing a reader clicked said so. The route stays,
  // so publishing Brief 001 is a content change. This case says: while no
  // brief carries a published date, no chrome links to the index. When one
  // does, this case is the thing to delete, and the link goes back.
  it('links to Briefs from nowhere while nothing is published', () => {
    const published = readdirSync('src/content/briefs')
      .filter((f) => f.endsWith('.mdx'))
      .some((f) => !/^published:\s*null\s*$/m.test(readFileSync(`src/content/briefs/${f}`, 'utf8').split('---')[1] ?? ''));
    expect(published, 'a brief is published; put the Briefs link back and retire this case').toBe(false);
    const nav = readFileSync('src/components/Nav.astro', 'utf8');
    const footer = readFileSync('src/components/Footer.astro', 'utf8');
    expect(nav).not.toMatch(/href:\s*['"]\/briefs['"]/);
    expect(footer).not.toMatch(/href=["']\/briefs["']/);
  });

  it('carries Work, Method and About in the nav, in that order', () => {
    const nav = readFileSync('src/components/Nav.astro', 'utf8');
    const labels = [...nav.matchAll(/label:\s*['"]([^'"]+)['"]/g)].map((m) => m[1]);
    expect(labels).toEqual(['Work', 'Method', 'About']);
  });
});

describe('the contact address', () => {
  const about = readFileSync('src/pages/about.astro', 'utf8');

  // About carries the site's only route to a human. Nothing guarded it, and
  // it has already changed once. The failure that matters is silent: an
  // address that reads correctly on the page while the mailto behind it
  // points somewhere else, so mail is lost with nothing to notice it.
  //
  // Fault injection: change either the href or the link text alone and this
  // turns red; change both together and it stays green, which is correct,
  // since that is a deliberate address change rather than a drift.
  it('matches its own link text, so the href cannot drift from what is shown', () => {
    const link = about.match(/href="mailto:([^"]+)"\s*>([^<]+)</);
    expect(link, 'about.astro has no mailto link').toBeTruthy();
    expect(link![1].trim()).toBe(link![2].trim());
  });

  it('is on this brand, not a personal or other-brand domain', () => {
    const link = about.match(/href="mailto:([^"]+)"/);
    expect(link![1]).toMatch(/@elevenoneresearch\.com$/);
  });
});
