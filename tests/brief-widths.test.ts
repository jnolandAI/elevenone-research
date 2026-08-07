import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const mdx = readFileSync('src/content/briefs/001-gross-margin.mdx', 'utf8');
const layout = readFileSync('src/layouts/Brief.astro', 'utf8');
const route = readFileSync('src/pages/briefs/[...slug].astro', 'utf8');

// The components map on <Content /> is where the restriction actually lives.
// Checking only what Brief 001 happens to contain today tests the content, not
// the rule: widen the map and every assertion below would still pass until some
// future brief used the new freedom.
const allowed = (route.match(/components=\{\{([^}]*)\}\}/)?.[1] ?? '')
  .split(',').map((t) => t.trim()).filter(Boolean).sort();

describe('two widths and no others', () => {
  it('keeps the load path and the method block out of the author\'s reach', () => {
    // both take the frame width, so they are rendered by the layout from
    // frontmatter and cannot be reached from a brief body at all
    expect(allowed).not.toContain('LoadPath');
    expect(allowed).not.toContain('Method');
    expect(layout).toContain('<LoadPath');
    expect(layout).toContain('<Method');
    expect(mdx).not.toContain('<LoadPath');
    expect(mdx).not.toContain('<Method');
  });

  it('allows only the three components a brief body is entitled to use', () => {
    expect(allowed).toEqual(['Claim', 'DataFigure', 'Takeaways']);
    const used = [...new Set([...mdx.matchAll(/<([A-Z][\w]*)/g)].map((m) => m[1]))].sort();
    expect(used).toEqual(['Claim', 'DataFigure', 'Takeaways']);
  });

  it('declares no width the token layer does not name', () => {
    // scoped to the rule that sets the columns: a stray var(--read) elsewhere
    // in the file would satisfy a whole-file substring check.
    // Non-global .match() only ever returns the FIRST `.doc { ... }` block,
    // but .doc is declared twice: the base rule and its override inside
    // @media (max-width: 900px). A third width added only to the media-query
    // copy would satisfy every assertion built on the first match alone, so
    // every .doc block is collected and checked.
    const docRules = [...layout.matchAll(/\.doc\s*\{[^}]*\}/g)].map((m) => m[0]);
    expect(docRules.length).toBeGreaterThan(1);
    const baseDocRule = docRules[0]!;
    expect(baseDocRule).toContain('var(--read)');
    expect(baseDocRule).toContain('var(--rail)');
    // No pixel value anywhere in any .doc rule that sets the columns. Checking
    // only for a `width: Npx` declaration misses how a third width would
    // actually arrive: minmax(0, 220px) inside grid-template-columns satisfies
    // both assertions above and introduces the third width regardless.
    for (const rule of docRules) expect(rule).not.toMatch(/\d+px/);
    // Excludes the 900px responsive breakpoint, which is a media feature
    // (terminated by `)`) rather than a CSS declaration (terminated by `;`)
    // and is not one of the two content widths this rule is about. Every
    // sibling brief component uses the same literal breakpoint. A version of
    // this pattern with no lookahead also flags `@media (max-width: 900px)`
    // itself, which would make the rule fail against the layout the task
    // brief specifies verbatim, so the lookahead is load-bearing here.
    expect(layout).not.toMatch(/(max-)?width:\s*\d+px(?!\))/);
  });
});
