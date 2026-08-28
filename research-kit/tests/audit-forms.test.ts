import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * The audit's form census reports the share of pages carrying a chart, a
 * diagram, panels, a list or a table, against a reference corpus that runs
 * roughly 47 per cent chart and 18 per cent table. It classifies by matching
 * component names, and the list of names is written out by hand.
 *
 * Adding `Distribution` to the kit made the census read three charts on a
 * deck carrying four. The exhibit did not move to another bucket: it left the
 * count altogether, so the denominator shrank too and every share was wrong.
 * Nothing failed. A gate that silently stops seeing an exhibit is worse than
 * one that never saw it, because the number it prints still looks measured.
 */
describe("the audit's form census", () => {
  const audit = readFileSync('research-kit/scripts/audit.mjs', 'utf8');
  const forms = audit.slice(audit.indexOf('const FORMS'), audit.indexOf('const census'));

  /** Page furniture and wrappers. These draw no exhibit of their own. */
  const FURNITURE = new Set(['Slide', 'Exhibit', 'Row', 'Glyph', 'Page', 'Cover', 'RailPage', 'Finding', 'Implication']);

  it('knows every kit component that draws an exhibit', () => {
    const components = readdirSync('research-kit/components')
      .filter((f) => f.endsWith('.astro'))
      .map((f) => f.replace('.astro', ''))
      .filter((name) => !FURNITURE.has(name));

    expect(components.length).toBeGreaterThan(15);
    const missing = components.filter((name) => !forms.includes(name));
    expect(missing, 'name these in FORMS in audit.mjs, or in FURNITURE here').toEqual([]);
  });

  it('names nothing the kit does not ship', () => {
    const shipped = new Set(
      readdirSync('research-kit/components')
        .filter((f) => f.endsWith('.astro'))
        .map((f) => f.replace('.astro', '')),
    );
    // Only the component alternations, `<(Bars|Columns|...)`. A bare scan for
    // capitalised words picks up FORMS itself and every word in the comment.
    const named = [...forms.matchAll(/<\(([A-Za-z|]+)\)/g)].flatMap((m) => m[1]!.split('|'));
    for (const name of named) {
      expect(shipped.has(name), `FORMS names ${name}, which the kit does not ship`).toBe(true);
    }
  });
});
