import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import Mark from '../src/components/Mark.astro';

const render = async (props: Record<string, unknown>) => {
  const container = await AstroContainer.create();
  return container.renderToString(Mark, { props });
};

const svg = (name: string) => readFileSync(`public/assets/mark/${name}`, 'utf8');
const circles = (s: string) => (s.match(/<circle/g) ?? []).length;
// The full cx/cy/r geometry of every dot, in file order. Mark.astro never
// touches a <circle> element, only the <svg> tag's title/aria-label/role, so
// a correctly-loaded cut's rendered circles are byte-identical to the source
// file's. Comparing a count alone proves nothing about which file loaded: a
// future retune that happened to land on another cut's dot count would still
// pass a count check. Comparing the full geometry proves the file.
const circleTags = (s: string) => s.match(/<circle[^>]*\/>/g) ?? [];

describe('the mark', () => {
  it('uses the micro cut from 16 to 20px, where the nav and the footer sit', async () => {
    // Nav.astro renders at 19 and Footer.astro at 17: the two places a reader
    // actually meets the mark, and the band the small cut was failing in
    const micro = circleTags(svg('mark-micro.svg'));
    for (const size of [16, 19, 20]) {
      expect(circleTags(await render({ size }))).toEqual(micro);
    }
  });

  it('uses the small cut from 21 to 32px', async () => {
    const small = circleTags(svg('mark-small.svg'));
    for (const size of [21, 32]) {
      expect(circleTags(await render({ size }))).toEqual(small);
    }
  });

  it('uses the display cut at 33px and above', async () => {
    // the floor moved from 25 to 33: 112 dots need that much room before the
    // drawing muddies, and nothing rendered between 25 and 32 anyway
    const display = circleTags(svg('mark.svg'));
    for (const size of [33, 64]) {
      expect(circleTags(await render({ size }))).toEqual(display);
    }
  });

  it('refuses to render below 16px, where the scatter is lost', async () => {
    await expect(render({ size: 15 })).rejects.toThrow(/16px/);
  });

  it('inks in the interface ink by default', async () => {
    const html = await render({ size: 19 });
    expect(html).toContain('#131312');
    expect(html).not.toContain('#FAFAF9');
  });

  it('inverts only to the one inverse value, on dark grounds', async () => {
    const html = await render({ size: 40, inverse: true });
    expect(html).toContain('#FAFAF9');
    // ink must be gone, not merely joined: there is no third value
    expect(html).not.toContain('#131312');
  });

  it('is decorative when it sits beside the wordmark', async () => {
    const html = await render({ size: 19 });
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<title>');
  });

  it('names itself when it stands alone', async () => {
    const html = await render({ size: 40, label: 'Eleven One Research' });
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Eleven One Research"');
    // exactly one: the source file carries its own, and an assertion that the
    // label is merely present passes with two
    expect(html.match(/aria-label=/g)).toHaveLength(1);
  });

  it('is never put on a plate and never given a shadow', async () => {
    const html = await render({ size: 40 });
    expect(html).not.toContain('border-radius');
    expect(html).not.toContain('box-shadow');
    expect(html).not.toContain('background');
    // a plate and a shadow can both be drawn in SVG, where none of the CSS
    // property names above appear
    expect(html).not.toMatch(/<rect/);
    expect(html).not.toContain('<filter');
  });

  it('holds its own box so a consumer can rely on the clear space', async () => {
    const html = await render({ size: 40 });
    expect(html).toContain('width:40px');
    expect(html).toContain('height:40px');
    // without these the mark stretches inline or shrinks in a flex row, and
    // the clear space rule becomes unenforceable by the caller
    expect(html).toContain('display:block');
    expect(html).toContain('flex:none');
  });
});

describe('the micro cut', () => {
  it('is a coarser drawing of the same field, not a smaller copy', () => {
    const micro = circles(svg('mark-micro.svg'));
    // the small cut is 23 and the display cut is 112. A halftone changes line
    // screen for newsprint; a mark changes it for a favicon.
    expect(micro).toBeGreaterThanOrEqual(9);
    expect(micro).toBeLessThanOrEqual(16);
    expect(micro).toBeLessThan(23);
  });

  it('draws the inverse a shade smaller, because light on dark reads larger', () => {
    // same lattice, so the same dot count, but less ink
    expect(circles(svg('mark-micro-inverse.svg'))).toBe(circles(svg('mark-micro.svg')));
    const r = (s: string) =>
      Math.max(...[...s.matchAll(/r="([\d.]+)"/g)].map((m) => Number(m[1])));
    expect(r(svg('mark-micro-inverse.svg'))).toBeLessThan(r(svg('mark-micro.svg')));
  });

  it('carries no ground, because rule 1 holds everywhere the mark sits on a page', () => {
    for (const f of ['mark.svg', 'mark-small.svg', 'mark-micro.svg',
                     'mark-inverse.svg', 'mark-small-inverse.svg', 'mark-micro-inverse.svg']) {
      expect(svg(f)).not.toMatch(/<rect/);
    }
  });

  it('leaves the display and small drawings exactly as they shipped', () => {
    expect(circles(svg('mark.svg'))).toBe(112);
    expect(circles(svg('mark-small.svg'))).toBe(23);
    expect(circles(svg('mark-inverse.svg'))).toBe(112);
    expect(circles(svg('mark-small-inverse.svg'))).toBe(23);
  });
});

describe('the icon family', () => {
  it('carries a full-bleed ground, because an icon slot is an opaque square', () => {
    const icon = svg('icon.svg');
    // one rect, reaching the frame: nothing is drawn around the mark, the file
    // simply has a ground. The browser or OS applies its own rounding.
    expect((icon.match(/<rect/g) ?? []).length).toBe(1);
    expect(icon).toMatch(/<rect width="100" height="100" fill="#131312"\/>/);
  });

  it('inverts its dots so the ground is the ink, not a third value', () => {
    expect(svg('icon.svg')).toContain('#FAFAF9');
  });

  it('uses the micro cut, which is what a 16px tab strip gets', () => {
    expect(circles(svg('icon.svg'))).toBe(circles(svg('mark-micro-inverse.svg')));
  });

  it('is never served onto a page by the component', async () => {
    // the page family and the icon family must not share a path: rule 1 holds
    // on a page and the ground is scoped to icon files
    for (const size of [16, 19, 20, 21, 32, 33, 64]) {
      expect(await render({ size })).not.toContain('<rect');
    }
  });
});
