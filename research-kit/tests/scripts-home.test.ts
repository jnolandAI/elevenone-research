import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const SCRIPTS = [
  'portability', 'slidecheck', 'density', 'audit', 'paint-capture', 'paint-diff',
];

describe('the gates and the image pipeline live in the kit', () => {
  for (const name of SCRIPTS) {
    it(`${name}.mjs is in the kit and not in the site`, () => {
      expect(existsSync(`research-kit/scripts/${name}.mjs`)).toBe(true);
      expect(
        existsSync(`C:/Projects/Noland Advisory2/noland-advisory/scripts/${name}.mjs`),
      ).toBe(false);
    });
  }

  it('portability takes the repo it measures as an argument rather than assuming its own parent', () => {
    const text = readFileSync('research-kit/scripts/portability.mjs', 'utf8');
    expect(text).toContain('--repo');
    expect(text).not.toContain("resolve(HERE, '..')");
  });
});
