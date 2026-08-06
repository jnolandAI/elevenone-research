import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Mark from '../src/components/Mark.astro';

const render = async (props: Record<string, unknown>) => {
  const container = await AstroContainer.create();
  return container.renderToString(Mark, { props });
};

describe('the mark', () => {
  it('uses the small cut below 25px', async () => {
    const html = await render({ size: 19 });
    // the small cut is 23 dots; the display cut is 112
    expect((html.match(/<circle/g) ?? []).length).toBe(23);
  });

  it('uses the display cut at 25px and above', async () => {
    const html = await render({ size: 25 });
    expect((html.match(/<circle/g) ?? []).length).toBe(112);
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
