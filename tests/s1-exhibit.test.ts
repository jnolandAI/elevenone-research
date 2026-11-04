import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* The site-side half of the exhibit contract for S1, S2, S3 and S5 (scripts/s1_exhibit.py writes the file;
   `npm run s1:check`, `s2:check`, `s3:check` and `s5:check` prove it is what its manifest produces). These checks need no Python: they hold the
   committed exhibit to the manifest and to the claim block's rules. */

// Each engine's claim check words its "Rests on" row differently: S1 gives n, S2 units, S3 respondents, S5 series.
const RESTS_ON: Record<string, RegExp> = { s1: /n = [\d,]+/, s2: /[\d,]+ units/, s3: /[\d,]+ respondents/, s5: /[\d,]+ series/, s6: /[\d,]+ rows/ };
const exhibits = Object.keys(RESTS_ON).flatMap((engine) => {
  const root = join(__dirname, '..', 'exhibits', engine);
  return existsSync(root)
    ? readdirSync(root)
        .filter((d) => existsSync(join(root, d, 'manifest.json')))
        .map((d) => [`${engine}/${d}`, engine, join(root, d)] as const)
    : [];
});

describe.each(exhibits)('exhibit %s', (_label, engine, dir) => {
  const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
  const exhibit = JSON.parse(readFileSync(join(dir, 'exhibit.json'), 'utf8'));

  it('was produced by the run the manifest pins', () => {
    expect(exhibit.engine.name).toBe(engine);
    expect(exhibit.output_hash).toBe(manifest.expected_output_hash);
    expect(exhibit.now).toBe(manifest.now);
    expect(exhibit.engine.method_version).toBe(manifest.spec.model.method_version);
  });

  it('carries every figure the manifest names, with a value, a display and a unit', () => {
    for (const id of manifest.figures) {
      const f = exhibit.figures[id];
      expect(f, id).toBeDefined();
      expect(typeof f.value, id).toBe('number');
      expect(f.display, id).toBeTruthy();
      expect(f.unit, id).toBeTruthy();
    }
  });

  it('has no refused claim, and every claim carries its working', () => {
    expect(exhibit.claims.map((c: { id: string }) => c.id)).toEqual(manifest.claims.map((c: { id: string }) => c.id));
    for (const c of exhibit.claims) {
      expect(c.verdict, c.id).not.toBe('refused');
      expect(c.cites.length, c.id).toBeGreaterThan(0);
      expect(c.rests_on, c.id).toMatch(RESTS_ON[engine]);
      expect(c.assumes.length, c.id).toBeGreaterThan(0);
      expect(['provisional', 'supported', 'firm']).toContain(c.standing_ceiling);
    }
  });
});
