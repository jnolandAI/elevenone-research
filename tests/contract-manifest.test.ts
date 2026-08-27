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

  it('declares every threshold the validator reads, each with a stated reason', () => {
    for (const k of ['bodyContrast', 'graphicalContrast',
                     'seriesDeltaEOK', 'markDeltaEOK', 'scaleStepDeltaL']) {
      expect(contract.thresholds[k], `threshold ${k}`).toBeDefined();
      expect(typeof contract.thresholds[k].value, `threshold ${k}.value`).toBe('number');
      expect(contract.thresholds[k].why.length, `threshold ${k}.why`).toBeGreaterThan(20);
    }
  });
});
