import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/* The site-side half of the S1 exhibit contract (scripts/s1_exhibit.py writes the file; `npm run
   s1:check` proves it is what its manifest produces). These checks need no Python: they hold the
   committed exhibit to the manifest and to the claim block's rules. */

const ROOT = join(__dirname, '..', 'exhibits', 's1');
const exhibits = existsSync(ROOT) ? readdirSync(ROOT).filter((d) => existsSync(join(ROOT, d, 'manifest.json'))) : [];

describe.each(exhibits)('S1 exhibit %s', (name) => {
  const manifest = JSON.parse(readFileSync(join(ROOT, name, 'manifest.json'), 'utf8'));
  const exhibit = JSON.parse(readFileSync(join(ROOT, name, 'exhibit.json'), 'utf8'));

  it('was produced by the run the manifest pins', () => {
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
      expect(c.rests_on, c.id).toMatch(/n = [\d,]+/);
      expect(c.assumes.length, c.id).toBeGreaterThan(0);
      expect(['provisional', 'supported', 'firm']).toContain(c.standing_ceiling);
    }
  });
});
