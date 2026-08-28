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
 *
 * Task 11 (2026-08-28) tried narrowing three more needles (`Page`, `Cover`,
 * `Dense`) the same way, with multi-thousand-character forward lookaheads
 * checking for the shapes those three components can and cannot emit. Ruled
 * back out in fix round 1, the same day: a lookahead encodes what a page
 * looks like it is allowed to get away with inside the needle itself, where
 * nobody reads it, rather than in `EXEMPT`, where everyone does. A future
 * page hand-writing a genuinely migratable skeleton whose body wrapper sits
 * one character past an arbitrary bound would have passed silently, and a
 * future `Page` extension would not carry its needle forward with it. See
 * `EXEMPT` below for where that knowledge actually lives now: RailPage's
 * needle is the one narrowing that stays, because its compound leading edge
 * (`s-split s-split--fill`) is not a bound on anything, just the literal
 * shape `RailPage` itself always emits or never does.
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
 * A page that genuinely needs raw markup stays legible as a deliberate
 * choice rather than as an oversight. Keyed by file, then by the component
 * name `ROOTS` would have named, so a page can be exempt for one construct
 * and still policed for every other one it carries — the granularity fix
 * round 1 made.
 *
 * Fix round 2 closed the gap that granularity alone left open: an exemption
 * carried only a reason, and `scan()` skipped the needle entirely the moment
 * one was found, which made it a binary per file-and-component switch rather
 * than a measured debt. Once a file was exempt for a component, it stayed
 * unpoliced for that component forever — a fifth, cleanly migratable
 * instance added next month would have passed silently, and the reason
 * string would keep describing a count that was no longer true. Each
 * exemption now pins the exact count of roots it covers alongside the
 * reason, `scan()` counts every match with a fresh global copy of the
 * needle (a shared global regex carries `lastIndex` across calls, so one is
 * built per use rather than reused), and compares: more matches than the
 * pinned count fails as new debt, fewer fails as a stale exemption whose
 * count should come down, and exactly the pinned count is the only way to
 * pass. That turns "unpoliced" into "pinned at exactly the known debt,"
 * which is what an enumerated exemption should have meant from the start.
 *
 * Each key is built with the same `join()` call the walk uses, so the
 * lookup matches on every OS regardless of path separator.
 *
 * An entry here is a debt with a name on it, not a permanent carve-out: it
 * exists to be migrated and removed, not to stay — the moment a component's
 * shape covers an instance, its count should come down, not the needle
 * narrow to stop seeing it.
 *
 * Task 11 (2026-08-28) migrated 30 slides across three deck pages onto
 * `Page`, `Cover`, `Finding`, `Implication`, `Annot`, `Comment`, `Kpi` and
 * `Dense` — no new component. 16 individual roots across these three files,
 * grouped into 6 file-and-component entries below, turned out not to fit
 * any shipped component, for a reason each component's own shape rules out.
 * The count is 16, not 17: recounted against committed bytes with these
 * exact `ROOTS` regexes after an earlier round's report claimed 17, and the
 * six counts below (3, 2+2, 4+2+3) sum to 16.
 */
