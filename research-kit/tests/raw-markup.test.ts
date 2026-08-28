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
 */
const ROOTS: [string, string][] = [
  ['<div class="s-stack">', 'Page'],
  ['class="s-cover"', 'Cover'],
  ['class="s-split s-split--fill"', 'RailPage'],
  ['class="s-finding"', 'Finding'],
  ['class="s-implication"', 'Implication'],
  ['class="s-annot"', 'Annot'],
  ['class="s-comment__item"', 'Comment'],
  ['class="s-matrix s-', 'Matrix'],
  ['class="s-kpi s-', 'Kpi'],
  ['class="s-dense s-', 'Dense'],
];

/**
 * A page that genuinely needs raw markup stays legible as a deliberate choice
 * rather than as an oversight. Each entry carries its reason. Keys are built
 * with the same `join()` calls the walk uses, so the lookup matches on every
 * OS regardless of path separator.
 */
const repoEnv = process.env.NOLAND_REPO;
const EXEMPT: Record<string, string> = repoEnv
  ? {
      [join(repoEnv, 'src/pages/project-argo.astro')]:
        "the contents table carries num and pp on every row (4 fields: num, term, body, pp); " +
        'Dense ships with a 2-field row shape (term, body), the same class of gap Task 9 found ' +
        'disqualifying for List — needing more row fields than the component offers.',
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

describe('no page writes a componentised construct by hand', () => {
  const repo = process.env.NOLAND_REPO;

  it('holds in Eleven One', () => {
    const offences: string[] = [];
    for (const file of walk('src/pages')) {
      if (EXEMPT[file]) continue;
      const src = readFileSync(file, 'utf8');
      for (const [needle, component] of ROOTS) {
        if (src.includes(needle)) offences.push(`${file} writes ${needle} by hand; use ${component}`);
      }
    }
    expect(offences).toEqual([]);
  });

  it.skipIf(!repo)('holds in Noland', () => {
    const offences: string[] = [];
    // src/components/argo holds the deck's slide bodies. project-argo.astro
    // itself is walked separately below: it is a single page file, not a
    // directory, and the brief's original walk of src/components/argo alone
    // missed it entirely, including the 2 slides it composes directly (the
    // deck cover and the contents page) rather than importing from argo/.
    const files = [
      ...walk(join(repo!, 'src/components/argo')),
      join(repo!, 'src/pages/project-argo.astro'),
    ];
    for (const file of files) {
      if (EXEMPT[file]) continue;
      const src = readFileSync(file, 'utf8');
      for (const [needle, component] of ROOTS) {
        if (src.includes(needle)) offences.push(`${file} writes ${needle} by hand; use ${component}`);
      }
    }
    expect(offences).toEqual([]);
  });
});
