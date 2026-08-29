import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
// @ts-expect-error - .mjs loader, no types
import { loadProfile, profileNames, takeProfile } from '../profiles/load.mjs';

/**
 * The profiles exist because audit.mjs and density.mjs carried one document
 * shape's constants inline and applied them to every shape. These tests pin
 * two things a comment cannot: that the deliverable profile still carries the
 * exact numbers the scripts had before profiles existed, so an existing deck's
 * calibration did not move on the day this mechanism appeared, and that the
 * research profiles carry the census numbers rather than a copy of them.
 */

const NAMES = ['brief', 'deliverable', 'report'];

describe('the profile set', () => {
  it('is exactly the three shapes the system produces', () => {
    expect(profileNames()).toEqual(NAMES);
  });

  for (const name of NAMES) {
    it(`${name} declares every field the gates read`, () => {
      const p = loadProfile(name);
      expect(p.name).toBe(name);
      expect(p.shape.length).toBeGreaterThan(10);
      expect(p.template.length).toBeGreaterThan(10);
      expect(typeof p.title.medianWords).toBe('number');
      expect(typeof p.title.numberShare).toBe('number');
      expect(typeof p.title.numberShareFloor).toBe('number');
      expect(typeof p.density.medianWords).toBe('number');
      expect(typeof p.density.thinWords).toBe('number');
      expect(typeof p.density.thinShare).toBe('number');
      expect(typeof p.forms.tableShareCeiling).toBe('number');
      expect(p.measuredFrom.length).toBeGreaterThan(20);
    });

    it(`${name} sets its number-share floor below its median share`, () => {
      // A median is the middle of a distribution. Scoring every piece against
      // it fails half of a well-calibrated corpus by construction, so the
      // floor that actually warns has to sit under it.
      const p = loadProfile(name);
      expect(p.title.numberShareFloor).toBeLessThan(p.title.numberShare);
    });
  }
});

describe('the deliverable profile carries the ten-deck corpus calibration', () => {
  // Re-baselined 2026-08-29, by decision. The original constants were
  // preserved from one 167-page reference deck so that adding the profile
  // mechanism and moving the calibration could not happen in the same
  // change; once the mechanism had held stable, the corpus (ten client
  // decks, 682 working pages) replaced the single deck. Measured before
  // moved: under both calibrations every current verdict is identical, so
  // this changed what the baselines claim, not what any gate says. The
  // floor keeps its old distance, nine points under the share, which also
  // matches the report profile's floor exactly.
  const p = loadProfile('deliverable');

  it('carries the corpus title constants', () => {
    expect(p.title.medianWords).toBe(11);
    expect(p.title.numberShare).toBe(0.44);
    expect(p.title.numberShareFloor).toBe(0.35);
  });

  it('carries the corpus density median and the unchanged thin threshold', () => {
    expect(p.density.medianWords).toBe(162);
    expect(p.density.thinWords).toBe(120);
  });

  it('allows no thin page, which is what the script did before', () => {
    expect(p.density.thinShare).toBe(0);
  });

  it('sets no page budget, because no budget fits both 167 and 81 pages', () => {
    expect(p.pages).toBeNull();
  });

  it('keeps the table ceiling every profile shares', () => {
    expect(p.forms.tableShareCeiling).toBe(0.34);
  });
});

describe('the research profiles carry the census numbers, not the deliverable ones', () => {
  for (const name of ['brief', 'report']) {
    const p = loadProfile(name);

    it(`${name} takes its title constants from the published population`, () => {
      expect(p.title.medianWords).toBe(8);
      expect(p.title.numberShare).toBe(0.48);
    });

    it(`${name} takes its density constants from the published population`, () => {
      expect(p.density.medianWords).toBe(141);
      expect(p.density.thinShare).toBe(0.41);
    });

    it(`${name} asks for a shorter title than the deliverable profile`, () => {
      // The corpus finding that motivated the whole mechanism: published
      // research titles are three words shorter at the median than client
      // ones, so applying deliverable constants asks for a longer title.
      expect(p.title.medianWords).toBeLessThan(loadProfile('deliverable').title.medianWords);
    });

    it(`${name} asks for a thinner page than the deliverable profile`, () => {
      expect(p.density.medianWords).toBeLessThan(loadProfile('deliverable').density.medianWords);
    });
  }

  it('gives the two research shapes different page budgets and nothing else', () => {
    const brief = loadProfile('brief');
    const report = loadProfile('report');
    expect(brief.pages).toEqual({ min: 12, max: 20 });
    expect(report.pages).toEqual({ min: 30, max: 60 });
    expect(report.title).toEqual(brief.title);
    expect(report.density).toEqual(brief.density);
  });
});

describe('the loader refuses to guess', () => {
  it('throws with no name rather than defaulting to a shape', () => {
    expect(() => loadProfile(null)).toThrow(/profile is required/);
  });

  it('names the available profiles when given one that does not exist', () => {
    expect(() => loadProfile('market-study')).toThrow(/brief, deliverable, report/);
  });

  it('takes --profile out of an argv slice and leaves the rest', () => {
    const { profile, rest } = takeProfile(['--profile', 'brief', 'src/pages', '--all']);
    expect(profile.name).toBe('brief');
    expect(rest).toEqual(['src/pages', '--all']);
  });

  it('rejects --profile with no value', () => {
    expect(() => takeProfile(['--profile', '--all'])).toThrow(/needs a value/);
  });
});

describe('no gate carries a calibration constant of its own any more', () => {
  // The defect this replaces was a number living in a script where nobody
  // reading a report could see which document shape it came from.
  for (const script of ['audit', 'density']) {
    it(`${script}.mjs reads its constants from the profile`, () => {
      const src = readFileSync(`research-kit/scripts/${script}.mjs`, 'utf8');
      expect(src).toContain("from '../profiles/load.mjs'");
      // The literals that used to be inline, in the assignment form they had.
      expect(src).not.toMatch(/^const TITLE_MEDIAN = 19;$/m);
      expect(src).not.toMatch(/^const NUMBER_SHARE = 0\.74;$/m);
      expect(src).not.toMatch(/^const THIN = 120;$/m);
    });
  }
});
