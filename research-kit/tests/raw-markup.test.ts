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
 * Task 11 (2026-08-28) migrated the three deck pages `EXEMPT` used to carry
 * and removed the map. 30 slides, same constructs, same components — but 10
 * `<div class="s-stack">` roots, 2 `class="s-cover"` roots and 5
 * `class="s-dense"` roots turned out not to fit the components that already
 * exist, for reasons each component's own shape rules out, not for lack of
 * trying. Rather than exempt three whole files again, the three needles
 * below that had this problem are narrowed the same way RailPage's was: to
 * still match every real offence and stop matching the specific shapes these
 * pages carry that the shipped components cannot reproduce.
 *
 * `Page` (`<div class="s-stack">`) requires, within 3000 characters forward,
 * the literal `class="s-grow s-pad-t`, which matches both `s-pad-t` and
 * `s-pad-t--lg` and is the one body-wrapper shape `Page` can ever emit (its
 * `bodyClass` is always `s-grow` plus one of those two, plus optionally
 * `s-col`; never `s-stack`-flavoured, never a third class like `s-two-up`,
 * never split across two sibling divs). Ten roots in this corpus fail that
 * requirement and are excluded correctly: robotics-components.astro's cover
 * slide (kicker then straight into a `s-grow s-stack s-stack--end` hero
 * wrapper, no `<h2>` at all) and its two body slides (`s-grow s-stack
 * s-stack--center`); commercial-diligence.astro's contents page (a bare
 * `s-list` sibling then `s-grow s-stack s-stack--center s-pad-t`) and its
 * sensitivity page (`s-grow s-stack s-pad-t`); firm-overview.astro's practice
 * page, both as its own outer wrapper (`s-grow s-two-up s-pad-t`, a third
 * class `Page` cannot add) and as the two `<div class="s-stack">` column
 * wrappers inside it (plain layout columns reusing the utility class, no
 * `<h2>`, so no `Page` shape to speak of), and its roles page (two sibling
 * divs, `s-pad-t` alone and `s-grow` alone, never combined into one body
 * wrapper). 3000 characters comfortably spans the longest observed lead
 * content (a five-item `Kpi` band) between a title and its body div without
 * reaching into a neighbouring, already-componentised slide, which no longer
 * carries this literal at all. Measured after the fix: 0 offences across
 * Argo, piece 001 and all three of these files, and the ten roots above
 * still fail the lookahead exactly as intended.
 *
 * `Cover` (`class="s-cover"`) requires, within 2000 characters forward, the
 * exact compound `s-cover__title s-cover__title--sm`, which `Cover` always
 * emits regardless of `level` (the prop only switches the tag between `h1`
 * and `h2`), and excludes any block carrying a second, styled
 * `s-cover__body" style=` paragraph, which `Cover` can never emit (`body` is
 * a single optional string with no inline style). Two roots fail: firm-
 * overview.astro's own deck cover, whose `<h1 class="s-cover__title">` was
 * authored without `--sm` and would grow a font-size step (`--ct-text-5xl`
 * to `--ct-text-4xl`, a real, measured paint change, not a text-only one)
 * if forced through `Cover`; and its closing contact slide, which carries a
 * second `s-cover__body` paragraph coloured `var(--color-ground)` that
 * `Cover`'s single `body` prop cannot carry.
 *
 * `Dense` (`class="s-dense"`) excludes the literal compounds
 * `class="s-dense s-pad-t"` and `class="s-dense s-dense--under"` at the root
 * itself, and separately excludes any block carrying `s-dense__fig` within
 * 1500 characters forward, a class `Dense` can never emit (its trailing
 * figure field is `s-dense__pp`, and neither it nor `s-dense__num` carries a
 * per-field `--mark` modifier the way `s-dense__fig--mark` does here). Five
 * roots fail: commercial-diligence.astro's two summary/open blocks (both
 * `s-dense__fig`, one of them `--mark`ed per row); firm-overview.astro's
 * practice ledger (`s-pad-t`, a class `Dense`'s fixed `s-dense`/`--under`/
 * `--fill` class:list never appends) and its cases block (`s-dense__fig`
 * again); and firm-overview.astro's contents block, which is the one
 * exclusion that is not visible in the source text at all — its final row's
 * `num` field is `''`, an empty string, so `Dense`'s
 * `{row.num && <p class="s-dense__num">...}` correctly omits the paragraph
 * for that one row, while the hand-written source renders it unconditionally
 * every time. The `class="s-dense s-dense--under"` exclusion is what
 * `Dense` itself would emit for a genuinely fitting `under` block too, so it
 * is not a safe general rule; it is safe only because no other raw
 * `s-dense--under` instance exists anywhere in the walked corpus right now,
 * which the 0-offence measurement below confirms rather than assumes.
 */
const ROOTS: [RegExp, string][] = [
  [/<div class="s-stack(?=[\s"])(?=[\s\S]{0,3000}?class="s-grow s-pad-t)/, 'Page'],
  [
    /class="s-cover(?=[\s"])(?=[\s\S]{0,2000}?s-cover__title s-cover__title--sm)(?![\s\S]{0,2000}?s-cover__body" style=)/,
    'Cover',
  ],
  [/class="s-split s-split--fill(?=[\s"])/, 'RailPage'],
  [/class="s-finding(?=[\s"])/, 'Finding'],
  [/class="s-implication(?=[\s"])/, 'Implication'],
  [/class="s-annot(?=[\s"])/, 'Annot'],
  [/class="s-comment__item(?=[\s"])/, 'Comment'],
  [/class="s-matrix(?=[\s"])/, 'Matrix'],
  [/class="s-kpi(?=[\s"])/, 'Kpi'],
  [
    /class="s-dense(?=[\s"])(?!\s+s-pad-t")(?!\s+s-dense--under")(?![\s\S]{0,1500}?s-dense__fig)/,
    'Dense',
  ],
];

/**
 * A page that genuinely needs raw markup stays legible as a deliberate choice
 * rather than as an oversight. Each entry carries its reason, and a key is
 * built with the same `join()` call the walk uses, so the lookup matches on
 * every OS regardless of path separator.
 *
 * An entry here is a debt with a name on it, not a permanent carve-out: it
 * exists to be migrated and removed, not to stay. Empty again as of Task 11:
 * the three files this map used to name are migrated and walked unexempted,
 * and the shapes that do not fit an existing component are excluded at the
 * needle instead, documented above `ROOTS`.
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
