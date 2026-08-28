import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (name: string) =>
  readFileSync(`research-kit/components/${name}.astro`, 'utf8');

describe('Page', () => {
  const src = read('Page');

  it('carries no style block, because deck.css owns its classes', () => {
    // Panels shipped as the only component with no style block and emitted
    // nine classes that existed only in Noland, so it rendered unstyled the
    // first time Eleven One drew it. That is impossible now the classes are
    // in the kit, and a style block here would be the mistake in reverse.
    expect(src).not.toMatch(/<style/);
  });

  it('pads the title when and only when a kicker is present', () => {
    // Correct on 7 of 7 in the corpus and enforced by nothing until now.
    const expr = src.match(/'s-pad-t--sm':\s*([^\n}]+)/)![1]!;
    expect(expr).toMatch(/kicker/);
  });

  it('forwards unknown attributes to its root, so inline spacing survives', () => {
    // The corpus carries 71 ad-hoc inline styles. Modelling them is a separate
    // decision; losing them is a silent paint change on dozens of pages.
    expect(src).toMatch(/\.\.\.rest/);
  });

  it('renders the default-slot body inside the growing zone, not beside it', () => {
    // The class list may be built inline or, per the lesson from an earlier
    // task, assigned to a frontmatter variable and referenced by name -
    // Astro rejects a multi-line object literal inside an attribute
    // expression. Either way it must carry 's-grow' and sit ahead of the
    // default slot.
    expect(src).toMatch(/'s-grow'/);
    const bodyDivAt = src.search(/<div class:list=\{[^}]*\}>/);
    expect(bodyDivAt, 'no class:list div found for the body zone').toBeGreaterThan(-1);
    expect(src.slice(bodyDivAt)).toMatch(/^<div class:list=\{[^}]*\}>\s*<slot\s*\/>/);
  });

  it('emits the foot before the source, because the corpus writes it that way on all 22 pages that carry both', () => {
    const footAt = src.indexOf('{foot');
    const sourceAt = src.indexOf('{source');
    expect(footAt, 'no {foot} expression found').toBeGreaterThan(-1);
    expect(sourceAt, 'no {source} expression found').toBeGreaterThan(-1);
    expect(footAt).toBeLessThan(sourceAt);
  });

  it('defaults col to true, and the body zone drops s-col only when it is set false', () => {
    expect(src).toMatch(/col\s*=\s*true/);
    expect(src).toMatch(/'s-col':\s*col/);
  });

  it('renders a close slot between the body zone and the foot, for the finding/annot/implication block that follows it', () => {
    const bodyDivEnd = src.indexOf('</div>', src.search(/<slot\s*\/>/));
    const closeSlotAt = src.indexOf('<slot name="close"');
    const footAt = src.indexOf('{foot');
    expect(closeSlotAt, 'no named close slot found').toBeGreaterThan(-1);
    expect(closeSlotAt).toBeGreaterThan(bodyDivEnd);
    expect(closeSlotAt).toBeLessThan(footAt);
  });

  it('renders a lead slot between the title and the body zone, for the s-kpi band that precedes it', () => {
    const titleAt = src.indexOf('s-pad-t--sm');
    const leadSlotAt = src.indexOf('<slot name="lead"');
    const bodyDivAt = src.search(/<div class:list=\{[^}]*\}>/);
    expect(leadSlotAt, 'no named lead slot found').toBeGreaterThan(-1);
    expect(leadSlotAt).toBeGreaterThan(titleAt);
    expect(leadSlotAt).toBeLessThan(bodyDivAt);
  });

  it('carries no sub prop: the 13 s-sub elements in the corpus are body content nested inside charts and columns, not a skeleton layer, and zero of them follow a title', () => {
    expect(src).not.toMatch(/\bsub\b/);
  });

  it('carries sourcePad, the one inline style any s-source takes anywhere in the corpus, as a boolean rather than a string', () => {
    // padding-top: var(--ct-space-3) is the only style any s-source line
    // carries in the corpus, so one boolean covers every case rather than
    // reopening the string-vs-expression problem for a style attribute.
    expect(src).toMatch(/sourcePad\s*=\s*false/);
    expect(src).toMatch(/padding-top:\s*var\(--ct-space-3\)/);
  });

  it('emits no style attribute at all when sourcePad is unset, not an empty one', () => {
    // Astro omits a style={undefined} attribute outright; style="" would be
    // a different (and wrong) result, and the html-diff on the 55 pages
    // already migrated is the thing that would have caught it.
    const sourceLineAt = src.indexOf('class="s-source"');
    expect(sourceLineAt, 'no s-source line found').toBeGreaterThan(-1);
    const nearby = src.slice(Math.max(0, sourceLineAt - 120), sourceLineAt + 150);
    expect(nearby).toMatch(/style=\{sourcePad[^}]*undefined[^}]*\}/);
  });
});

