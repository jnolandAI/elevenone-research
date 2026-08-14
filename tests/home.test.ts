import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Working from '../src/components/home/Working.astro';
import Coverage from '../src/components/home/Coverage.astro';
import { SUBJECTS } from '../src/lib/dot';

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

const coverage = readFileSync('src/components/home/Coverage.astro', 'utf8');

describe('the coverage strip', () => {
  // A substring check on the import line would still pass if SUBJECTS were
  // imported and left unused beside a second, hardcoded card list: the
  // Working-section test above shows the fix for that, rendering through the
  // container and asserting a real value from the source of truth reaches the
  // output. Do the same here: every subject's display name in SUBJECTS has to
  // actually appear in the rendered markup, which a hardcoded list beside an
  // unused import would not reproduce unless it happened to duplicate all six
  // names verbatim.
  it('is driven by the shared subject table rather than a second hardcoded list', async () => {
    expect(coverage).toMatch(/from\s+['"]\.\.\/\.\.\/lib\/dot['"]/);
    expect(coverage).toContain('SUBJECTS');

    const container = await AstroContainer.create();
    const html = await container.renderToString(Coverage);
    const names = Object.values(SUBJECTS).map((s) => s.name);
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) expect(html, name).toContain(name);
  });

  it('lazy-loads, because all six sit below the fold', () => {
    expect(coverage).toMatch(/loading=["']lazy["']/);
  });

  // Six industrial images in a row is exactly the shape that implies a
  // portfolio. The brand rules forbid implying a track record.
  it('frames subjects covered, never work delivered', () => {
    expect(coverage).not.toMatch(/\b(client|clients|case study|case studies|portfolio|our work|engagements delivered)\b/i);
  });

  // The negative check above only proves forbidden words are absent, which
  // stays green even if the disclaimer sentence itself is deleted outright:
  // "not testimonial" is true of a blank page too. That sentence is the
  // only thing standing between six industrial renders in a row and a
  // portfolio implication, so its presence gets its own assertion, on the
  // rendered HTML rather than a source substring, matching the pattern the
  // Working section's test above already uses.
  it('actually carries the coverage-not-delivery disclaimer, not just the absence of forbidden words', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Coverage);
    expect(html).toContain('They describe coverage of the drawing system, not work delivered.');
  });
});
