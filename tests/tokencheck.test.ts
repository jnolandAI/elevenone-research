import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { checkAdapter, MEASURE_ORDER } from '../research-kit/contract/checks.mjs';
import { resolveTokens } from '../research-kit/contract/resolve.mjs';

const contract = JSON.parse(readFileSync('research-kit/contract/tokens.contract.json', 'utf8'));
const allNames = Object.values(contract.groups).flatMap((g: any) => g.names) as string[];

/* A synthetic system, not either real one: the point is to exercise the checks,
   and a fixture that quoted a real ramp would fail for a brand's reasons rather
   than the validator's. Values are chosen to clear every floor with room. */
/* series-3 is #282828 and not #141414, which is where it started. #141414 sits
   0.0136 from this fixture's --ct-mark of #111111: the synthetic system carried
   the same defect as both real ones, and passed, because nothing measured the
   pair. #282828 clears the mark by 0.0992, series-2 by 0.1323 and series-1 by
   0.3566, at 14.74:1 on the ground. */
const VALUES: Record<string, string> = {
  '--ct-ground': '#FFFFFF', '--ct-surface': '#FAFAFA', '--ct-well': '#F0F0F0',
  '--ct-rule': '#DDDDDD', '--ct-rule-firm': '#8A8A8A', '--ct-rule-strong': '#000000',
  '--ct-text': '#4A4A4A', '--ct-text-muted': '#666666', '--ct-text-strong': '#2B2B2B',
  '--ct-text-on-field': '#FFFFFF',
  '--ct-ex-axis': '#8A8A8A', '--ct-ex-connector': '#8A8A8A', '--ct-ex-fill': '#666666',
  '--ct-ex-axis-quiet': '#E0E0E0',
  '--ct-ex-fill-quiet': '#DDDDDD', '--ct-ex-label-muted': '#666666',
  '--ct-ex-level-1': '#EEEEEE', '--ct-ex-level-2': '#C0C0C0',
  '--ct-ex-level-3': '#888888', '--ct-ex-level-4': '#404040',
  '--ct-ex-scale-1': '#F2F2F2', '--ct-ex-scale-2': '#CCCCCC', '--ct-ex-scale-3': '#999999',
  '--ct-ex-scale-4': '#666666', '--ct-ex-scale-5': '#333333',
  '--ct-ex-series-1': '#8A8A8A', '--ct-ex-series-2': '#4A4A4A', '--ct-ex-series-3': '#282828',
  '--ct-mark': '#111111', '--ct-mark-soft': '#DDDDDD', '--ct-mark-text': '#FFFFFF',
  '--ct-field': '#222222', '--ct-field-text': '#FFFFFF', '--ct-field-text-muted': '#999999',
};

/* Everything not a colour gets a plausible literal so presence passes; the
   checks that read them only care that they resolve to something. */
function adapterCss(overrides: Record<string, string> = {}): string {
  const values = { ...VALUES, ...overrides };
  const lines = allNames.map((n) => {
    if (values[n] !== undefined) return `  ${n}: ${values[n]};`;
    if (n === '--ct-sep-border') return `  ${n}: none;`;
    if (n === '--ct-sep-shadow') return `  ${n}: 0 1px 2px rgba(0,0,0,.05);`;
    if (n === '--ct-art-direction') return `  ${n}: "a test art direction string";`;
    if (n.startsWith('--ct-font-')) return `  ${n}: Georgia, serif;`;
    if (n.startsWith('--ct-weight-')) return `  ${n}: 400;`;
    if (n.startsWith('--ct-tracking-')) return `  ${n}: 0em;`;
    // The line ladder needs real, ordered values: the catch-all below is
    // 16px, which is over the 6px weight ceiling, so before this branch
    // existed a complete fixture failed three bounded checks. A fixture that
    // cannot pass the checks it exists to exercise tests nothing.
    if (n === '--ct-rule-w-hair') return `  ${n}: 1px;`;
    if (n === '--ct-rule-w-bold') return `  ${n}: 2px;`;
    if (n === '--ct-rule-w-heavy') return `  ${n}: 3px;`;
    if (n === '--ct-radius-panel') return `  ${n}: 0;`;
    // Master furniture. --ct-slide-margin is named explicitly because the
    // waymarker's ticks are checked against it: the catch-all 16px would put
    // the current-section tick outside its own lane and fail a real check on
    // a fixture that is supposed to be well-formed.
    if (n === '--ct-frame-w') return `  ${n}: 1px;`;
    if (n === '--ct-title-rule-w') return `  ${n}: 0;`;
    if (n === '--ct-title-rule-pad') return `  ${n}: 0;`;
    if (n === '--ct-way-tick') return `  ${n}: 10px;`;
    if (n === '--ct-way-tick-here') return `  ${n}: 18px;`;
    if (n === '--ct-slide-margin') return `  ${n}: 32px;`;
    return `  ${n}: 16px;`;
  });
  return `:root {\n${lines.join('\n')}\n}`;
}

