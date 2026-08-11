import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

// This lives here rather than in tests/mark.test.ts because it renders
// rasters through Playwright. Full --check re-derives all thirteen tracked
// files: the nine text files plus the four PNG icons, the latter rendered
// into a temp directory and byte-compared against what is committed. That
// gives whichever suite asserts it a Playwright dependency, and the e2e
// suite already owns that dependency, so it is the honest home for a check
// that needs a browser. See tests/mark.test.ts for the --no-raster half of
// this same check, the nine text files that verify without one.
test('render_mark --check matches every tracked file, rasters included', () => {
  const all = execFileSync('python', ['scripts/render_mark.py', '--check'], {
    encoding: 'utf8',
  });
  expect(all).toMatch(/mark 1\.1: 13 files match$/m);
});
