import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/pages/index.astro', 'utf8');

describe('the briefs index', () => {
  // Each assertion is tied to the construct that does the work, not to a
  // substring that could survive the behaviour being removed.
  it('shows only published briefs', () => {
    // the predicate has to be applied, not merely present: a filter computed
    // and never called leaves the literal text in the file
    // Tolerant of both `(b) =>` and `b =>`. The [^)] form cannot match the
    // parenthesised parameter style the rest of this codebase uses, because
    // the parameter's own ) closes before `published` appears, which would
    // force the source to change arrow style to satisfy a test.
    expect(page).toMatch(/\.filter\(\s*\(?\w+\)?\s*=>\s*\w+\.data\.published\s*!==?\s*null\s*\)/);
  });

  it('sorts newest first', () => {
    // direction matters; a bare .sort( passes an oldest-first comparator
    expect(page).toMatch(/\.sort\(\s*\(a,\s*b\)\s*=>\s*b\.data\.published!?\.getTime\(\)\s*-\s*a\.data\.published!?\.getTime\(\)/);
  });

  it('is a single column, not a card grid', () => {
    // forbidding only repeat() lets a literal three-column grid through, which
    // is the exact failure the one-brief-or-thirty constraint names; the
    // `columns` multi-column shorthand is a third way to the same failure.
    // Non-global .match() only ever returns the first `.list { ... }` block,
    // so a second .list rule added inside a media query (a real three-column
    // grid at a wide breakpoint, say) would stay invisible to a test built on
    // that one match. Every .list block is collected and checked instead.
    const listRules = [...page.matchAll(/\.list\s*\{[^}]*\}/g)].map((m) => m[0]);
    expect(listRules.length).toBeGreaterThan(0);
    for (const rule of listRules) {
      expect(rule).not.toMatch(/grid-template-columns|column-count|columns\s*:/);
    }
  });

  it('says plainly when nothing is published rather than showing an empty page', () => {
    // an orphaned .empty CSS rule satisfies a bare substring check while the
    // branch that renders the message is gone
    expect(page).toMatch(/briefs\.length\s*===\s*0[\s\S]{0,300}Nothing is published yet/);
  });
});
