import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const SCRIPTS = [
  'portability', 'slidecheck', 'density', 'audit', 'paint-capture', 'paint-diff',
];

/* The site-copy half of this check can only see whether a stale gate script
   survives beneath the noland-advisory checkout, and it needs that
   checkout's path to look. Set NOLAND_REPO to the noland-advisory repo root
   to run it; without it the check skips, stated as such, rather than
   passing on a path that resolves to nothing. Once NOLAND_REPO is set, the
   directory itself has to exist too, or the path is stale and this must
   fail loudly instead of quietly finding no files to complain about. */
const repo = process.env.NOLAND_REPO;
const skip = !repo;

describe('the gates and the image pipeline live in the kit', () => {
  for (const name of SCRIPTS) {
    it(`${name}.mjs is in the kit`, () => {
      expect(existsSync(`research-kit/scripts/${name}.mjs`)).toBe(true);
    });

    it.skipIf(skip)(`${name}.mjs is not in the site`, () => {
      expect(existsSync(repo!), `NOLAND_REPO is set to "${repo}" but that directory does not exist`).toBe(true);
      expect(existsSync(join(repo!, 'scripts', `${name}.mjs`))).toBe(false);
    });
  }

  it('portability takes the repo it measures as an argument rather than assuming its own parent', () => {
    const text = readFileSync('research-kit/scripts/portability.mjs', 'utf8');
    expect(text).toContain('--repo');
    expect(text).not.toContain("resolve(HERE, '..')");
  });
});