const repoEnv = process.env.NOLAND_REPO;
const EXEMPT: Record<string, Partial<Record<string, { count: number; reason: string }>>> = repoEnv
  ? {
      [join(repoEnv, 'src/pages/robotics-components.astro')]: {
        Page: {
          count: 3,
          reason:
            'Slide 1 (the cover) has no <h2> at all — kicker then straight into a ' +
            's-grow s-stack s-stack--end hero wrapper, an h1.s-display, and a closing ' +
            'p.s-note; Page always renders an h2.s-title, so there is no title slot for this ' +
            'shape to occupy. Slides 2 and 3 use s-grow s-stack s-stack--center as the body ' +
            'wrapper; Page.bodyClass is always s-grow plus s-pad-t or s-pad-t--lg, plus ' +
            'optionally s-col — never s-stack-flavoured.',
        },
      },
      [join(repoEnv, 'src/pages/commercial-diligence.astro')]: {
        Page: {
          count: 2,
          reason:
            'The contents page (slide 3) is a bare s-list sibling then ' +
            's-grow s-stack s-stack--center s-pad-t; the sensitivity page (slide 10) is ' +
            's-grow s-stack s-pad-t. Neither is a shape Page.bodyClass (s-grow plus s-pad-t ' +
            'or s-pad-t--lg, plus optionally s-col) can produce.',
        },
        Dense: {
          count: 2,
          reason:
            'The summary block (slide 2) and the open-items block (slide 11) both carry an ' +
            "s-dense__fig field per row, slide 2's also carrying a per-row " +
            "s-dense__fig--mark modifier. Dense's trailing figure field is s-dense__pp, " +
            'unmodified; it has no field or modifier for s-dense__fig.',
        },
      },
      [join(repoEnv, 'src/pages/firm-overview.astro')]: {
        Page: {
          count: 4,
          reason:
            'The practice page (slide 2) has an outer wrapper of s-grow s-two-up s-pad-t — a ' +
            'third class Page.bodyClass cannot add — and its own two inner columns are plain ' +
            's-stack layout divs with no <h2> at all, reusing the class as a utility rather ' +
            "than as Page's shape. The roles page (slide 4) splits its body across two " +
            'sibling divs, s-pad-t alone and s-grow alone, never combined into the one body ' +
            'wrapper Page emits.',
        },
        Cover: {
          count: 2,
          reason:
            'The deck\'s own cover (slide 1) has <h1 class="s-cover__title"> authored ' +
            'without --sm; Cover always adds --sm regardless of level (only the tag changes, ' +
            'h1 vs h2), which would drop the title from --ct-text-5xl to --ct-text-4xl — a ' +
            'measured font-size change, not a text-only one. The closing contact slide ' +
            '(slide 16) carries a second, styled s-cover__body paragraph ' +
            "(color: var(--color-ground)) after the first; Cover's body prop is a single " +
            'optional string with no second slot and no inline style.',
        },
        Dense: {
          count: 3,
          reason:
            'The practice ledger (slide 2) is class="s-dense s-pad-t" — Dense\'s class:list ' +
            'is always s-dense plus --under/--fill and cannot append a bare utility class ' +
            '(confirmed: passing class="s-pad-t" through ...rest was tried and Astro drops ' +
            'it in favour of class:list, verified by build and html-diff, not assumed). The ' +
            'cases block (slide 11) carries s-dense__fig per row, which Dense has no field ' +
            "for. The contents block (slide 2) is the one exclusion invisible in source " +
            "text: its final row's num is the empty string, so Dense's " +
            '{row.num && <p class="s-dense__num">...} correctly omits that row\'s paragraph, ' +
            'while the hand-written .map() renders it unconditionally regardless of content.',
        },
      },
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
    const src = readFileSync(file, 'utf8');
    for (const [needle, component] of ROOTS) {
      // A fresh global copy per use: a shared global regex carries lastIndex
      // between calls, which would silently under-count every file after
      // the first.
      const global = new RegExp(needle.source, 'g');
      const matches = [...src.matchAll(global)];
      const exemption = EXEMPT[file]?.[component];
      if (exemption) {
        if (matches.length > exemption.count) {
          offences.push(
            `${file} carries ${matches.length} ${component} roots but is exempted for ` +
              `${exemption.count}; ${matches.length - exemption.count} more than the pinned ` +
              `count is new, unexempted debt`,
          );
        } else if (matches.length < exemption.count) {
          offences.push(
            `${file} carries ${matches.length} ${component} roots but is exempted for ` +
              `${exemption.count}; the exemption is stale and the pinned count should come down`,
          );
        }
        continue;
      }
      if (matches.length > 0) {
        offences.push(`${file} writes ${matches[0]![0]} by hand; use ${component}`);
      }
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
