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
 * closed here the same way, with one deliberate exception:
 *
 * RailPage's outer class, `s-split s-split--fill`, stays an exact compound
 * literal rather than a root-plus-boundary match. The component never emits
 * a modifier on it, so there is no modified form to miss, and a
 * boundary-safe `class="s-split(?=[\s"])` needle would also catch bare
 * `class="s-split"` and `class="s-split s-split--even"` — a distinct,
 * legitimate construct that exists in this corpus (Noland's
 * commercial-diligence.astro, out of this guard's walked scope today) and
 * that RailPage's own shape, one main column plus one rail, does not cover.
 * Generalising that needle would flag a page for a component that does not
 * fit it, which is the same class of false coverage this guard exists to
 * prevent, just pointed the other way.
 */
const ROOTS: [RegExp, string][] = [
  [/<div class="s-stack(?=[\s"])/, 'Page'],
  [/class="s-cover(?=[\s"])/, 'Cover'],
  [/class="s-split s-split--fill"/, 'RailPage'],
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
 * Empty. The guard's first run (before the needle fix below) found one hit
 * here, `project-argo.astro`'s contents table on Dense, and it was exempted
 * for this shape reason: the table carries num and pp on every row (4
 * fields) against Dense's then-shipped 2-field row shape (term, body).
 * Fixing the needles in round 1 also surfaced a second, previously
 * invisible hit in the same file, an `s-annot s-annot--field` block Annot
 * had no prop for. Both turned out to be closeable rather than genuine
 * shape mismatches — unlike `List`, which needed a field bound to a class
 * from a different component's family entirely — so Dense gained optional
 * `num`/`pp` fields, Annot gained a `field` boolean, and both blocks in
 * `project-argo.astro` now use the components. No exemption remains.
 */
const EXEMPT: Record<string, string> = {};

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
    // src/components/argo holds the deck's slide bodies. project-argo.astro
    // itself is walked separately: it is a single page file, not a
    // directory, and the brief's original walk of src/components/argo alone
    // missed it entirely, including the 2 slides it composes directly (the
    // deck cover and the contents page) rather than importing from argo/.
    const files = [
      ...walk(join(repo!, 'src/components/argo')),
      join(repo!, 'src/pages/project-argo.astro'),
    ];
    expect(scan(files)).toEqual([]);
  });
});
