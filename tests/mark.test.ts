import { describe, it, expect } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
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

// SHA-256 of each file's text with CRLF folded to LF, so a checkout that
// normalises line endings does not read as a changed drawing. The generator
// emits these four as a single line with no newline in it at all, so the fold
// is a guard against a future format change rather than something in play now.
const PROTECTED = ['mark.svg', 'mark-small.svg', 'mark-inverse.svg', 'mark-small-inverse.svg'];
const digests = (names: string[]) =>
  Object.fromEntries(
    names.map((n) => [
      n,
      createHash('sha256').update(svg(n).replace(/\r\n/g, '\n'), 'utf8').digest('hex'),
    ]),
  );
const SHIPPED_AT_1_0: Record<string, string> = {
  'mark.svg': '619f4b9d68d43b071101d0a442b332ac6b9e8609df4f687ed2a894a7a95b2441',
  'mark-small.svg': '77ff40da92104f024444f748d72ab11009ea0158da54986abde2a79dc14aa275',
  'mark-inverse.svg': '6241d7fbb1b0ac6217454fdb7acd39812b637e27782a8c0abb5db496c05f7a33',
  'mark-small-inverse.svg': '70ef43b2ede479864d7f5123065f677db448d8cb140e995806a36f392ae6dc8f',
};

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
    // These four files are the 1.0 drawings. Rule 7: a mark that exists in
    // two versions in the wild is two marks, so 1.1 adding a cut must not
    // move them by so much as a hundredth of a unit.
    //
    // Until this landed the assertion was a circle count, and a count does
    // not prove a drawing. GAMMA 1.20 to 1.15, JITTER to 0.60, JITTER to
    // 1.10, EDGE to 0.11 and SPAN to 0.88 each move every dot on the page
    // while leaving all four counts untouched, so five of six perturbations
    // of the shared constants passed a count check.
    //
    // The invariant was really being held by running `git diff --stat main`
    // by hand at each task on this branch. That stops working the moment
    // this merges and main becomes the new baseline. `--check` does not
    // close it either: it compares disk against what the current code
    // generates, so changing GAMMA and re-rendering makes --check green on
    // the new drawing. A committed digest is the only guard that survives
    // both. scripts/render_mark.py says these constants are shared with the
    // imagery engine and that a change there is expected to move the mark,
    // so the trigger is live rather than hypothetical.
    //
    // If this test goes red, the drawing changed. That is either a mistake,
    // or it is a new version of the mark: bump VERSION, re-export
    // everything, and only then update these digests. Updating them to make
    // a red test green is the failure this test exists to catch.
    expect(digests(PROTECTED)).toEqual(SHIPPED_AT_1_0);
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
    // Full geometry, not a count. icon.svg and mark-micro-inverse.svg are the
    // same call with and without a ground, so every cx, cy and r has to match
    // to the hundredth. A count check passes on any cut that happens to draw
    // eleven dots, which is the same weakness the 1.0 drawings had.
    expect(circleTags(svg('icon.svg'))).toEqual(circleTags(svg('mark-micro-inverse.svg')));
    expect(circleTags(svg('icon.svg')).length).toBeGreaterThan(0);
  });

  it('shows the same drawing as favicon-32.png, which shares its slot', () => {
    // Chromium and Firefox take the SVG favicon, Safari falls back to the
    // 32px PNG. Rule 7: two drawings in one slot, split by browser, is two
    // marks. The PNG is a raster and cannot be compared dot for dot, so the
    // agreement is asserted where it is decided, in the generator's tables.
    const gen = readFileSync('scripts/render_mark.py', 'utf8');
    const cutOf = (file: string) =>
      gen.match(new RegExp(`\\("${file.replace('.', '\\.')}",\\s*"(\\w+)"`))?.[1];
    expect(cutOf('icon.svg')).toBe('micro');
    expect(cutOf('favicon-32.png')).toBe('micro');
    expect(cutOf('favicon-16.png')).toBe('micro');
    // and the published record of what was drawn from what agrees
    const manifest = JSON.parse(readFileSync('public/assets/mark/manifest.json', 'utf8'));
    expect(manifest.drawn_from['icon.svg']).toBe('micro');
    expect(manifest.drawn_from['favicon-32.png']).toBe('micro');
  });

  it('is never served onto a page by the component', async () => {
    // the page family and the icon family must not share a path: rule 1 holds
    // on a page and the ground is scoped to icon files
    for (const size of [16, 19, 20, 21, 32, 33, 64]) {
      expect(await render({ size })).not.toContain('<rect');
    }
  });
});

describe('the generator', () => {
  it('scores every shipped cut, not only the ones that spell out every parameter', () => {
    // CUTS['display'] and CUTS['small'] carry a pitch and a radius and nothing
    // else; CUTS['micro'] and every CANDIDATES entry carry all eight. Those
    // two shapes used to be read by two different rules, so metrics() raised
    // KeyError: 'gamma' on two of the three cuts that ship, and the obvious
    // thing to do with a retuned cut, score it the way the candidates were
    // scored, did not work. resolve() gives both families one contract.
    const out = execFileSync('python', ['scripts/render_mark.py', '--metrics'], {
      encoding: 'utf8',
    });
    const scored = Object.fromEntries(
      [...out.matchAll(/^ +(display|small|micro) +dots (\d+)/gm)].map((m) => [m[1], Number(m[2])]),
    );
    // the counts the doc's cuts table publishes, from the code path that used
    // to raise on two of these three
    expect(scored).toEqual({ display: 112, small: 23, micro: 11 });
  });

  it('checks every generated file it tracks, and counts only what it checked', () => {
    // --check built its set from the SVG table alone and reported "7 files
    // match" while the docstring claimed it verified everything. The four
    // PNGs were the gap that mattered: the generator runs without Playwright,
    // so a retune on a machine with no browser rewrote the SVGs, left the
    // rasters on the previous drawing, and still reported no drift.
    const all = execFileSync('python', ['scripts/render_mark.py', '--check'], {
      encoding: 'utf8',
    });
    expect(all).toMatch(/mark 1\.1: 13 files match$/m);

    // and --no-raster is an opt-out that says what it opted out of, rather
    // than a flag that changed nothing because --check returned before the
    // raster block was reached
    const text = execFileSync('python', ['scripts/render_mark.py', '--check', '--no-raster'], {
      encoding: 'utf8',
    });
    expect(text).toMatch(/mark 1\.1: 9 files match, 4 rasters not checked/);
  }, 60000);
});