describe('Cover', () => {
  const src = read('Cover');

  it('carries no style block', () => {
    expect(src).not.toMatch(/<style/);
  });

  it('defaults the art modifier on when art is present', () => {
    // Under Eleven One's light ground a photographic cover without
    // s-cover--art gives its furniture a muted grey gated against ink, which
    // measured 1.66:1 to 3.52:1 the first time it shipped. Defaulting the
    // modifier on makes that impossible to get wrong by omission.
    //
    // Asserts the computed expression, not the bare class name: the docblock
    // above the component names s-cover--art too, so a substring match here
    // would pass against a component that never applies it.
    const expr = src.match(/'s-cover--art':\s*([^\n}]+)/)![1]!;
    expect(expr).toContain('onArt');
    expect(src).toMatch(/const onArt = Boolean\(art\) && furniture !== 'base'/);
  });

  it('lets a cover opt out of it, because Noland measures fine without', () => {
    // Argo's deck cover carries art and not the modifier, and that is correct
    // rather than a defect. Noland's base s-cover is already a dark field with
    // light furniture, and against Argo's scrim it measures 9.25:1 at the
    // kicker, 11.00:1 at the body and 11.28:1 at the foot. Deriving with no
    // escape would repaint four elements on that page for no gain, inside a
    // migration whose only proof is that paint did not move.
    //
    // Asserts the destructured prop and its default, not the word: "furniture"
    // appears in this component's docblock, so a substring match would pass
    // against a component that never reads it.
    expect(src).toMatch(/furniture\s*=\s*'auto'/);
    expect(src).toMatch(/furniture\?:\s*'auto'\s*\|\s*'base'/);
  });

  it('draws the scrim only with art, because a scrim over nothing is a grey wash', () => {
    expect(src).toMatch(/art\s*&&[\s\S]{0,200}s-cover__scrim/);
  });

  it('keeps the foot spacing the corpus carries on all 14', () => {
    expect(src).toContain('margin-top: var(--ct-space-12)');
  });

  it('lets the deck cover be an h1 and a divider an h2', () => {
    // A component that destructures level but never reads it (an always-h2
    // Cover) would pass a bare /level/ match. Pin the derivation instead:
    // the tag is computed from level, the computed tag is what gets
    // rendered, and the default is 2, which is what all 13 dividers in the
    // corpus rely on implicitly by never passing level at all.
    expect(src).toMatch(/level\s*=\s*2\b/);
    expect(src).toMatch(/const Title = level === 1 \? 'h1' : 'h2'/);
    expect(src).toMatch(/<Title\b/);
  });
});

describe('RailPage', () => {
  const src = read('RailPage');

  it('carries no style block', () => {
    expect(src).not.toMatch(/<style/);
  });

  it('keeps s-col optional, because migration preserves and does not fix', () => {
    // 20 of 22 main columns carry s-col and 2 do not, and s-col is
    // display:flex, flex-direction:column, height:100%, so the two lay out
    // differently. They may well be an oversight. Normalising them here would
    // move Argo's paint inside a migration whose only proof is that paint did
    // not move, so the option stays and the question is recorded.
    expect(src).toMatch(/'s-col':\s*col/);
  });

  it('takes both halves as slots, because only the wrapper is boilerplate', () => {
    expect(src).toMatch(/<slot\s*\/>/);
    expect(src).toMatch(/<slot name="rail"/);
  });
});

describe('Finding and Implication', () => {
  it('keep separate components for separate deck.css objects', () => {
    // Same label-plus-body shape, different treatment. Merging them would put
    // the choice of visual treatment behind a prop that reads as a preference.
    expect(read('Finding')).toContain('s-finding');
    expect(read('Finding')).not.toContain('s-implication');
    expect(read('Implication')).toContain('s-implication');
    expect(read('Implication')).not.toContain('s-finding');
  });

  it('carry no style block', () => {
    expect(read('Finding')).not.toMatch(/<style/);
    expect(read('Implication')).not.toMatch(/<style/);
  });

  it('give Finding the ink modifier, which 6 of 39 carry', () => {
    expect(read('Finding')).toMatch(/'s-finding--ink':\s*ink/);
  });
});

