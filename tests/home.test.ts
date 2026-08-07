import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Working from '../src/components/home/Working.astro';

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

  // Ties the row's value to the brief's data, not to copy typed into the
  // component. A regression back to hardcoded strings has no reason to
  // reproduce this exact fragment, so this is the case that turns red if the
  // derivation is ever removed. Cross-check against
  // src/content/briefs/001-gross-margin.mdx, claim A's breaksIf.
  it('draws its Falsifier row from brief 001, not from copy typed into the component', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Working);
    expect(html).toContain('221 excluded filers are not random');
  });

  // Claim.astro links to #c-{id} on the brief's claim rail and depends on the
  // highlight script. There is no rail here, so borrowing it would ship
  // anchors that resolve to nothing.
  it('does not reuse the interactive Claim component', () => {
    expect(src).not.toMatch(/import\s+Claim\s+from/);
    expect(src).not.toMatch(/href=\{?["'`]#c-/);
  });

  it('claims no track record, which PRODUCT.md forbids implying', () => {
    expect(src).not.toMatch(/\b(client|clients|case study|case studies|testimonial)\b/i);
  });

  // A missing brief or a claimless brief must fail the build loudly rather
  // than fall back to placeholder text: a silent fallback is how invented
  // apparatus got onto the page the first time.
  it('has no fallback text for a missing brief or claim', () => {
    expect(src).toMatch(/throw new Error/);
  });
});

const coverage = readFileSync('src/components/home/Coverage.astro', 'utf8');

describe('the coverage strip', () => {
  it('is driven by the shared subject table rather than a second hardcoded list', () => {
    expect(coverage).toMatch(/from\s+['"]\.\.\/\.\.\/lib\/dot['"]/);
    expect(coverage).toContain('SUBJECTS');
  });

  it('lazy-loads, because all six sit below the fold', () => {
    expect(coverage).toMatch(/loading=["']lazy["']/);
  });

  // Six industrial images in a row is exactly the shape that implies a
  // portfolio. PRODUCT.md forbids implying a track record.
  it('frames subjects covered, never work delivered', () => {
    expect(coverage).not.toMatch(/\b(client|clients|case study|case studies|portfolio|our work|engagements delivered)\b/i);
  });
});
