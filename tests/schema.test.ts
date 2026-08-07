import { describe, it, expect } from 'vitest';
import { briefSchema } from '../src/content.config';

const claim = (over: Record<string, unknown> = {}) => ({
  id: 'A',
  standing: 'firm',
  text: 'Half the universe spans 23.1% to 59.7%.',
  qualifier: 'n=2,186',
  restsOn: 'SEC XBRL frames, us-gaap Revenues and GrossProfit, CY2024 annual.',
  assumes: 'As-reported gross profit is comparable across filers.',
  breaksIf: 'The 221 excluded filers are not random with respect to margin.',
  note: null,
  ...over,
});

// Every negative fixture below must fail for the ONE constraint it names.
// A fixture that is also malformed some other way certifies a rule that may
// not actually be enforced: with a 1-character conclusion, the .strict() test
// below stays green even if .strict() is deleted, because the conclusion
// length fails on its own. These two constants keep the incidental fields
// valid so each test isolates its own target.
const CONCLUSION = 'A peer median summarises a mixture.';
const OFFPATH_TEXT = 'Held, and deliberately left out of the argument because it is untested.';

const brief = (over: Record<string, unknown> = {}) => ({
  number: '001',
  title: 'Reported gross margin is not one distribution',
  subtitle: 'The peer median sits between two of them',
  kind: 'Cross-sector financial analysis',
  standfirst: 'We pulled every SEC registrant that reported both revenue and gross profit.',
  published: null,
  dataset: '/assets/data/margin-cy2024.json',
  axisKey: 'The halftone is the density of the universe.',
  claims: [claim({ id: 'A' }), claim({ id: 'B' }), claim({ id: 'C' })],
  loadPath: {
    conclusion: 'A peer median summarises a mixture.',
    members: ['A', 'B', 'C'],
    offPath: null,
  },
  method: {
    sourcing: 'Everything in this brief comes from one free, public source.',
    source: 'SEC XBRL frames API.',
    universe: 'Every registrant in both frames.',
    computation: 'GrossProfit divided by Revenues, as reported.',
    notDone: 'No sector control.',
    data: 'Published alongside this brief.',
  },
  ...over,
});

describe('the working, enforced by the schema', () => {
  it('accepts a well-formed brief', () => {
    expect(briefSchema.safeParse(brief()).success).toBe(true);
  });

  // rule 4: breaks if is never blank and never softened
  it('rejects a blank falsifier', () => {
    const bad = brief({ claims: [claim({ breaksIf: '' }), claim({ id: 'B' }), claim({ id: 'C' })] });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a falsifier too short to name anything', () => {
    const bad = brief({ claims: [claim({ breaksIf: 'maybe' }), claim({ id: 'B' }), claim({ id: 'C' })] });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  // rule 7: greyscale absolutely, no fourth standing and no chip
  it('rejects a standing outside the three', () => {
    const bad = brief({ claims: [claim({ standing: 'strong' }), claim({ id: 'B' }), claim({ id: 'C' })] });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  // rule 1: three to six blocks. Fewer has no argument, more has no focus.
  it('rejects two claims', () => {
    expect(briefSchema.safeParse(brief({
      claims: [claim({ id: 'A' }), claim({ id: 'B' })],
      loadPath: { conclusion: CONCLUSION, members: ['A', 'B'], offPath: null },
    })).success).toBe(false);
  });

  it('rejects seven claims', () => {
    const seven = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((id) => claim({ id }));
    expect(briefSchema.safeParse(brief({ claims: seven })).success).toBe(false);
  });

  it('rejects duplicate claim ids', () => {
    // The default brief()'s loadPath.members is ['A', 'B', 'C']. With this
    // fixture's claims ids A, A, C, that default leaves no claim B at all, so
    // the separate "load path member does not resolve" issue also fires and
    // the fixture fails validation regardless of whether the duplicate-id
    // check itself is present: deleting content.config.ts:80-84 left this
    // test green. Narrowing loadPath.members to ids the fixture actually has
    // isolates the duplicate check as the only possible source of failure.
    const dup = [claim({ id: 'A' }), claim({ id: 'A' }), claim({ id: 'C' })];
    const bad = brief({
      claims: dup,
      loadPath: { conclusion: CONCLUSION, members: ['A', 'C'], offPath: null },
    });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  // the load path can only be built from claims that exist
  it('rejects a load path member that resolves to nothing', () => {
    const bad = brief({ loadPath: { conclusion: CONCLUSION, members: ['A', 'Z'], offPath: null } });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects an off-path claim that resolves to nothing', () => {
    const bad = brief({ loadPath: { conclusion: CONCLUSION, members: ['A'], offPath: { id: 'Z', text: OFFPATH_TEXT } } });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  it('rejects a claim that is both on the load path and off it', () => {
    const bad = brief({ loadPath: { conclusion: CONCLUSION, members: ['A', 'B'], offPath: { id: 'B', text: OFFPATH_TEXT } } });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  // rule 3 is not authorable: the cap is derived, so there is nowhere to assert it
  it('rejects an authored conclusion standing', () => {
    const bad = brief({ loadPath: { conclusion: CONCLUSION, members: ['A'], offPath: null, standing: 'firm' } });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });

  it('requires an empty load path to be impossible', () => {
    const bad = brief({ loadPath: { conclusion: CONCLUSION, members: [], offPath: null } });
    expect(briefSchema.safeParse(bad).success).toBe(false);
  });
});
