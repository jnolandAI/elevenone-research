import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const working = readFileSync('src/components/home/Working.astro', 'utf8');

describe('the working section', () => {
  it('shows all four rows of the apparatus, which is the whole point', () => {
    for (const row of ['Claim', 'Source', 'Assumption', 'Falsifier']) {
      expect(working, row).toContain(row);
    }
  });

  // Claim.astro links to #c-{id} on the brief's claim rail and depends on the
  // highlight script. There is no rail here, so borrowing it would ship
  // anchors that resolve to nothing.
  it('does not reuse the interactive Claim component', () => {
    expect(working).not.toMatch(/import\s+Claim\s+from/);
    expect(working).not.toMatch(/href=\{?["'`]#c-/);
  });

  it('claims no track record, which PRODUCT.md forbids implying', () => {
    expect(working).not.toMatch(/\b(client|clients|case study|case studies|testimonial)\b/i);
  });
});
