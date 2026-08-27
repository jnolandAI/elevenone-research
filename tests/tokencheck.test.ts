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
  '--ct-rule': '#DDDDDD', '--ct-rule-firm': '#8A8A8A',
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
  '--ct-field': '#222222', '--ct-field-text': '#FFFFFF',
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
    const chromatic = run({
      '--ct-mark': '#253444', '--ct-mark-soft': '#BFCBD8', '--ct-text-strong': '#131312',
      '--ct-ex-series-3': '#181818',
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
    const r = run({
      '--ct-mark': '#253444', '--ct-ex-fill': '#4A4A48', '--ct-text-strong': '#131312',
      '--ct-ex-series-3': '#181818',
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

  it('names which series the mark collided with, not just that it collided', () => {
    // Both series failure modes emit check: 'series' and are told apart only by
    // their message, a gap already recorded against this suite. Do not repeat it
    // one role over: a finding that says "the mark is too close to something"
    // cannot be acted on.
    const r = run({ '--ct-ex-series-2': '#111111' });
    // Findings are { check, token, message }; the mark loop's message already
    // interpolates the neighbour, so this passes without touching checks.mjs.
    // It is here to keep it that way.
    const f = r.findings.find((x: any) => x.check === 'mark')!;
    expect(f.message).toContain('--ct-ex-series-2');
  });
});