describe('Comment and Annot', () => {
  it('carry no style block', () => {
    expect(read('Comment')).not.toMatch(/<style/);
    expect(read('Annot')).not.toMatch(/<style/);
  });

  it("give Comment's first-item spacing as a pad field on the item record, not derived from position", () => {
    // 16 of 63 comment items carry s-pad-t--sm. Checked against
    // src/components/argo/S0*.astro before writing this component: the
    // padded item is always the first in its rail, but not every rail's
    // first item is padded (S04 alone has five unpadded first items sitting
    // beside two padded ones), so index alone over-applies the class to
    // rails the corpus never padded. It is an authorial choice per rail, not
    // a position, so it is a field on the item record.
    const expr = read('Comment').match(/'s-pad-t--sm':\s*([^\n}]+)/)![1]!;
    expect(expr).toMatch(/item\.pad|pad\b/);
    expect(expr).not.toMatch(/i\s*===\s*0|index\s*===\s*0/);
  });

  it('give Annot the bare modifier, which 1 of 16 carries', () => {
    expect(read('Annot')).toMatch(/'s-annot--bare':\s*bare/);
  });

  it('give Annot the field modifier, closed round 1 of Task 10 for project-argo.astro\'s contents page', () => {
    // s-annot--field is real in deck.css (the grey ground, same field the KPI
    // band uses) but had no prop until the coverage guard's fixed needle
    // caught project-argo.astro still hand-writing
    // class="s-annot s-annot--field" for exactly this reason.
    expect(read('Annot')).toMatch(/'s-annot--field':\s*field/);
  });
});

describe('Matrix', () => {
  const src = read('Matrix');

  it('carries no style block', () => {
    expect(src).not.toMatch(/<style/);
  });

  it('requires cols, because every matrix in the corpus sets one', () => {
    // --cols is structural, not decoration: 23 matrices carry 23 different
    // grid templates. A default would silently lay a table out wrong.
    expect(src).toMatch(/cols:\s*string;/);
    expect(src).not.toMatch(/cols\s*=\s*['"]/);
  });

  it('takes cell kind from the row records, not from a caller writing classes', () => {
    expect(src).toMatch(/s-matrix__cell--term/);
    expect(src).toMatch(/s-matrix__cell--num/);
    expect(src).toMatch(/s-matrix__cell--ord/);
    expect(src).toMatch(/s-matrix__cell--lv/);
  });

  it('emits the ordinal level class without resolving its colour', () => {
    // --lv1 reads --deck-ordinal-lv1, the one site-supplied name in the kit.
    // The component emits the class; the site supplies the value, exactly as
    // today. The ordinal palette question stays open and stays out of scope.
    expect(src).not.toMatch(/--deck-ordinal/);
  });
});

describe('Kpi and Dense', () => {
  it('carry no style block', () => {
    expect(read('Kpi')).not.toMatch(/<style/);
    expect(read('Dense')).not.toMatch(/<style/);
  });

  it('mark the Kpi value and the Dense row, which are different elements', () => {
    // The mark lands on s-kpi__value and on s-dense__row. Putting it on the
    // item in one and the row in the other is not an inconsistency to tidy:
    // it is where deck.css draws it.
    expect(read('Kpi')).toMatch(/'s-kpi__value--mark'/);
    expect(read('Dense')).toMatch(/'s-dense__row--mark'/);
  });

  it('give Dense optional num and pp fields, closed round 1 of Task 10 for project-argo.astro\'s contents table', () => {
    // project-argo.astro's contents page carries 4 fields per row (num,
    // term, body, pp) against Dense's original 2 (term, body). s-dense__num
    // and s-dense__pp are both real classes in deck.css. num sits before
    // term and pp sits after body, matching the corpus row order, and both
    // render as <p>, like every other cell in this component.
    const src = read('Dense');
    expect(src).toMatch(/num\?:\s*string/);
    expect(src).toMatch(/pp\?:\s*string/);
    expect(src).toMatch(/<p class="s-dense__num">/);
    expect(src).toMatch(/<p class="s-dense__pp">/);
    const numAt = src.indexOf('s-dense__num');
    const termAt = src.indexOf('s-dense__term');
    const bodyAt = src.indexOf('s-dense__body');
    const ppAt = src.indexOf('s-dense__pp');
    expect(numAt).toBeGreaterThan(-1);
    expect(numAt).toBeLessThan(termAt);
    expect(termAt).toBeLessThan(bodyAt);
    expect(bodyAt).toBeLessThan(ppAt);
  });
});
