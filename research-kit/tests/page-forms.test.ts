/**
 * Rendered-output tests for the ten page-form components, via
 * experimental_AstroContainer — the same pattern tests/home.test.ts,
 * tests/loadpath.test.ts and tests/mark.test.ts already use.
 *
 * This file used to assert on component source text: regexes over the .astro
 * files, pinning destructuring defaults and class:list expressions by their
 * spelling. Those were change detectors, not behavior tests — a correct
 * refactor of a frontmatter expression broke them, and a component that
 * mentioned a class name in a comment could pass without emitting it. Every
 * behavioral claim now renders the component and reads the HTML.
 *
 * Two kinds of assertion stay at source level, on purpose:
 * - "carries no style block": the container does not inline scoped styles
 *   into renderToString output, so the absence of a <style> block is a source
 *   fact. Panels shipped as the only component with no style block and
 *   emitted nine classes that existed only in Noland, so it rendered
 *   unstyled the first time Eleven One drew it; the classes are in the kit
 *   now, and a style block here would be the mistake in reverse.
 * - Matrix's cols having no default: requiredness is a type-level fact a
 *   render cannot observe (rendering without cols just emits "--cols:
 *   undefined" at runtime).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import Page from '../components/Page.astro';
import Cover from '../components/Cover.astro';
import Split from '../components/Split.astro';
import Finding from '../components/Finding.astro';
import Implication from '../components/Implication.astro';
import Comment from '../components/Comment.astro';
import Annot from '../components/Annot.astro';
import Matrix from '../components/Matrix.astro';
import Kpi from '../components/Kpi.astro';
import Dense from '../components/Dense.astro';

const read = (name: string) =>
  readFileSync(`research-kit/components/${name}.astro`, 'utf8');

const render = async (
  Component: Parameters<AstroContainer['renderToString']>[0],
  options?: Parameters<AstroContainer['renderToString']>[1],
) => {
  const container = await AstroContainer.create();
  return container.renderToString(Component, options);
};

describe('every page form', () => {
  it('carries no style block, because deck.css owns its classes', () => {
    const names = [
      'Page', 'Cover', 'Split', 'Finding', 'Implication',
      'Comment', 'Annot', 'Matrix', 'Kpi', 'Dense',
    ];
    for (const name of names) expect(read(name), name).not.toMatch(/<style/);
  });
});

describe('Page', () => {
  it('pads the title when and only when a kicker is present', async () => {
    // Correct on 7 of 7 in the corpus.
    const withKicker = await render(Page, { props: { kicker: 'Section', title: 'T' } });
    const without = await render(Page, { props: { title: 'T' } });
    expect(withKicker).toMatch(/<h2[^>]*class="[^"]*\bs-pad-t--sm\b[^"]*"/);
    expect(withKicker).toContain('s-kicker');
    expect(without).not.toContain('s-pad-t--sm');
    expect(without).not.toContain('s-kicker');
  });

  it('forwards unknown attributes to its root, so inline spacing survives', async () => {
    // The corpus carries 71 ad-hoc inline styles. Modelling them is a separate
    // decision; losing them is a silent paint change on dozens of pages.
    const html = await render(Page, {
      props: { title: 'T', style: 'margin-top: var(--ct-space-4)' },
    });
    const root = html.match(/<div[^>]*class="s-stack"[^>]*>/)?.[0];
    expect(root, 'no s-stack root found').toBeTruthy();
    expect(root!).toContain('style="margin-top: var(--ct-space-4)"');
  });

  it('renders the default-slot body inside the growing zone, not beside it', async () => {
    const html = await render(Page, {
      props: { title: 'T' },
      slots: { default: '<p id="body-probe"></p>' },
    });
    const zone = html.match(/<div[^>]*class="[^"]*\bs-grow\b[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(zone, 'no s-grow zone found').toBeTruthy();
    expect(zone![1]).toContain('body-probe');
  });

  it('emits the foot before the source, because the corpus writes it that way on all 22 pages that carry both', async () => {
    const html = await render(Page, { props: { title: 'T', foot: 'F-note', source: 'S-line' } });
    const footAt = html.indexOf('s-foot');
    const sourceAt = html.indexOf('s-source');
    expect(footAt, 'no s-foot rendered').toBeGreaterThan(-1);
    expect(sourceAt, 'no s-source rendered').toBeGreaterThan(-1);
    expect(footAt).toBeLessThan(sourceAt);
  });

  it('defaults col to true, and the body zone drops s-col only when it is set false', async () => {
    const on = await render(Page, { props: { title: 'T' } });
    const off = await render(Page, { props: { title: 'T', col: false } });
    expect(on).toMatch(/class="[^"]*\bs-col\b[^"]*"/);
    expect(off).not.toMatch(/\bs-col\b/);
  });

  it('swaps s-pad-t for s-pad-t--lg when padLg is set, which 2 of 71 pages carry', async () => {
    const lg = await render(Page, { props: { title: 'T', padLg: true } });
    const plain = await render(Page, { props: { title: 'T' } });
    expect(lg).toContain('s-pad-t--lg');
    expect(plain).toMatch(/\bs-pad-t\b(?!--)/);
    expect(plain).not.toContain('s-pad-t--lg');
  });

  it('renders the close slot between the body zone and the foot, for the finding/annot/implication block that follows it', async () => {
    const html = await render(Page, {
      props: { title: 'T', foot: 'F-note' },
      slots: { default: '<p id="body-probe"></p>', close: '<p id="close-probe"></p>' },
    });
    const zone = html.match(/<div[^>]*class="[^"]*\bs-grow\b[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(zone![1], 'close slot leaked into the body zone').not.toContain('close-probe');
    const closeAt = html.indexOf('close-probe');
    expect(closeAt, 'no close slot rendered').toBeGreaterThan(-1);
    expect(closeAt).toBeGreaterThan(html.indexOf('body-probe'));
    expect(closeAt).toBeLessThan(html.indexOf('s-foot'));
  });

  it('renders the lead slot between the title and the body zone, for the s-kpi band that precedes it', async () => {
    const html = await render(Page, {
      props: { title: 'T' },
      slots: { default: '<p id="body-probe"></p>', lead: '<p id="lead-probe"></p>' },
    });
    const zone = html.match(/<div[^>]*class="[^"]*\bs-grow\b[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(zone![1], 'lead slot leaked into the body zone').not.toContain('lead-probe');
    const leadAt = html.indexOf('lead-probe');
    expect(leadAt, 'no lead slot rendered').toBeGreaterThan(-1);
    expect(leadAt).toBeGreaterThan(html.indexOf('</h2>'));
    expect(leadAt).toBeLessThan(html.indexOf('body-probe'));
  });

  /* Page carries no `sub` prop, on purpose: the 13 `s-sub` elements in the
     corpus are body content nested inside charts and columns, not a skeleton
     layer, and zero of them follow a title.

     There used to be a test here asserting `expect(src).not.toMatch(/\bsub\b/)`.
     It was deleted on 2026-08-28. It pinned the ABSENCE of a prop by grepping
     the component's prose, so it fired on the standalone word "sub" appearing
     anywhere in the file — including in a comment explaining why the prop does
     not exist. A test that breaks when you document the thing it is testing is
     not testing that thing. The reason lives here instead, where it can be
     read and argued with; if `sub` is ever added, the argument above is what
     has to be answered, not a regex. */

  it('pads the source line only when sourcePad is set, with the one inline style any s-source takes in the corpus', async () => {
    // padding-top: var(--ct-space-3) is the only style any s-source line
    // carries in the corpus, so one boolean covers every case rather than
    // reopening the string-vs-expression problem for a style attribute.
    const padded = await render(Page, { props: { title: 'T', source: 'S', sourcePad: true } });
    const tag = padded.match(/<p[^>]*class="s-source"[^>]*>/)?.[0];
    expect(tag, 'no s-source rendered').toBeTruthy();
    expect(tag!).toContain('style="padding-top: var(--ct-space-3)"');
  });

  it('emits no style attribute at all when sourcePad is unset, not an empty one', async () => {
    // style="" would be a different (and wrong) result from omitting the
    // attribute, and the html-diff on the migrated pages is the thing that
    // would have caught it at migration time. This pins it from now on.
    const plain = await render(Page, { props: { title: 'T', source: 'S' } });
    const tag = plain.match(/<p[^>]*class="s-source"[^>]*>/)?.[0];
    expect(tag, 'no s-source rendered').toBeTruthy();
    expect(tag!).not.toContain('style=');
  });
});

