import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { axisTop, assertOneMark } from '../lib/exhibits';
import { US_STATES } from '../lib/us-states';

/* The site-copy check below can only see whether a stale exhibits.ts or
   us-states.ts survives beneath the noland-advisory checkout, and it needs
   that checkout's path to look. Set NOLAND_REPO to the noland-advisory repo
   root to run it; without it the check skips, stated as such, rather than
   passing on a path that resolves to nothing. Once NOLAND_REPO is set, the
   directory itself has to exist too, or the path is stale and this must
   fail loudly instead of quietly finding no files to complain about. */
const repo = process.env.NOLAND_REPO;
const skip = !repo;

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

  it.skipIf(skip)('has left no copy behind in the site', () => {
    expect(existsSync(repo!), `NOLAND_REPO is set to "${repo}" but that directory does not exist`).toBe(true);
    expect(existsSync(join(repo!, 'src/lib/exhibits.ts'))).toBe(false);
    expect(existsSync(join(repo!, 'src/lib/us-states.ts'))).toBe(false);
  });
});
