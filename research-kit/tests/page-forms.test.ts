import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (name: string) =>
  readFileSync(`research-kit/components/${name}.astro`, 'utf8');

describe('Page', () => {
  const src = read('Page');

  it('carries no style block, because deck.css owns its classes', () => {
    // Panels shipped as the only component with no style block and emitted
    // nine classes that existed only in Noland, so it rendered unstyled the
    // first time Eleven One drew it. That is impossible now the classes are
    // in the kit, and a style block here would be the mistake in reverse.
    expect(src).not.toMatch(/<style/);
  });

  it('pads the title when and only when a kicker is present', () => {
    // Correct on 7 of 7 in the corpus and enforced by nothing until now.
    const expr = src.match(/'s-pad-t--sm':\s*([^\n}]+)/)![1]!;
    expect(expr).toMatch(/kicker/);
  });

  it('forwards unknown attributes to its root, so inline spacing survives', () => {
    // The corpus carries 71 ad-hoc inline styles. Modelling them is a separate
    // decision; losing them is a silent paint change on dozens of pages.
    expect(src).toMatch(/\.\.\.rest/);
  });

  it('renders the default-slot body inside the growing zone, not beside it', () => {
    // The class list may be built inline or, per the lesson from an earlier
    // task, assigned to a frontmatter variable and referenced by name -
    // Astro rejects a multi-line object literal inside an attribute
    // expression. Either way it must carry 's-grow' and sit ahead of the
    // default slot.
    expect(src).toMatch(/'s-grow'/);
    const bodyDivAt = src.search(/<div class:list=\{[^}]*\}>/);
    expect(bodyDivAt, 'no class:list div found for the body zone').toBeGreaterThan(-1);
    expect(src.slice(bodyDivAt)).toMatch(/^<div class:list=\{[^}]*\}>\s*<slot\s*\/>/);
  });

  it('emits the foot before the source, because the corpus writes it that way on all 22 pages that carry both', () => {
    const footAt = src.indexOf('{foot');
    const sourceAt = src.indexOf('{source');
    expect(footAt, 'no {foot} expression found').toBeGreaterThan(-1);
    expect(sourceAt, 'no {source} expression found').toBeGreaterThan(-1);
    expect(footAt).toBeLessThan(sourceAt);
  });

  it('defaults col to true, and the body zone drops s-col only when it is set false', () => {
    expect(src).toMatch(/col\s*=\s*true/);
    expect(src).toMatch(/'s-col':\s*col/);
  });

  it('renders a close slot between the body zone and the foot, for the finding/annot/implication block that follows it', () => {
    const bodyDivEnd = src.indexOf('</div>', src.search(/<slot\s*\/>/));
    const closeSlotAt = src.indexOf('<slot name="close"');
    const footAt = src.indexOf('{foot');
    expect(closeSlotAt, 'no named close slot found').toBeGreaterThan(-1);
    expect(closeSlotAt).toBeGreaterThan(bodyDivEnd);
    expect(closeSlotAt).toBeLessThan(footAt);
  });

  it('renders a lead slot between the title stack and the body zone, for the s-kpi band that precedes it', () => {
    const subOrTitleAt = Math.max(src.indexOf('{sub'), src.indexOf('s-pad-t--sm'));
    const leadSlotAt = src.indexOf('<slot name="lead"');
    const bodyDivAt = src.search(/<div class:list=\{[^}]*\}>/);
    expect(leadSlotAt, 'no named lead slot found').toBeGreaterThan(-1);
    expect(leadSlotAt).toBeGreaterThan(subOrTitleAt);
    expect(leadSlotAt).toBeLessThan(bodyDivAt);
  });

  it('carries sourcePad, the one inline style any s-source takes anywhere in the corpus, as a boolean rather than a string', () => {
    // padding-top: var(--ct-space-3) is the only style any s-source line
    // carries in the corpus, so one boolean covers every case rather than
    // reopening the string-vs-expression problem for a style attribute.
    expect(src).toMatch(/sourcePad\s*=\s*false/);
    expect(src).toMatch(/padding-top:\s*var\(--ct-space-3\)/);
  });

  it('emits no style attribute at all when sourcePad is unset, not an empty one', () => {
    // Astro omits a style={undefined} attribute outright; style="" would be
    // a different (and wrong) result, and the html-diff on the 55 pages
    // already migrated is the thing that would have caught it.
    const sourceLineAt = src.indexOf('class="s-source"');
    expect(sourceLineAt, 'no s-source line found').toBeGreaterThan(-1);
    const nearby = src.slice(Math.max(0, sourceLineAt - 120), sourceLineAt + 150);
    expect(nearby).toMatch(/style=\{sourcePad[^}]*undefined[^}]*\}/);
  });
});
