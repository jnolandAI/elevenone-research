import { describe, it, expect, afterAll } from 'vitest';
import { readFileSync, readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

  /**
   * Page furniture and wrappers. These draw no exhibit of their own.
   *
   * Matrix sits here too, and for a different reason than the rest: it does
   * draw a table, but the census already counts it, by class rather than by
   * component name. FORMS classifies `table` on `class="s-matrix` because
   * that class is what the rendered HTML carries regardless of which
   * component wrote it, so Matrix's output was counted correctly before this
   * component existed and needs no entry of its own. Adding "Matrix" to
   * FORMS as a name match would be redundant with the class match already
   * there, and either double-count or (once the string check below allows
   * any substring, including this comment) mask a future regression the way
   * the Distribution incident above did.
   */
  const FURNITURE = new Set(['Slide', 'Exhibit', 'Row', 'Glyph', 'Page', 'Cover', 'RailPage', 'Finding', 'Implication', 'Comment', 'Annot', 'Matrix']);

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

/**
 * The audit's sub-head census reads `<p class="s-*__lead">` markup. Comment
 * and Annot carry their leads as `items={[{ lead: '...', body: '...' }]}`
 * instead - Comment renders a Fragment with no root at all, and Annot's
 * items are JS data - so the census went blind to both the day this plan
 * migrated them: it kept printing a count, just the wrong one, for a deck
 * that measured 101 sub-heads before migration and 1 after. The same failure
 * hit the exhibit form census when `Distribution` joined the kit (see the
 * describe block above) and the title/source census when `Page` did (Task
 * 2). A gate that stops seeing content while still printing a number is
 * worse than one that never looked, so this fixture pins both forms.
 */
describe("the audit's sub-head census sees both forms a lead can take", () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-leads-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  writeFileSync(
    join(dir, 'fixture.astro'),
    [
      '<div class="s-annot">',
      '  <div class="s-annot__item">',
      '    <p class="s-annot__lead">Literal markup lead.</p>',
      '    <p class="s-annot__body">Literal markup body.</p>',
      '  </div>',
      '</div>',
      '<Comment items={[',
      "  { lead: 'Array literal lead.', body: 'Array literal body.', pad: true },",
      ']} />',
      '<Annot items={[',
      "  { lead: 'Second array lead.', body: 'Second array body.' },",
      ']} />',
    ].join('\n'),
    'utf8',
  );

  const out = execFileSync(
    'node',
    ['research-kit/scripts/audit.mjs', '--profile', 'brief', dir, '--leads'],
    { encoding: 'utf8' },
  );

  it('counts a lead written as literal markup', () => {
    expect(out).toContain('Literal markup lead.');
  });

  it('counts a lead written as a single-quoted items array entry', () => {
    expect(out).toContain('Array literal lead.');
  });

  it('counts a lead from a second items array in the same file', () => {
    expect(out).toContain('Second array lead.');
  });

  it('reports 3 sub-heads for a fixture that carries exactly 3', () => {
    expect(out).toMatch(/\n3 sub-heads,/);
  });
});
