import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Working from '../src/components/home/Working.astro';
import HomeHero from '../src/components/home/HomeHero.astro';

const src = readFileSync('src/components/home/Working.astro', 'utf8');

describe('the working section', () => {
  // A substring check on the raw source would pass unchanged if the entire
  // <dl> were deleted and the four words survived in a comment. Rendering
  // through the container ties the assertion to the construct that actually
  // shows a row: a <dt> label paired with a <dd> that has real content.
  it('renders four labelled rows, each with a non-empty value', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Working);
    for (const label of ['Claim', 'Source', 'Assumption', 'Falsifier']) {
      // [^>]* tolerates the data-astro-cid-* attributes the container
      // injects onto every element under its dev-mode compile.
      const match = html.match(new RegExp(`<dt[^>]*>${label}</dt>\\s*<dd[^>]*>([^<]+)</dd>`));
      expect(match, label).toBeTruthy();
      expect(match![1].trim().length, label).toBeGreaterThan(0);
    }
  });

  // Brief 001 is published: null and excluded from the sitemap, but / is
  // canonical and indexed. A filled-in figure here would put a finding on the
  // page a reader has no way to check, which is the exact failure the device
  // exists to prevent. Each row's own rendered value, not just the source
  // text, has to carry no digit: a percentage, a sample size or a date would
  // all read as the regression this guards against.
  it('presents no numeric finding, since nothing is published to back one', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Working);
    for (const label of ['Claim', 'Source', 'Assumption', 'Falsifier']) {
      const match = html.match(new RegExp(`<dt[^>]*>${label}</dt>\\s*<dd[^>]*>([^<]+)</dd>`));
      expect(match, label).toBeTruthy();
      expect(match![1], label).not.toMatch(/\d/);
    }
    const intro = html.match(/<p[^>]*class="intro"[^>]*>([\s\S]*?)<\/p>/);
    expect(intro, 'intro').toBeTruthy();
    expect(intro![1], 'intro').not.toMatch(/\d/);
  });

  // Claim.astro links to #c-{id} on the brief's claim rail and depends on the
  // highlight script. There is no rail here, so borrowing it would ship
  // anchors that resolve to nothing.
  it('does not reuse the interactive Claim component', () => {
    expect(src).not.toMatch(/import\s+Claim\s+from/);
    expect(src).not.toMatch(/href=\{?["'`]#c-/);
  });

  it('claims no track record, which the brand rules forbid implying', () => {
    expect(src).not.toMatch(/\b(client|clients|case study|case studies|testimonial)\b/i);
  });

  // The section used to derive its rows from Brief 001 via getEntry, which
  // put a real but unpublished finding on the indexed homepage. There is no
  // longer any data to derive: a regression back to a content dependency
  // would reintroduce that same failure by a different route.
  it('has no dependency on brief content', () => {
    expect(src).not.toMatch(/getEntry/);
    expect(src).not.toMatch(/astro:content/);
  });
});

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

  // The band is weather, not a subject. A decorative image announces itself
  // to a screen reader as nothing, which is correct.
  it('gives the field an empty alt, since it is decorative', () => {
    expect(hero).toMatch(/alt=""/);
  });

  // The nav's height and the band's pull-up are one token.
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

  it('opens the page on the band, with the coverage strip gone', () => {
    expect(index).toMatch(/<Base[^>]*\sdark[\s>]/);
    expect(index).not.toMatch(/Coverage/);
    expect(existsSync('src/components/home/Coverage.astro')).toBe(false);
  });
});
