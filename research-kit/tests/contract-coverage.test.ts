/**
 * Does the kit actually READ the contract it publishes?
 *
 * The Meridian probe (2026-08-30, kit-probe/FINDINGS.md) rendered the whole
 * corpus under a third design system and found the contract's entire
 * typography layer was dead code: `--ct-font-display`, `--ct-font-body` and
 * `--ct-font-mono` were declared in tokens.contract.json, mapped by all three
 * adapters, gated by tokencheck, and consumed by nothing. deck.css set no
 * font-family anywhere, so type inherited from the host page's `body` rule by
 * accident. It went unnoticed for two consumers because both are
 * single-family systems, where inheriting the wrong token and inheriting the
 * right one look identical. The first two-family consumer rendered every
 * title in its body sans and no gate said a word.
 *
 * portability.mjs could not catch it: that script checks fill, stroke, color,
 * background-color and the four border-*-color longhands. A font is not a
 * paint property, so the gate that exists to catch "the kit assumes its host"
 * is blind to typography by construction.
 *
 * This is the cheap check that would have. A token the contract declares and
 * the kit never reads is a promise to adapter authors that nothing keeps:
 * every one of them pays the mapping cost, and the value silently does
 * nothing. The exemption list below is count-pinned and fails in BOTH
 * directions, following raw-markup.test.ts: an exemption that starts being
 * consumed is a stale exemption, and a stale list is how this rots.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const KIT = 'research-kit';

/** Every file in the kit that could read a token: styles, components, lib, scripts. */
function kitSources(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry === 'tests') continue;
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(css|astro|ts|mjs)$/.test(entry)) out.push(p);
    }
  };
  walk(KIT);
  return out;
}

const SOURCE_TEXT = kitSources()
  .map((p) => readFileSync(p, 'utf8'))
  .join('\n');

const declaredTokens = (): string[] => {
  const contract = JSON.parse(readFileSync(join(KIT, 'contract/tokens.contract.json'), 'utf8'));
  const names: string[] = [];
  for (const group of Object.values<any>(contract.groups ?? {})) {
    for (const n of group.names ?? []) names.push(n);
  }
  return names;
};

/**
 * Declared by the contract, deliberately not read by the kit. Each one is a
 * decision with a reason, not a backlog.
 */
const SCALE_COMPLETENESS =
  'Scale completeness: the contract publishes a whole ladder so a host maps it ' +
  'once and in one place, and the kit reads the steps its components actually ' +
  'need. An unused step is a rung, not a dead promise.';

const EXEMPT: Record<string, string> = {
  '--ct-font-mono':
    'No element in the kit is monospaced. The five places that align figures use ' +
    'font-variant-numeric: tabular-nums, which gets tabular figures out of the ' +
    "brand's own face rather than switching family. Assigning mono anywhere would " +
    'also be the one font change that is NOT inert for the existing consumers, ' +
    'since both map it to a different family than their body face.',
  '--ct-field-text':
    'A real contract defect, recorded rather than fixed here: covers paint their ' +
    'primary field type with --ct-text-on-field, so the field group\'s own ' +
    'field-text is a second name for one job. Consolidating moves a live token ' +
    'and belongs with the brand-expression work, not inside a font fix.',
  '--ct-mark-text':
    'Type carried ON the mark. No component paints text on a mark today; the mark ' +
    'is a fill and a rule, never a filled label.',
  '--ct-surface':
    'Panels in this kit sit on --ct-well (a recessed field) rather than on a ' +
    'raised surface. Declared for hosts that raise panels; unused until a ' +
    'component does.',
  '--ct-slide-measure':
    'The host computes the measure; the kit takes its width from --ct-slide-w ' +
    'and the padding tokens, so the derived value never has to agree twice.',
  '--ct-space-32': SCALE_COMPLETENESS,
  '--ct-weight-bold': SCALE_COMPLETENESS,
  '--ct-tracking-normal': SCALE_COMPLETENESS,
  '--ct-tracking-wide': SCALE_COMPLETENESS,
  '--ct-leading-11': SCALE_COMPLETENESS,
  '--ct-leading-14': SCALE_COMPLETENESS,
  '--ct-leading-16': SCALE_COMPLETENESS,
};

describe('the contract is a promise the kit keeps', () => {
  // Exact, not substring. The first cut of this test used a bare
  // includes(token) and reported --ct-field-text as consumed, because it is a
  // prefix of --ct-field-text-muted. A token census that cannot tell a token
  // from its own longer sibling is the same class of blindness it exists to
  // catch. The lookahead admits `var(--x)` and a script's
  // getPropertyValue('--x') while refusing --x-muted.
  const consumed = (token: string) =>
    new RegExp(`${token.replace(/[-]/g, '\\-')}(?![A-Za-z0-9_-])`).test(SOURCE_TEXT);

  it('reads every token it declares, except the ones exempted with a reason', () => {
    const dead = declaredTokens().filter((t) => !consumed(t) && !(t in EXEMPT));
    expect(dead, `declared by the contract and read by nothing: ${dead.join(', ')}`).toEqual([]);
  });

  it('carries no stale exemption, so the list shrinks as work is done', () => {
    // Fails in both directions. An exemption that IS now consumed means the
    // reason above is obsolete and the entry has to go, or the list rots into
    // a permanent excuse.
    const stale = Object.keys(EXEMPT).filter((t) => consumed(t));
    expect(stale, `exempted but actually consumed: ${stale.join(', ')}`).toEqual([]);
  });

  it('exempts exactly 12 tokens, so a new one cannot be waved through quietly', () => {
    expect(Object.keys(EXEMPT).length).toBe(12);
  });

  it('gives every exemption a real reason rather than a placeholder', () => {
    for (const [token, why] of Object.entries(EXEMPT)) {
      expect(why.length, token).toBeGreaterThan(30);
    }
  });
});

describe('typography reaches the page through the contract, not through the host body rule', () => {
  const slide = readFileSync(join(KIT, 'components/Slide.astro'), 'utf8');
  const deck = readFileSync(join(KIT, 'styles/deck.css'), 'utf8');

  it('sets the body face on the slide canvas, so every slotted child inherits it', () => {
    // font-family inherits, and .slide is the one element every page's content
    // sits inside, so one declaration here reaches all of it regardless of
    // which component drew it. Without this the canvas inherits whatever the
    // host set on `body`, which is exactly how the probe's serif system
    // rendered a whole deck in its sans.
    expect(slide).toMatch(/\.slide\s*\{[^}]*font-family:\s*var\(--ct-font-body\)/s);
  });

  it('sets the display face on the type that carries the page at large sizes', () => {
    // The kit decides WHICH elements are display type; the brand decides what
    // the display face IS. Both existing systems map display and body to one
    // family, so this split is inert for them and expressible for a
    // two-family system.
    for (const cls of ['.s-cover__title', '.s-display', '.s-title']) {
      const rule = new RegExp(`\\${cls}[^{]*\\{[^}]*font-family:\\s*var\\(--ct-font-display\\)`, 's');
      expect(deck, cls).toMatch(rule);
    }
  });
});