describe('Cover', () => {
  const base = { kicker: 'K', title: 'T', foot: ['Foot one', 'Foot two'] };
  const art = { src: '/a.png', alt: 'alt text', width: 1280, height: 720 };

  it('defaults the art modifier on when art is present', async () => {
    // Under Eleven One's light ground a photographic cover without
    // s-cover--art gives its furniture a muted grey gated against ink, which
    // measured 1.66:1 to 3.52:1 the first time it shipped. Defaulting the
    // modifier on makes that impossible to get wrong by omission.
    const withArt = await render(Cover, { props: { ...base, art } });
    const plain = await render(Cover, { props: base });
    expect(withArt).toMatch(/class="[^"]*\bs-cover--art\b[^"]*"/);
    expect(plain).not.toContain('s-cover--art');
  });

  it('lets a cover opt out of it, because Noland measures fine without', async () => {
    // Argo's deck cover carries art and not the modifier, and that is correct
    // rather than a defect. Noland's base s-cover is already a dark field with
    // light furniture, and against Argo's scrim it measures 9.25:1 at the
    // kicker, 11.00:1 at the body and 11.28:1 at the foot. Deriving with no
    // escape would repaint four elements on that page for no gain.
    const opted = await render(Cover, { props: { ...base, art, furniture: 'base' } });
    expect(opted).not.toContain('s-cover--art');
    expect(opted).toContain('s-cover__img');
  });

  it('draws the image and scrim only with art, because a scrim over nothing is a grey wash', async () => {
    const withArt = await render(Cover, { props: { ...base, art } });
    const plain = await render(Cover, { props: base });
    expect(withArt).toContain('s-cover__img');
    expect(withArt).toContain('s-cover__scrim');
    expect(plain).not.toContain('s-cover__img');
    expect(plain).not.toContain('s-cover__scrim');
  });

  it('keeps the foot spacing the corpus carries on all 14, one <p> per line', async () => {
    const html = await render(Cover, { props: base });
    const tag = html.match(/<div[^>]*class="s-cover__foot"[^>]*>/)?.[0];
    expect(tag, 'no s-cover__foot rendered').toBeTruthy();
    expect(tag!).toContain('style="margin-top: var(--ct-space-12)"');
    expect(html).toMatch(/<p[^>]*>Foot one<\/p>\s*<p[^>]*>Foot two<\/p>/);
  });

  it('lets the deck cover be an h1 and a divider an h2, defaulting to 2 as all 13 dividers rely on', async () => {
    const deck = await render(Cover, { props: { ...base, level: 1 } });
    const divider = await render(Cover, { props: base });
    expect(deck).toMatch(/<h1[^>]*class="[^"]*s-cover__title/);
    expect(divider).toMatch(/<h2[^>]*class="[^"]*s-cover__title/);
  });
});

