import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Opener from '../src/components/site/Opener.astro';
import Section from '../src/components/site/Section.astro';
import Ledger from '../src/components/site/Ledger.astro';

// The spec's page grammar, section 2. These check the markup the pages
// build on and the two style rules that keep the tokens test green: no hex
// in a style block, and no --g70 on sized text.
const src = (name: string) => readFileSync(`src/components/site/${name}.astro`, 'utf8');

describe('Opener', () => {
  it('renders kicker, title and standfirst in that order', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Opener, {
      props: { kicker: 'Eleven One Research', title: 'Work', standfirst: 'A standfirst.' },
    });
    const kicker = html.indexOf('Eleven One Research');
    const h1 = html.indexOf('<h1');
    const stand = html.indexOf('A standfirst.');
    expect(kicker).toBeGreaterThan(-1);
    expect(h1).toBeGreaterThan(kicker);
    expect(stand).toBeGreaterThan(h1);
    expect(html).toMatch(/<h1[^>]*>Work<\/h1>/);
  });

  it('renders without a kicker or a standfirst', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Opener, { props: { title: 'Not found' } });
    expect(html).toMatch(/<h1[^>]*>Not found<\/h1>/);
    expect(html).not.toMatch(/class="kicker"/);
    expect(html).not.toMatch(/class="stand"/);
  });
});

describe('Section', () => {
  it('renders the label as an h2 and the slot beside it', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Section, {
      props: { label: 'The practice', id: 'practice' },
      slots: { default: '<p>Body.</p>' },
    });
    expect(html).toMatch(/<section[^>]*id="practice"/);
    expect(html).toMatch(/<h2[^>]*>The practice<\/h2>/);
    expect(html).toContain('<p>Body.</p>');
  });
});

describe('Ledger', () => {
  it('renders one dt and dd per row, in order', async () => {
    const c = await AstroContainer.create();
    const html = await c.renderToString(Ledger, {
      props: { rows: [{ label: 'A', body: 'First.' }, { label: 'B', body: 'Second.' }] },
    });
    expect(html.match(/<dt/g)).toHaveLength(2);
    expect(html.match(/<dd/g)).toHaveLength(2);
    expect(html.indexOf('First.')).toBeLessThan(html.indexOf('Second.'));
  });
});

describe('the style rules the tokens test depends on', () => {
  for (const name of ['Opener', 'Section', 'Ledger']) {
    it(`${name} writes no hex and puts no sized text in --g70`, () => {
      const style = (src(name).match(/<style[^>]*>([\s\S]*?)<\/style>/) ?? [])[1] ?? '';
      expect(style, 'hex').not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
      expect(style, '--g70').not.toContain('--g70');
    });
  }
});
