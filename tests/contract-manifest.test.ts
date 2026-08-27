import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const raw = readFileSync('research-kit/contract/tokens.contract.json', 'utf8');
const contract = JSON.parse(raw);
const allNames = Object.values(contract.groups).flatMap((g: any) => g.names) as string[];

describe('token contract', () => {
  it('declares every name with the --ct- prefix and no duplicates', () => {
    expect(allNames.length).toBeGreaterThan(0);
    for (const n of allNames) expect(n, n).toMatch(/^--ct-[a-z0-9-]+$/);
    expect(new Set(allNames).size, 'duplicate name in the contract').toBe(allNames.length);
  });

  it('names no value, ramp step or brand', () => {
    expect(raw).not.toMatch(/#[0-9A-Fa-f]{3,8}\b/);
    expect(raw.toLowerCase()).not.toMatch(/noland|eleven|slate|literata|familjen|martian|grey-\d|--g\d/);
  });

  it('carries the six colour groups the spec declares', () => {
    for (const g of ['surface', 'text', 'exhibit', 'scales', 'mark', 'field']) {
      expect(contract.groups[g], `group ${g}`).toBeDefined();
      expect(contract.groups[g].description.length, `group ${g} description`).toBeGreaterThan(10);
    }
  });

  it('carries the separation pair, because CSS cannot branch on a value', () => {
    expect(allNames).toContain('--ct-sep-border');
    expect(allNames).toContain('--ct-sep-shadow');
  });

  it('declares three series, though only two are consumed today', () => {
    expect(contract.roles.series).toEqual(['--ct-ex-series-1', '--ct-ex-series-2', '--ct-ex-series-3']);
  });

  it('keeps the ordinal and sequential scales at the lengths the refactor needs', () => {
    expect(contract.roles.ordinal).toHaveLength(4);
    expect(contract.roles.sequential).toHaveLength(5);
  });

  it('every name a role references is a declared name', () => {
    const referenced: string[] = [
      ...contract.roles.ordinal,
      ...contract.roles.sequential,
      ...contract.roles.series,
      ...contract.roles.colourNames,
      contract.roles.mark.token,
      ...contract.roles.mark.distinctFrom,
      ...Object.keys(contract.roles.textOn),
      ...(Object.values(contract.roles.textOn).flat() as string[]),
      ...contract.roles.graphicalOn.map((r: any) => r.token),
      ...contract.roles.graphicalOn.map((r: any) => r.ground),
      ...contract.roles.perceptibleOn.map((r: any) => r.token),
      ...contract.roles.perceptibleOn.map((r: any) => r.ground),
    ];
    for (const n of referenced) expect(allNames, `role references undeclared ${n}`).toContain(n);
  });

  it('every colour-role reference is also in roles.colourNames, not just a declared name', () => {
    // Every comparison in checks.mjs is guarded by have(...), which returns
    // false both when a token is unparseable (reported as a finding) and when
    // it was never parsed because it is absent from roles.colourNames
    // (silently skipped, no finding at all). Being a declared name (checked
    // above) is not the same thing: a role could reference a real, declared
    // token that just never made it into colourNames, and the check for it
    // would quietly do nothing. This asserts the stronger property.
    const colourReferenced: string[] = [
      ...Object.keys(contract.roles.textOn),
      ...(Object.values(contract.roles.textOn).flat() as string[]),
      ...contract.roles.graphicalOn.map((r: any) => r.token),
      ...contract.roles.graphicalOn.map((r: any) => r.ground),
      ...contract.roles.perceptibleOn.map((r: any) => r.token),
      ...contract.roles.perceptibleOn.map((r: any) => r.ground),
      ...contract.roles.ordinal,
      ...contract.roles.sequential,
      ...contract.roles.series,
      contract.roles.mark.token,
      ...contract.roles.mark.distinctFrom,
    ];
    for (const n of colourReferenced) {
      expect(contract.roles.colourNames, `${n} is a colour role but not in colourNames`).toContain(n);
    }
  });

  it('pins all fifteen neighbours the mark must stand off', () => {
    // A mark has to stand off the fill it sits among, the field it sits on,
    // strong type, and every categorical series. Strong type was added after
    // a greyscale adapter was found resolving --ct-mark and --ct-text-strong
    // to the same ink, which made emphasis on type invisible while every
    // check passed. The three series were added after both real adapters
    // were found resolving --ct-mark to the same colour as one of their own
    // series: Noland's mark and series 1 were both slate-800, Eleven One's
    // mark and series 3 were both --ink, a dE of exactly 0.0000, and nothing
    // compared the two roles. The four ordinal levels and five sequential
    // steps were added after the same defect shipped one role over: Noland's
    // mark sat 0.0563 from --ct-ex-scale-5 and Map's marked state sat 0.0474
    // from its own top choropleth level. A mark says this value differs from
    // its neighbours; a scale says this value is larger than its neighbours;
    // nothing had compared a mark to a magnitude. Deleting an entry from this
    // list would leave the suite green without it, so the list is pinned
    // rather than merely iterated.
    expect(contract.roles.mark.distinctFrom).toEqual([
      '--ct-ex-fill', '--ct-mark-soft', '--ct-text-strong',
      '--ct-ex-series-1', '--ct-ex-series-2', '--ct-ex-series-3',
      '--ct-ex-level-1', '--ct-ex-level-2', '--ct-ex-level-3', '--ct-ex-level-4',
      '--ct-ex-scale-1', '--ct-ex-scale-2', '--ct-ex-scale-3', '--ct-ex-scale-4', '--ct-ex-scale-5',
    ]);
  });

  it('roles.mark.distinctFrom covers every ordinal, sequential and series name, not just the ones pinned above', () => {
    // The test above pins distinctFrom to an exact, hand-enumerated list. A
    // hand-enumerated list only proves nothing already in it was deleted; it
    // cannot catch a name that should have been added and never was. That is
    // how this defect reached a second round: roles.mark.distinctFrom named
    // no scale at all until this pass, and the suite stayed green the whole
    // time because nothing compared the enumerated list to the roles it was
    // supposed to cover. This test derives the required set from
    // roles.ordinal, roles.sequential and roles.series themselves, so a
    // fifth series or a sixth scale step added to those roles without a
    // matching edit to distinctFrom fails here even if the pinned-list test
    // above is updated to match the omission.
    const categorical = new Set<string>([
      ...contract.roles.ordinal,
      ...contract.roles.sequential,
      ...contract.roles.series,
    ]);
    const distinctFrom = new Set(contract.roles.mark.distinctFrom as string[]);
    for (const n of categorical) {
      expect(distinctFrom, `mark.distinctFrom is missing ${n}`).toContain(n);
    }
  });

  it('declares every threshold the validator reads, each with a stated reason', () => {
    for (const k of ['bodyContrast', 'graphicalContrast',
                     'seriesDeltaEOK', 'markDeltaEOK', 'scaleStepDeltaL',
                     'recessiveDeltaEOK']) {
      expect(contract.thresholds[k], `threshold ${k}`).toBeDefined();
      expect(typeof contract.thresholds[k].value, `threshold ${k}.value`).toBe('number');
      expect(contract.thresholds[k].why.length, `threshold ${k}.why`).toBeGreaterThan(20);
    }
  });

  it('pins every threshold to its exact current value', () => {
    // A floor that can drift silently is not a contract. The tests above only
    // check that each threshold is defined and numeric, so changing
    // recessiveDeltaEOK from 0.03 to 0.005, or graphicalContrast from 3.0 to
    // 1.5, would leave every other test in this suite green. This test is the
    // one place that has to change, deliberately, before any threshold does.
    expect(contract.thresholds.bodyContrast.value).toBe(4.5);
    expect(contract.thresholds.graphicalContrast.value).toBe(3.0);
    expect(contract.thresholds.recessiveDeltaEOK.value).toBe(0.03);
    expect(contract.thresholds.seriesDeltaEOK.value).toBe(0.08);
    expect(contract.thresholds.markDeltaEOK.value).toBe(0.08);
    expect(contract.thresholds.scaleStepDeltaL.value).toBe(0.03);
  });

  it('holds the recessive axis to perceptibility rather than to the graphical floor', () => {
    // The two axis tokens exist because a baseline rule under a bar chart is
    // doing a different job from an axis you have to find. The contract would
    // be lying if the quiet one were simply exempt, so it carries its own
    // check against its own ground with its own measure.
    const quiet = '--ct-ex-axis-quiet';
    expect(allNames, `${quiet} is not declared`).toContain(quiet);
    expect(contract.roles.graphicalOn.map((r: any) => r.token))
      .not.toContain(quiet);
    expect(contract.roles.perceptibleOn.map((r: any) => r.token))
      .toContain(quiet);
    expect(contract.roles.graphicalOn.map((r: any) => r.token))
      .toContain('--ct-ex-axis');
  });
});
