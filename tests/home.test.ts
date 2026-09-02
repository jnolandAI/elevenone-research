import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import HomeHero from '../src/components/home/HomeHero.astro';

const hero = readFileSync('src/components/home/HomeHero.astro', 'utf8');
const index = readFileSync('src/pages/index.astro', 'utf8');

describe('the band', () => {
  // docs/field.md is the contract. The band is the only place on the site
  // proper where colour appears, and it appears as an image, which is why
  // the greyscale sweep in tokens.test.ts still passes: colour is a field,
  // never a value in the CSS.
  it('draws the field from public/assets/field and nothing from the dot library', () => {
    expect(hero).toMatch(/from\s+['"]\.\.\/\.\.\/lib\/field['"]/);
    expect(hero).not.toMatch(/assets\/dot|lib\/dot/);
  });

  it('renders one picture, one narrow source, one image with an empty alt', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(HomeHero, {
      props: { headline: 'A headline', standfirst: 'A standfirst.' },
    });
    expect(html.match(/<picture/g)).toHaveLength(1);
    expect(html.match(/<source /g)).toHaveLength(1);
    expect(html).toMatch(/<source[^>]*media="\(max-width: 899px\)"[^>]*srcset="\/assets\/field\/home-narrow\.webp"/);
    expect(html).toMatch(/<img[^>]*src="\/assets\/field\/home-wide\.webp"[^>]*alt=""/);
    expect(html).toMatch(/<img[^>]*width="2400"[^>]*height="900"/);
    expect(html).toMatch(/<img[^>]*fetchpriority="high"/);
  });

  it('gives the field an empty alt, since it is decorative', () => {
    expect(hero).toMatch(/alt=""/);
  });

  it('pulls up behind the nav by exactly the nav token', () => {
    expect(hero).toMatch(/margin-top:\s*calc\(-1 \* var\(--nav-h\)\)/);
    expect(hero).toMatch(/padding-top:\s*var\(--nav-h\)/);
  });

  it('holds the quiet edge under the headline at any crop', () => {
    expect(hero).toMatch(/object-fit:\s*cover/);
    expect(hero).toMatch(/object-position:\s*left center/);
  });

  it('ships no client script', () => {
    expect(hero).not.toMatch(/<script/);
  });

  // The headline is John's, word for word, and it is the one place the
  // phrase is used on the site.
  it('carries the headline exactly', () => {
    expect(index).toContain('headline="Decision-grade intelligence for operators and investors."');
  });
});

describe('the body of the homepage', () => {
  // Working.astro taught the claim apparatus on the homepage. The apparatus
  // came off every brand page on 2026-09-02; the homepage body is now four
  // ruled sections in the page grammar.
  it('no longer carries the working section', () => {
    expect(existsSync('src/components/home/Working.astro')).toBe(false);
    expect(index).not.toMatch(/Working/);
  });

  it('opens on the band and then runs four sections, in order', () => {
    const labels = [...index.matchAll(/<Section\s+label="([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(['The practice', 'Work', 'Background', 'Contact']);
    expect(index.indexOf('<HomeHero')).toBeLessThan(index.indexOf('<Section'));
  });

  it('lists three kinds of work in the ledger', () => {
    const rows = [...index.matchAll(/label:\s*'([^']+)'/g)].map((m) => m[1]);
    expect(rows).toEqual(['Commercial and market diligence', 'Sector and competitor research', 'Sector reports']);
  });

  it('reaches a human at the brand address', () => {
    const link = index.match(/href="mailto:([^"]+)"\s*>([^<]+)</);
    expect(link, 'index.astro has no mailto link').toBeTruthy();
    expect(link![1].trim()).toBe(link![2].trim());
    expect(link![1]).toMatch(/@elevenoneresearch\.com$/);
  });
});
