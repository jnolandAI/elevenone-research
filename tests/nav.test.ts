import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Nav from '../src/components/Nav.astro';

const src = readFileSync('src/components/Nav.astro', 'utf8');
const base = readFileSync('src/layouts/Base.astro', 'utf8');

describe('the nav', () => {
  it('is light by default and carries no dark class', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Nav, { props: {} });
    expect(html).toMatch(/<header[^>]*class="nav"/);
  });

  it('goes dark on request and inverts the mark to match', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Nav, { props: { onDark: true } });
    expect(html).toMatch(/<header[^>]*class="nav dark"/);
    // The mark inlines its SVG, so the cut's filename never reaches the
    // output. The source is where the pairing is visible.
    expect(src).toMatch(/inverse=\{onDark\}/);
  });

  // A sticky transparent nav over a dark band is fine until the reader
  // scrolls past the band, where paper-coloured links over paper vanish.
  // On dark the nav stays where it is.
  it('is not sticky on dark', () => {
    expect(src).toMatch(/\.nav\.dark\s*\{[^}]*position:\s*relative/);
  });

  it('reads its height from the token, so the band can pull up behind it', () => {
    expect(src).toMatch(/height:\s*var\(--nav-h\)/);
    expect(src).not.toMatch(/padding-top:\s*14px;\s*padding-bottom:\s*14px/);
  });

  it('is handed onDark by the layout', () => {
    expect(base).toMatch(/dark\?:\s*boolean/);
    expect(base).toMatch(/<Nav[^>]*onDark=\{dark\}/);
  });
});
