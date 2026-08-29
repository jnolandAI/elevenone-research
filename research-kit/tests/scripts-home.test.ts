import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NOLAND, announceSkip } from './noland-repo';

const SCRIPTS = [
  'portability', 'slidecheck', 'density', 'audit', 'paint-capture', 'paint-diff',
  'generate-art', 'artcheck',
];

/* The site-copy half of this check can only see whether a stale gate script
   survives beneath the noland-advisory checkout, and it needs that checkout's
   path to look. It is resolved rather than remembered — see noland-repo.ts,
   which also explains why this half used to skip on every default run without
   saying so. It skips only when the sibling is genuinely not on disk, and it
   says which and why on the way past. */
const repo = NOLAND.repo;
const skip = !repo;
announceSkip('scripts-home.test.ts', 'the stale-copy half of every script check');

describe('the gates and the image pipeline live in the kit', () => {
  for (const name of SCRIPTS) {
    it(`${name}.mjs is in the kit`, () => {
      expect(existsSync(`research-kit/scripts/${name}.mjs`)).toBe(true);
    });

    it.skipIf(skip)(`${name}.mjs is not in the site (${NOLAND.why})`, () => {
      expect(existsSync(repo!), `the Noland checkout resolved to "${repo}", which does not exist`).toBe(true);
      expect(existsSync(join(repo!, 'scripts', `${name}.mjs`))).toBe(false);
    });
  }

  it('portability takes the repo it measures as an argument rather than assuming its own parent', () => {
    const text = readFileSync('research-kit/scripts/portability.mjs', 'utf8');
    expect(text).toContain('--repo');
    expect(text).not.toContain("resolve(HERE, '..')");
  });
});