const run = (overrides: Record<string, string> = {}, omit: string[] = []) => {
  let css = adapterCss(overrides);
  for (const n of omit) css = css.replace(new RegExp(`\\s*${n}:[^;]*;`), '');
  return checkAdapter({ contract, tokens: resolveTokens([css]) });
};

describe('tokencheck', () => {
  it('passes a complete, well-formed adapter', () => {
    const r = run();
    expect(r.findings, JSON.stringify(r.findings, null, 2)).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('reports every numeric comparison it made, passing ones included', () => {
    const r = run();
    expect(r.measures.length).toBeGreaterThan(20);
    for (const m of r.measures) expect(Number.isFinite(m.value), JSON.stringify(m)).toBe(true);
  });

  it('requires the strong rule and the muted field text', () => {
    for (const n of ['--ct-rule-strong', '--ct-field-text-muted']) {
      const r = run({}, [n]);
      expect(r.ok, `omitting ${n} should fail`).toBe(false);
      expect(r.findings.some((f: any) => f.check === 'presence' && f.token === n)).toBe(true);
    }
  });

  it('fails a missing name', () => {
    const r = run({}, ['--ct-well']);
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'presence' && f.token === '--ct-well')).toBe(true);
  });

  it('fails a colour name that does not resolve to a colour', () => {
    const r = run({ '--ct-mark': 'inherit' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'colour' && f.token === '--ct-mark')).toBe(true);
  });

  it('fails body text that does not clear its floor on one of its grounds', () => {
    // 4.95:1 on the ground and 4.74:1 on the surface, both clearing 4.5, but
    // 4.35:1 in the well. A token is only as good as its worst declared ground,
    // and a check that only looked at the page would pass this.
    const r = run({ '--ct-text-muted': '#707070' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'contrast' && f.token === '--ct-text-muted')).toBe(true);
  });

  it('fails an axis too faint against its ground', () => {
    const r = run({ '--ct-ex-axis': '#E8E8E8' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'contrast' && f.token === '--ct-ex-axis')).toBe(true);
  });

  it('fails a sequential scale that is not monotonic', () => {
    const r = run({ '--ct-ex-scale-3': '#F8F8F8' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'monotonic')).toBe(true);
  });

  it('fails an ordinal scale whose adjacent steps are indistinguishable', () => {
    const r = run({ '--ct-ex-level-2': '#EDEDED' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'monotonic')).toBe(true);
  });

  it('fails two series that are too close to tell apart', () => {
    const r = run({ '--ct-ex-series-2': '#8C8C8C' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'series')).toBe(true);
  });

  it('fails a series that is invisible against the ground', () => {
    const r = run({ '--ct-ex-series-1': '#F4F4F4' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'series')).toBe(true);
  });

  it('fails a mark that does not stand off the default fill', () => {
    const r = run({ '--ct-mark': '#666666' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'mark')).toBe(true);
  });

  it('accepts a chromatic mark and a neutral mark equally', () => {
    // The contract expresses the emphasis job, not the emphasis mechanism.
    //
    // Each case sets its own --ct-text-strong, and that is the point rather
    // than a convenience. The mark must stand off strong type as well as off
    // the fill, and where a system can put strong type depends on where its
    // mark already sits. A chromatic mark at mid-darkness needs strong pushed
    // to near-black to clear it (0.138); a near-black mark needs strong pulled
    // back up the ramp (0.103). Holding both to one strong value would fail
    // whichever mechanism that value happened to crowd, which is precisely the
    // privileging this test exists to catch.
    // --ct-ex-series-3 is overridden here because the mark now has to stand
    // off every series too: the fixture's default series-3 (#282828) sits
    // 0.055 from #253444, under the 0.08 floor, which is not what either case
    // below is testing. #181818 clears #253444 by 0.115 and stays clear of
    // series-1 and series-2 by wide margins, so the mark-vs-fill and
    // mark-vs-strong mechanics stay the only things this test exercises.
    // --ct-ex-level-4 and --ct-ex-scale-5 are overridden for the same reason,
    // now that the mark also has to stand off every scale step: the fixture's
    // defaults (#404040 and #333333) sit 0.063 and 0.035 from #253444, both
    // under the 0.08 floor. #181818 is the same value already used for
    // series-3 above, clears #253444 by 0.115, and keeps both ramps monotonic
    // with every adjacent step still clearing 0.03.
    const chromatic = run({
      '--ct-mark': '#253444', '--ct-mark-soft': '#BFCBD8', '--ct-text-strong': '#131312',
      '--ct-ex-series-3': '#181818', '--ct-ex-level-4': '#181818', '--ct-ex-scale-5': '#181818',
    });
    const neutral = run({
      '--ct-mark': '#131312', '--ct-mark-soft': '#DEDEDD', '--ct-text-strong': '#2B2B2B',
    });
    expect(chromatic.findings.filter((f: any) => f.check === 'mark')).toEqual([]);
    expect(neutral.findings.filter((f: any) => f.check === 'mark')).toEqual([]);
  });

  it('accepts a mark the luminance test would have rejected, because it measures OKLab', () => {
    // The discriminating pair: #253444 against #4A4A48 measures 1.430:1 in
    // WCAG contrast (a luminance test would reject this as indistinguishable)
    // but 0.097 dE in OKLab (the contract's own measure accepts it, clearing
    // the 0.08 floor). This is the whole point of the mark check being built
    // on deltaEOK rather than contrastRatio: swap that measure for contrast,
    // or lower a contrast-based floor below ~2.2, and this fixture goes green
    // for the wrong reason. If this test ever fails after such a change, that
    // is the change to revert, not the fixture to "simplify".
    // --ct-text-strong is set to near-black for the same reason the mechanism
    // test above sets it per case: a chromatic mark at mid-darkness has to
    // stand off strong type too, and the default fixture's strong crowds it.
    // That constraint is real and is not what this test is measuring.
    // --ct-ex-series-3 is overridden for the same reason as the mechanism
    // test above: the fixture's default series-3 (#282828) sits 0.055 from
    // #253444, under the 0.08 floor, which would fail this fixture on a role
    // the discriminating pair above is not about. #181818 clears it.
    // --ct-ex-level-4 and --ct-ex-scale-5 are overridden for the same reason,
    // now that the mark also has to stand off every scale step: the fixture's
    // defaults (#404040 and #333333) sit 0.063 and 0.035 from #253444, both
    // under the 0.08 floor. #181818 clears #253444 by 0.115 and keeps both
    // ramps monotonic with every adjacent step still clearing 0.03.
    const r = run({
      '--ct-mark': '#253444', '--ct-ex-fill': '#4A4A48', '--ct-text-strong': '#131312',
      '--ct-ex-series-3': '#181818', '--ct-ex-level-4': '#181818', '--ct-ex-scale-5': '#181818',
    });
    // --ct-ex-fill also sits in roles.graphicalOn against the ground, so this
    // fixture may legitimately produce a non-mark finding there. Only mark
    // findings are asserted empty.
    expect(r.findings.filter((f: any) => f.check === 'mark')).toEqual([]);
  });

  it('fails a recessive axis that has receded into the ground', () => {
    // A recessive axis may be quiet. It may not be invisible.
    const r = run({ '--ct-ex-axis-quiet': '#FEFEFE' });
    expect(r.ok).toBe(false);
    expect(r.findings.some((f: any) => f.check === 'perceptible' && f.token === '--ct-ex-axis-quiet')).toBe(true);
  });

  /* The brand-expression checks. These are the ones that let a house draw
     the deck in its own hand without letting it change what the deck says.
     Colour was already expressible; weight, and whether a panel has corners,
     were hardcoded in the kit until 2026-08-31, so a rounded house or a
     heavy-ruled house could not be built at all.

     What is checked is not taste. The kit reads hierarchy out of the
     ordering of the three weights, so the ordering is an invariant even
     though every value in it is the brand's. */
  it('rejects a brand that draws an emphatic division lighter than a plain one', () => {
    const r = run({ '--ct-rule-w-bold': '0.5px' });
    const f = r.findings.filter((x: any) => x.check === 'ordered');
    expect(f).toHaveLength(1);
    expect(f[0].token).toBe('--ct-rule-w-bold');
    // The message names both values and which is smaller. It used to say
    // "lighter", which was right for the weight ladder and wrong the moment
    // the same check started comparing tick lengths.
    expect(f[0].message).toMatch(/--ct-rule-w-bold is 0\.5px and --ct-rule-w-hair is 1px/);
  });

  it('accepts a brand that draws every division heavier, as long as the order holds', () => {
    // The point of the split: a house may rule three times as loud as
    // another and still be drawing the same structure.
    const r = run({ '--ct-rule-w-hair': '1px', '--ct-rule-w-bold': '3px', '--ct-rule-w-heavy': '5px' });
    expect(r.findings).toEqual([]);
  });

  it('accepts equal steps, because a house may draw two divisions the same weight', () => {
    // hair <= bold <= heavy, not strictly less: a system that separates its
    // divisions by colour alone is making a choice, not a mistake.
    const r = run({ '--ct-rule-w-hair': '1px', '--ct-rule-w-bold': '1px', '--ct-rule-w-heavy': '1px' });
    expect(r.findings).toEqual([]);
  });

  it('rejects a division too light to survive an export, and one heavy enough to be a shape', () => {
    const thin = run({ '--ct-rule-w-hair': '0.25px' }).findings.filter((x: any) => x.check === 'bounded');
    expect(thin).toHaveLength(1);
    expect(thin[0].message).toMatch(/under the 0\.5px floor/);
    const fat = run({ '--ct-rule-w-heavy': '9px' }).findings.filter((x: any) => x.check === 'bounded');
    expect(fat).toHaveLength(1);
    expect(fat[0].message).toMatch(/over the 6px ceiling/);
  });

  it('rejects a panel radius that turns a zone of the page into a floating card', () => {
    const r = run({ '--ct-radius-panel': '40px' });
    const f = r.findings.filter((x: any) => x.check === 'bounded');
    expect(f).toHaveLength(1);
    expect(f[0].token).toBe('--ct-radius-panel');
  });

  it('accepts a rounded panel inside the cap, which is the whole point of the token', () => {
    expect(run({ '--ct-radius-panel': '8px' }).findings).toEqual([]);
  });

  it('refuses to guess at a length it cannot measure', () => {
    // A calc() or an em would silently compare wrong. These are compared
    // against each other and against floors, so unmeasurable is a finding.
    const r = run({ '--ct-rule-w-bold': 'calc(1px + 2px)' });
    const f = r.findings.filter((x: any) => x.check === 'length');
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/not a plain px length/);
  });

  /* Master furniture: the layer that makes a template recognisable before a
     word of it is read. A brand gets an enumerated vocabulary of values here
     and never a coordinate space, so what needs guarding is not where things
     are but whether the furniture still says what it is for. */
  it('lets a brand carry no frame and no title rule, because absent is a decision', () => {
    expect(run({ '--ct-frame-w': '0', '--ct-title-rule-w': '0' }).findings).toEqual([]);
  });

  it('rejects a rule drawn too faintly to survive an export, which is not the same as absent', () => {
    const r = run({ '--ct-title-rule-w': '0.2px' });
    const f = r.findings.filter((x: any) => x.check === 'bounded');
    expect(f).toHaveLength(1);
    expect(f[0].message).toMatch(/under the 0\.5px floor/);
  });

  it('rejects a waymarker whose current-section tick is shorter than its neighbours', () => {
    // The long tick IS the "you are here". Drawing it short does not restyle
    // the waymarker, it points it at the wrong section.
    const r = run({ '--ct-way-tick': '14px', '--ct-way-tick-here': '8px' });
    const f = r.findings.filter((x: any) => x.check === 'ordered');
    expect(f).toHaveLength(1);
    expect(f[0].token).toBe('--ct-way-tick-here');
  });

  it('rejects a tick drawn outside its own lane, and blames the tick rather than the lane', () => {
    // The cap is the lane's own width rather than a fixed number, so a brand
    // with a wide lane may draw long ticks. Attribution matters: reporting
    // this against --ct-slide-margin would send someone to widen the lane,
    // which was already right.
    const r = run({ '--ct-way-tick-here': '48px', '--ct-slide-margin': '32px' });
    const f = r.findings.filter((x: any) => x.check === 'ordered');
    expect(f).toHaveLength(1);
    expect(f[0].token).toBe('--ct-way-tick-here');
  });

  it('lets a brand with a wide lane draw the long ticks that lane affords', () => {
    expect(run({ '--ct-way-tick': '30px', '--ct-way-tick-here': '48px', '--ct-slide-margin': '64px' }).findings).toEqual([]);
  });

  it('registers every check that can produce a measure in MEASURE_ORDER', () => {
    // The CLI sorts printed measures by MEASURE_ORDER[m.check]. A check name
    // missing from that map yields undefined and puts a NaN into the sort
    // comparator, silently corrupting the printed order. This has already
    // been hand-fixed twice; this test makes the next omission fail here
    // instead of recurring a third time in the CLI's output.
    const r = run();
    const distinctChecks = new Set(r.measures.map((m: any) => m.check));
    expect(distinctChecks.size).toBeGreaterThan(0);
    for (const check of distinctChecks) {
      expect(Object.keys(MEASURE_ORDER), `check "${check}" is missing from MEASURE_ORDER`).toContain(check);
    }
  });

  it('does not hold the recessive axis to the graphical contrast floor', () => {
    // #E0E0E0 is 1.32:1 on the ground. An axis held to 3:1 would fail here;
    // this token is held to perceptibility instead, and clears it at 0.093 dE.
    const r = run();
    expect(r.findings.filter((f: any) => f.token === '--ct-ex-axis-quiet')).toEqual([]);
    const m = r.measures.find((m: any) => m.check === 'perceptible' && m.pair[0] === '--ct-ex-axis-quiet');
    expect(m, 'no perceptible measure was recorded').toBeDefined();
    expect(m.value).toBeGreaterThanOrEqual(m.floor);
  });

  it('fails a mark that is the same colour as a series', () => {
    // The defect this gate exists for. Both real adapters shipped it: Noland's
    // mark and series 1 were both slate-800, and Eleven One's mark and series 3
    // were both --ink, a dE of exactly 0.0000. Nothing compared the two roles,
    // so nothing failed.
    const r = run({ '--ct-ex-series-2': '#111111' });
    expect(r.ok).toBe(false);
    expect(
      r.findings.some((f: any) => f.check === 'mark' && f.token === '--ct-mark'),
      JSON.stringify(r.findings, null, 2),
    ).toBe(true);
  });

  it('fails a mark that is the same colour as a step of a scale', () => {
    // The two defects this widening exists for, both shipped. Noland's mark sat
    // 0.0563 from --ct-ex-scale-5 and Map's marked state 0.0474 from its own top
    // choropleth level. distinctFrom named no scale at all, so nothing compared
    // a mark to a magnitude.
    const r = run({ '--ct-ex-scale-3': '#111111' });
    expect(r.ok).toBe(false);
    const f = r.findings.find(
      (x: any) => x.check === 'mark' && x.message.includes('--ct-ex-scale-3'),
    );
    expect(f, JSON.stringify(r.findings, null, 2)).toBeDefined();
  });

  it('fails a mark that is the same colour as an ordinal level', () => {
    const r = run({ '--ct-ex-level-3': '#111111' });
    expect(r.ok).toBe(false);
    const f = r.findings.find(
      (x: any) => x.check === 'mark' && x.message.includes('--ct-ex-level-3'),
    );
    expect(f, JSON.stringify(r.findings, null, 2)).toBeDefined();
  });

  it('names which series the mark collided with, not just that it collided', () => {
    // Both series failure modes emit check: 'series' and are told apart only by
    // their message, a gap already recorded against this suite. Do not repeat it
    // one role over: a finding that says "the mark is too close to something"
    // cannot be acted on.
    const r = run({ '--ct-ex-series-2': '#111111' });
    // Findings are { check, token, message }; the mark loop's message already
    // interpolates the neighbour, so this passes without touching checks.mjs.
    // It is here to keep it that way. Selected by the neighbour it names, not
    // by position: .find(check === 'mark') alone would grab whichever mark
    // finding sorts first, which is only correct today because this fixture
    // produces exactly one.
    const f = r.findings.find((x: any) => x.check === 'mark' && x.message.includes('--ct-ex-series-2'));
    expect(f, JSON.stringify(r.findings, null, 2)).toBeDefined();
    expect(f!.message).toContain('--ct-ex-series-2');
  });
});
