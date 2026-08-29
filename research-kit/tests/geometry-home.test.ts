import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { axisTop, assertOneMark } from '../lib/exhibits';
import { US_STATES } from '../lib/us-states';
import { NOLAND, announceSkip } from './noland-repo';

/* The site-copy check below can only see whether a stale exhibits.ts or
   us-states.ts survives beneath the noland-advisory checkout, and it needs
   that checkout's path to look. It is resolved rather than remembered — see
   noland-repo.ts, which also explains why this check used to skip on every
   default run without saying so. It skips only when the sibling is genuinely
   not on disk, and it says which and why on the way past. */
const repo = NOLAND.repo;
const skip = !repo;
announceSkip('geometry-home.test.ts', 'the stale-copy check');

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

  it.skipIf(skip)(`has left no copy behind in the site (${NOLAND.why})`, () => {
    expect(existsSync(repo!), `the Noland checkout resolved to "${repo}", which does not exist`).toBe(true);
    expect(existsSync(join(repo!, 'src/lib/exhibits.ts'))).toBe(false);
    expect(existsSync(join(repo!, 'src/lib/us-states.ts'))).toBe(false);
  });
});
