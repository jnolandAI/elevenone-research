import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import LoadPath from '../src/components/brief/LoadPath.astro';
import type { Claim, Standing } from '../src/content.config';

const c = (id: string, standing: Standing): Claim => ({
  id, standing,
  text: `Claim ${id} says something that could be wrong.`,
  qualifier: 'n=1',
  restsOn: 'x'.repeat(20), assumes: 'x'.repeat(20), breaksIf: 'x'.repeat(20),
  note: null,
});

type OffPath = { id: string; text: string } | null;

const render = async (claims: Claim[], members: string[], offPath: OffPath = null) => {
  const container = await AstroContainer.create();
  return container.renderToString(LoadPath, {
    props: { claims, spec: { conclusion: 'A peer median summarises a mixture.', members, offPath } },
  });
};

describe('the load path', () => {
  it('renders the conclusion at the weakest member standing', async () => {
    // The capped claim sits in the middle deliberately. With it last, an
    // implementation that just names the final member passes without ever
    // comparing standings.
    const html = await render([c('A', 'firm'), c('C', 'supported'), c('B', 'firm')], ['A', 'C', 'B']);
    expect(html).toContain('Rendered <b>supported</b>');
    expect(html).toContain('capped by claim <b>C</b>');
  });

  it('renders firm only when every member is firm', async () => {
    const html = await render([c('A', 'firm'), c('B', 'firm')], ['A', 'B']);
    expect(html).toContain('Rendered <b>firm</b>');
  });

  it('cannot be talked up: there is no prop that raises it', async () => {
    const html = await render([c('A', 'provisional'), c('B', 'firm')], ['A', 'B']);
    expect(html).toContain('Rendered <b>provisional</b>');
    expect(html).not.toContain('Rendered <b>firm</b>');
  });

  it('gives every member a stance the wire renderer can read', async () => {
    const html = await render([c('A', 'firm'), c('B', 'supported')], ['A', 'B']);
    expect(html).toContain('data-stance="firm"');
    expect(html).toContain('data-stance="supported"');
  });

  it('exposes the ids the client wire script depends on', async () => {
    const html = await render([c('A', 'firm')], ['A']);
    for (const id of ['id="path"', 'id="pathScreen"', 'id="wires"', 'id="concl"', 'id="members"']) {
      expect(html).toContain(id);
    }
  });

  it('leaves an off-path claim out of the object and says why', async () => {
    const html = await render(
      [c('A', 'firm'), c('D', 'provisional')],
      ['A'],
      { id: 'D', text: 'We hold it and we left it out because it is untested.' },
    );
    expect(html).toContain('Claim D is not in the path');
    expect((html.match(/data-stance/g) ?? []).length).toBe(1);
  });
});