describe('Split', () => {
  const slots = {
    default: '<p id="main-probe"></p>',
    rail: '<p id="rail-probe"></p>',
  };

  it('keeps s-col optional, because migration preserves and does not fix', async () => {
    // 20 of 22 main columns carry s-col and 2 do not, and s-col is
    // display:flex, flex-direction:column, height:100%, so the two lay out
    // differently. They may well be an oversight. Normalising them here would
    // move Argo's paint, so the option stays and the question is recorded.
    const on = await render(Split, { slots });
    const off = await render(Split, { props: { col: false }, slots });
    expect(on).toMatch(/class="[^"]*s-split__main[^"]*\bs-col\b[^"]*"/);
    expect(off).not.toMatch(/\bs-col\b/);
  });

  it('takes both halves as slots, because only the wrapper is boilerplate', async () => {
    const html = await render(Split, { slots });
    const main = html.match(/<div[^>]*class="[^"]*s-split__main[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const side = html.match(/<div[^>]*class="[^"]*s-split__side[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    expect(main, 'no main column rendered').toBeTruthy();
    expect(side, 'no side column rendered').toBeTruthy();
    expect(main![1]).toContain('main-probe');
    expect(side![1]).toContain('rail-probe');
  });
});

describe('Finding and Implication', () => {
  it('keep separate components for separate deck.css objects', async () => {
    // Same label-plus-body shape, different treatment. Merging them would put
    // the choice of visual treatment behind a prop that reads as a preference.
    const f = await render(Finding, { props: { label: 'Verdict' }, slots: { default: 'the finding body' } });
    const i = await render(Implication, { props: { label: 'So what' }, slots: { default: 'the implication body' } });
    expect(f).toContain('s-finding');
    expect(f).not.toContain('s-implication');
    expect(i).toContain('s-implication');
    expect(i).not.toContain('s-finding');
  });

  it('render the label and the slot body into their deck.css elements', async () => {
    const f = await render(Finding, { props: { label: 'Verdict' }, slots: { default: 'the finding body' } });
    expect(f).toMatch(/<p[^>]*class="s-finding__label"[^>]*>Verdict<\/p>/);
    expect(f).toMatch(/<p[^>]*class="s-finding__body"[^>]*>[\s\S]*the finding body/);
  });

  it('give Finding the ink modifier, which 6 of 39 carry', async () => {
    const ink = await render(Finding, { props: { label: 'L', ink: true }, slots: { default: 'b' } });
    const plain = await render(Finding, { props: { label: 'L' }, slots: { default: 'b' } });
    expect(ink).toContain('s-finding--ink');
    expect(plain).not.toContain('s-finding--ink');
  });
});

describe('Comment and Annot', () => {
  it("give Comment's item spacing as a pad field on the item record, not derived from position", async () => {
    // 16 of 63 comment items carry s-pad-t--sm. Checked against
    // src/components/argo/S0*.astro before writing this component: the
    // padded item is always the first in its rail, but not every rail's
    // first item is padded (S04 alone has five unpadded first items sitting
    // beside two padded ones), so index alone over-applies the class to
    // rails the corpus never padded. It is an authorial choice per rail, not
    // a position — so an unpadded first item beside a padded second is the
    // exact rendering an index-derived class could not produce.
    const html = await render(Comment, {
      props: {
        items: [
          { lead: 'first-lead', body: 'b1' },
          { lead: 'second-lead', body: 'b2', pad: 3 },
        ],
      },
    });
    expect(html).toMatch(/<div[^>]*class="s-comment__item"[^>]*>\s*<p[^>]*>first-lead/);
    expect(html).toMatch(/<div[^>]*class="s-comment__item s-pad-t--sm"[^>]*>\s*<p[^>]*>second-lead/);
  });

  it('carries pad 4 as the one observed ad-hoc inline override, not a class', async () => {
    // One item (S04) pads at the larger step, which s-pad-t--sm cannot
    // express, so 4 renders as the same inline style the corpus writes.
    const html = await render(Comment, {
      props: { items: [{ lead: 'l', body: 'b', pad: 4 }] },
    });
    expect(html).toContain('padding-top: var(--ct-space-4)');
    expect(html).not.toContain('s-pad-t--sm');
  });

  it('give Annot the bare modifier, which 1 of 16 carries', async () => {
    const items = [{ lead: 'l', body: 'b' }];
    const bare = await render(Annot, { props: { items, bare: true } });
    const plain = await render(Annot, { props: { items } });
    expect(bare).toContain('s-annot--bare');
    expect(plain).not.toContain('s-annot--bare');
  });

  it('give Annot the field modifier, closed round 1 of Task 10 for project-argo.astro\'s contents page', async () => {
    // s-annot--field is real in deck.css (the grey ground, same field the KPI
    // band uses) but had no prop until the coverage guard's fixed needle
    // caught project-argo.astro still hand-writing
    // class="s-annot s-annot--field" for exactly this reason.
    const field = await render(Annot, { props: { items: [{ lead: 'l', body: 'b' }], field: true } });
    expect(field).toContain('s-annot--field');
  });

  it('render each item as a lead/body pair inside its item div', async () => {
    const html = await render(Annot, { props: { items: [{ lead: 'the-lead', body: 'the-body' }] } });
    expect(html).toMatch(/<p[^>]*class="s-annot__lead"[^>]*>the-lead<\/p>\s*<p[^>]*class="s-annot__body"[^>]*>the-body<\/p>/);
  });
});

describe('Matrix', () => {
  const rows = [
    { cells: ['Head A', 'Head B'], head: true },
    { cells: [{ text: 'a-term', kind: 'term' }, { text: '42', kind: 'num' }] },
    { cells: [{ text: 'an-ord', kind: 'ord', level: 2 }, 'plain-cell'], mark: true },
  ];

  it('requires cols, because every matrix in the corpus sets one, and emits it as the grid template', async () => {
    // --cols is structural, not decoration: 23 matrices carry 23 different
    // grid templates. A default would silently lay a table out wrong.
    // Requiredness is a type fact a render cannot observe, so that half
    // stays a source assertion.
    expect(read('Matrix')).toMatch(/cols:\s*string;/);
    expect(read('Matrix')).not.toMatch(/cols\s*=\s*['"]/);
    const html = await render(Matrix, { props: { rows, cols: '130px 1fr' } });
    const root = html.match(/<div[^>]*class="[^"]*\bs-matrix\b[^"]*"[^>]*>/)?.[0];
    expect(root, 'no s-matrix root rendered').toBeTruthy();
    expect(root!).toContain('--cols: 130px 1fr');
  });

  it('takes cell kind from the row records, not from a caller writing classes', async () => {
    const html = await render(Matrix, { props: { rows, cols: '1fr 1fr' } });
    expect(html).toMatch(/<p[^>]*class="s-matrix__cell s-matrix__cell--term"[^>]*>a-term/);
    expect(html).toMatch(/<p[^>]*class="s-matrix__cell s-matrix__cell--num"[^>]*>42/);
    expect(html).toMatch(/<p[^>]*class="s-matrix__cell s-matrix__cell--ord s-matrix__cell--lv2"[^>]*>an-ord/);
    expect(html).toMatch(/<p[^>]*class="s-matrix__cell"[^>]*>plain-cell/);
  });

  it('takes head and mark from the row records the same way', async () => {
    const html = await render(Matrix, { props: { rows, cols: '1fr 1fr' } });
    expect(html).toMatch(/s-matrix__row--head[^>]*>\s*<p[^>]*>Head A/);
    expect(html).toMatch(/s-matrix__row--mark[^>]*>\s*<p[^>]*>an-ord/);
  });

  it('emits the ordinal level class without resolving its colour', async () => {
    // --lv2 reads --deck-ordinal-lv2, the one site-supplied name in the kit.
    // The component emits the class; the site supplies the value, exactly as
    // today. The ordinal palette question stays open and stays out of scope.
    const html = await render(Matrix, { props: { rows, cols: '1fr 1fr' } });
    expect(html).toContain('s-matrix__cell--lv2');
    expect(html).not.toContain('--deck-ordinal');
  });
});

describe('Kpi and Dense', () => {
  it('mark the Kpi value and the Dense row, which are different elements', async () => {
    // The mark lands on s-kpi__value and on s-dense__row. Putting it on the
    // item in one and the row in the other is not an inconsistency to tidy:
    // it is where deck.css draws it.
    const kpi = await render(Kpi, {
      props: {
        items: [
          { value: '42%', label: 'marked-share', mark: true },
          { value: '7', label: 'plain-count' },
        ],
      },
    });
    expect(kpi).toMatch(/<p[^>]*class="s-kpi__value s-kpi__value--mark"[^>]*>42%/);
    expect(kpi).toMatch(/<p[^>]*class="s-kpi__value"[^>]*>7</);

    const dense = await render(Dense, {
      props: { rows: [{ term: 'a-term', body: 'a-body', mark: true }] },
    });
    expect(dense).toMatch(/<div[^>]*class="s-dense__row s-dense__row--mark"[^>]*>/);
  });

  it('give Dense optional num and pp fields, closed round 1 of Task 10 for project-argo.astro\'s contents table', async () => {
    // project-argo.astro's contents page carries 4 fields per row (num,
    // term, body, pp) against Dense's original 2 (term, body). num sits
    // before term and pp sits after body, matching the corpus row order.
    const full = await render(Dense, {
      props: { rows: [{ num: '01', term: 'a-term', body: 'a-body', pp: 'pp. 4' }] },
    });
    const numAt = full.indexOf('s-dense__num');
    const termAt = full.indexOf('s-dense__term');
    const bodyAt = full.indexOf('s-dense__body');
    const ppAt = full.indexOf('s-dense__pp');
    expect(numAt, 'no s-dense__num rendered').toBeGreaterThan(-1);
    expect(numAt).toBeLessThan(termAt);
    expect(termAt).toBeLessThan(bodyAt);
    expect(bodyAt).toBeLessThan(ppAt);

    const minimal = await render(Dense, {
      props: { rows: [{ term: 't', body: 'b' }] },
    });
    expect(minimal).not.toContain('s-dense__num');
    expect(minimal).not.toContain('s-dense__pp');
  });
});

describe('the one-mark budget, wired into the components and not just the library', () => {
  // assertOneMark itself is covered in exhibits.test.ts. What that cannot
  // prove is that each component actually calls it on its own props: a
  // deleted import would leave the library green and the budget unenforced.
  // audit.mjs cannot see a caller-set prop either (the reason recorded in
  // Matrix.astro), so the render rejecting is the only guard there is.
  it('rejects a Matrix with two marked rows', async () => {
    const rows = [
      { cells: ['row-a'], mark: true },
      { cells: ['row-b'], mark: true },
    ];
    await expect(render(Matrix, { props: { rows, cols: '1fr' } })).rejects.toThrow(/Matrix/);
  });

  it('rejects a Matrix whose figure column is not set as a value lane', async () => {
    // The other half of the audit's table-craft reading, which lost its view
    // of componentised matrices the same day the mark budget did, and moved
    // here the same way. audit.mjs prints the count it cannot open.
    const rows = [
      { cells: ['ACV', '$44.0M'] },
      { cells: ['Margin', '12.5%'] },
      { cells: ['Multiple', '3.1x'] },
    ];
    await expect(render(Matrix, { props: { rows, cols: '1fr 1fr' } })).rejects.toThrow(/value lane/);
  });

  it('rejects a Kpi with two marked values', async () => {
    const items = [
      { value: '1', label: 'a', mark: true },
      { value: '2', label: 'b', mark: true },
    ];
    await expect(render(Kpi, { props: { items } })).rejects.toThrow(/Kpi/);
  });

  it('rejects a Dense with two marked rows', async () => {
    const rows = [
      { term: 'a', body: 'x', mark: true },
      { term: 'b', body: 'y', mark: true },
    ];
    await expect(render(Dense, { props: { rows } })).rejects.toThrow(/Dense/);
  });
});
