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
   * Page furniture and wrappers. These draw no exhibit of their own, so the
   * census does not classify them and FORMS must not name them.
   *
   * `Matrix` and `Dense` used to sit here, on a justification that was simply
   * false, and it cost a real result. It read: the census already counts them
   * by class, "because that class is what the rendered HTML carries
   * regardless of which component wrote it." The census never renders
   * anything. `audit.mjs` reads `.astro` SOURCE — a page that writes
   * `<Matrix rows={...} />` contains the string `s-matrix` nowhere at all, and
   * the class needle sees nothing. On 2026-08-28 the migration turned 23
   * matrices and 9 `s-dense` ledgers into component calls; the census dropped
   * from 72 forms to 40, every share it printed was computed on the broken
   * denominator, and the table-share warning stopped firing on a deck whose
   * tables had not changed. This test passed throughout, because that
   * sentence told it to.
   *
   * The rule, now in FORMS and repeated here because this is where the next
   * person will argue with it: a construct that has a component is counted by
   * BOTH its component name and its root class. Never one instead of the
   * other. They cannot double-count, because a page writes one form or the
   * other and never both — the class only appears in source when the markup
   * is hand-written, and the name only when it is not.
   *
   * `Kpi` stays. It is the one entry here that draws something and is still
   * not a form: the five buckets come from a 208-slide census of exhibit
   * FORMS (chart, diagram, panels, list, table), and a band of figures is
   * page furniture in that census, not a sixth bucket. It was uncounted
   * before it was a component and it is uncounted now, so nothing moved.
   */
  const FURNITURE = new Set(['Slide', 'Exhibit', 'Row', 'Glyph', 'Page', 'Cover', 'Split', 'Finding', 'Implication', 'Comment', 'Annot', 'Kpi']);

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
 * The reading test above only checks that FORMS mentions every component's
 * name somewhere in its own text. That is not the same as counting it, and
 * the difference is what let the 2026-08-28 regression through: `Matrix` and
 * `Dense` were excused from the reading test by FURNITURE while the census
 * quietly stopped counting the 32 exhibits they had absorbed.
 *
 * So this runs the census, the way the sub-head fixture below already pins
 * the lead census after the identical failure. Every row of FORMS gets both
 * of its forms in one file — the component call and the hand-written root
 * class — and the printed line is pinned exactly. Under the pre-fix FORMS
 * this fixture reads `chart 1 (14%), diagram 3 (43%), panels 1 (14%),
 * list 2 (29%), table 2 (29%)`: seven forms out of fourteen, no failure, and
 * a plausible-looking set of percentages.
 */
describe("the audit's form census sees both forms an exhibit can take", () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-forms-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  writeFileSync(
    join(dir, 'fixture.astro'),
    [
      '<Bars rows={rows} alt="chart, as a component" />',
      '<DriverChain steps={steps} alt="diagram, as a component" />',
      '<Layers bands={bands} alt="diagram, as a component" />',
      '<div class="s-flow">diagram, hand-written</div>',
      '<div class="s-layers">diagram, hand-written</div>',
      '<Panels panels={panels} />',
      '<div class="s-panels s-panels--lead">panels, hand-written</div>',
      '<Dense rows={rows} />',
      '<div class="s-dense s-dense--under">list, hand-written</div>',
      '<div class="s-list">list, hand-written</div>',
      '<Table columns={cols} rows={rows} />',
      '<Matrix rows={rows} cols="1fr 1fr" />',
      '<div class="s-matrix s-matrix--fill">table, hand-written</div>',
      '<table class="tbl">table, hand-written</table>',
    ].join('\n'),
    'utf8',
  );

  const out = execFileSync(
    'node',
    ['research-kit/scripts/audit.mjs', '--profile', 'brief', dir],
    { encoding: 'utf8' },
  );

  it('counts every exhibit twice over: once as a call, once as hand-written markup', () => {
    expect(out).toContain(
      'exhibit forms  chart 1 (7%), diagram 4 (29%), panels 2 (14%), list 3 (21%), table 4 (29%)',
    );
  });
});

/**
 * The table-share warning is the one number in this census that changes a
 * decision, and it is the one the regression switched off: Argo's tables ran
 * 36% of its forms before the migration and 36% after, and the warning fired
 * before and not after, because the census had stopped seeing 23 of the 26.
 * A share pinned by a fixture is not enough on its own — the warning has to
 * be observed firing on componentised tables.
 */
describe('the table-share warning fires on tables written as components', () => {
  const dir = mkdtempSync(join(tmpdir(), 'audit-tableshare-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));

  writeFileSync(
    join(dir, 'fixture.astro'),
    [
      '<Bars rows={rows} alt="one chart" />',
      '<Matrix rows={rows} cols="1fr 1fr" />',
      '<Matrix rows={rows} cols="1fr 1fr" />',
      '<Matrix rows={rows} cols="1fr 1fr" />',
      '<Matrix rows={rows} cols="1fr 1fr" />',
    ].join('\n'),
    'utf8',
  );

  const out = execFileSync(
    'node',
    ['research-kit/scripts/audit.mjs', '--profile', 'brief', dir],
    { encoding: 'utf8' },
  );

  it('counts four component tables against one chart', () => {
    expect(out).toContain('table 4 (80%)');
  });

  it('warns, rather than printing 0% and staying silent', () => {
    expect(out).toContain('tables are over a third of the forms');
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
