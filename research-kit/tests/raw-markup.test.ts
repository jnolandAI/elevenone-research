import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Once a construct has a component, no page may still write its markup by
 * hand. Without this the codebase carries two ways to build the same page and
 * the components decay into an option.
 *
 * `List` is deliberately absent. Task 9 wrote it, checked it against all 5
 * `s-list` tables, and did not ship it: one of the five (the `loadPath` map
 * in piece 001) renders a two-paragraph body carrying `s-note`, a class from
 * another component's family, which a `body: string` prop cannot express.
 * The 5 `s-list` tables stay hand-composed on purpose. Adding an `s-list`
 * root here would point at a component that does not exist.
 *
 * Each needle is a regex anchored on the root class, matching whether or not
 * a modifier follows it: `class="s-annot(?=[\s"])` catches both bare
 * `class="s-annot"` and modified `class="s-annot s-annot--field"`, and a
 * dunder child class (`s-annot__item`) never satisfies the lookahead because
 * `_` is neither a space nor a quote. A fixed round 1 found the first-run
 * guard blind in both directions at once: `s-annot` as a bare string missed
 * every modified instance, while `s-matrix s-`, `s-kpi s-` and `s-dense s-`
 * required a modifier and would have missed a bare one. Both directions are
 * closed the same way for every root except RailPage's, which keeps its
 * exact compound leading edge on purpose:
 *
 * `class="s-split s-split--fill(?=[\s"])` still requires the full
 * `s-split s-split--fill` compound before the boundary, so a bare
 * `class="s-split"` or a modified `class="s-split s-split--even"` still do
 * not match. Both are real, and both are a distinct, legitimate construct in
 * this corpus (three blocks in Noland's commercial-diligence.astro) that
 * RailPage's own shape, one main column plus one rail, does not cover;
 * matching them here would flag a page for a component that does not fit
 * it, which is the same class of false coverage this guard exists to
 * prevent, just pointed the other way. The lookahead after `--fill` closes
 * the one gap that exact literal did leave: a hand-written instance
 * carrying a third appended class after the compound now still matches.
 */
const ROOTS: [RegExp, string][] = [
  [/<div class="s-stack(?=[\s"])/, 'Page'],
  [/class="s-cover(?=[\s"])/, 'Cover'],
  [/class="s-split s-split--fill(?=[\s"])/, 'RailPage'],
  [/class="s-finding(?=[\s"])/, 'Finding'],
  [/class="s-implication(?=[\s"])/, 'Implication'],
  [/class="s-annot(?=[\s"])/, 'Annot'],
  [/class="s-comment__item(?=[\s"])/, 'Comment'],
  [/class="s-matrix(?=[\s"])/, 'Matrix'],
  [/class="s-kpi(?=[\s"])/, 'Kpi'],
  [/class="s-dense(?=[\s"])/, 'Dense'],
];

/**
 * A page that genuinely needs raw markup stays legible as a deliberate choice
 * rather than as an oversight. Each entry carries its reason, and a key is
 * built with the same `join()` call the walk uses, so the lookup matches on
 * every OS regardless of path separator.
 *
 * An entry here is a debt with a name on it, not a permanent carve-out: it
 * exists to be migrated and removed, not to stay.
 *
 * Fix round 2's census (2026-08-28) found the walk itself had a hole: only
 * `src/components/argo` and one hardcoded file, `project-argo.astro`, were
 * ever walked on the Noland side, while `src/pages/` also holds three live,
 * linked deck pages the original census never counted — 30 slides across
 * `commercial-diligence.astro` (11), `firm-overview.astro` (16) and
 * `robotics-components.astro` (3), all importing `Deck`/`Slide` from the
 * kit and hand-writing nearly every construct this guard checks. The walk
 * is fixed below to be recursive over `src/pages`, the same way the Eleven
 * One side already is, which is what surfaces these three rather than
 * missing them a second way. They are not migrated here: a change that
 * size needs its own pre-migration paint and html baselines, which this fix
 * round does not have, and forcing it in now would be exactly the
 * unmeasured change this plan's gates exist to prevent. Tracked as Task 11.
 */
const repoEnv = process.env.NOLAND_REPO;
const EXEMPT: Record<string, string> = repoEnv
  ? {
      [join(repoEnv, 'src/pages/commercial-diligence.astro')]:
        'unmigrated, tracked as Task 11; 11 slides outside the original census, no pre-migration baseline yet.',
      [join(repoEnv, 'src/pages/firm-overview.astro')]:
        'unmigrated, tracked as Task 11; 16 slides outside the original census, no pre-migration baseline yet.',
      [join(repoEnv, 'src/pages/robotics-components.astro')]:
        'unmigrated, tracked as Task 11; 3 slides outside the original census, no pre-migration baseline yet.',
    }
  : {};

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.astro')) out.push(full);
  }
  return out;
}

function scan(files: string[]): string[] {
  const offences: string[] = [];
  for (const file of files) {
    if (EXEMPT[file]) continue;
    const src = readFileSync(file, 'utf8');
    for (const [needle, component] of ROOTS) {
      const m = src.match(needle);
      if (m) offences.push(`${file} writes ${m[0]} by hand; use ${component}`);
    }
  }
  return offences;
}

describe('no page writes a componentised construct by hand', () => {
  const repo = process.env.NOLAND_REPO;

  it('holds in Eleven One', () => {
    expect(scan(walk('src/pages'))).toEqual([]);
  });

  it.skipIf(!repo)('holds in Noland', () => {
    // Recursive over src/pages, the same way the Eleven One side already
    // is, plus src/components/argo, which holds the slide bodies the deck
    // pages import. A hardcoded single-file addition here once stood in for
    // the recursive walk and missed three live deck pages as a result; see
    // EXEMPT above.
    const files = [
      ...walk(join(repo!, 'src/components/argo')),
      ...walk(join(repo!, 'src/pages')),
    ];
    expect(scan(files)).toEqual([]);
  });
});
