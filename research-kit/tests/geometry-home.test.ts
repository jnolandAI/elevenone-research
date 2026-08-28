import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { axisTop, assertOneMark } from '../lib/exhibits';
import { US_STATES } from '../lib/us-states';

describe('geometry lives in the kit', () => {
  it('exports the layout helpers from the kit tree', () => {
    // 93 with the function's 8% headroom is 100.44, which rounds up to the
    // next half-decade step: 105. Not 100. The number is the point of the
    // assertion, so it is stated here rather than left to look like a typo.
    expect(axisTop(93)).toBe(105);
    expect(typeof assertOneMark).toBe('function');
  });

  it('carries the state data Map.astro needs', () => {
    expect(Object.keys(US_STATES).length).toBeGreaterThan(0);
  });

  it('has left no copy behind in the site', () => {
    expect(existsSync('C:/Projects/Noland Advisory2/noland-advisory/src/lib/exhibits.ts')).toBe(false);
    expect(existsSync('C:/Projects/Noland Advisory2/noland-advisory/src/lib/us-states.ts')).toBe(false);
  });
});
