import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTokens } from '../research-kit/contract/resolve.mjs';
import { checkAdapter } from '../research-kit/contract/checks.mjs';
import { parseHex, neutralSpread } from '../research-kit/contract/color.mjs';

/* The adapter moved beside the ramp it maps: it now lives, along with its
   base, in the noland-advisory repository, not this one. Set NOLAND_REPO to
   that repository's path to run this file at all; without it every describe
   block below skips, structural included, because the file the structural
   checks read is no longer here to read.

   Skipping is only right for the unset case. Once NOLAND_REPO is set, a
   missing file means the path is stale, mistyped, or the other repository
   renamed something out from under this test — every one of those is a
   real failure this file exists to catch, not a reason to quietly skip. */
const repo = process.env.NOLAND_REPO;
const skip = !repo;
const adapterPath = repo ? join(repo, 'src/styles/contract-adapter.css') : undefined;
const basePath = repo ? join(repo, 'src/styles/tokens.css') : undefined;

if (repo) {
  const missing = [adapterPath, basePath].filter((p) => !existsSync(p!));
  if (missing.length) {
    throw new Error(
      `NOLAND_REPO is set to "${repo}" but the following expected file(s) are missing: ` +
        `${missing.join(', ')}. Fix the path or the rename on the other side; this must ` +
        `not silently skip once NOLAND_REPO is set.`,
    );
  }
}

const contract = JSON.parse(readFileSync('research-kit/contract/tokens.contract.json', 'utf8'));
const adapter = skip ? '' : readFileSync(adapterPath!, 'utf8');
const allNames = Object.values(contract.groups).flatMap((g: any) => g.names) as string[];

describe.skipIf(skip)('the Noland Advisory adapter, structurally', () => {
  it('declares every contract name exactly once', () => {
    const decls = [...adapter.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--ct-[\w-]+)\s*:/g)]
      .map((m) => m[1]!);
    expect(new Set(decls).size, 'a name is declared twice').toBe(decls.length);
    for (const n of allNames) expect(decls, `missing ${n}`).toContain(n);
  });

  it('names no value of its own', () => {
    const decls = [...adapter.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--ct-[\w-]+)\s*:\s*([^;}]+)/g)];
    for (const [, name, value] of decls) {
      if (name === '--ct-art-direction') continue;   // a prompt string, by design
      if (name === '--ct-firm-mark') continue;      // the firm's name, by design
      if (name === '--ct-sep-shadow') continue;      // "none", by design
      expect(value, `${name} carries a literal instead of a var()`).toMatch(/var\(--/);
    }
  });

  it('separates by border and not by elevation, without any component branching', () => {
    expect(adapter).toMatch(/--ct-sep-border:\s*1px solid var\(--color-rule\)/);
    expect(adapter).toMatch(/--ct-sep-shadow:\s*none/);
  });

  it('carries an art direction string that is this brand and not the other', () => {
    const m = adapter.match(/--ct-art-direction:\s*"([^"]+)"/);
    expect(m, '--ct-art-direction is not a quoted string').not.toBeNull();
    expect(m![1]!.length).toBeGreaterThan(40);
    expect(m![1]!).toMatch(/desaturated/i);
  });
});

describe.skipIf(skip)('the Noland Advisory adapter, by value', () => {
  it('passes every contract check against the real token layer', () => {
    const tokens = resolveTokens([readFileSync(basePath!, 'utf8'), adapter]);
    const result = checkAdapter({ contract, tokens });
    expect(result.findings, JSON.stringify(result.findings, null, 2)).toEqual([]);
  });

  it('satisfies the mark with hue, where the other system satisfies it with value', () => {
    // "With hue" has to mean something a swap of the two systems' mechanisms
    // would break: the mark itself carries real chroma (channel spread > 4)
    // while the fill it stands off from does not (spread <= 4, genuinely
    // neutral). The plain mark.value >= mark.floor assertion this replaces
    // could not tell that apart from the greyscale system's own value-only
    // pass.
    const tokens = resolveTokens([readFileSync(basePath!, 'utf8'), adapter]);
    const mark = parseHex(tokens.get('--ct-mark')!)!;
    const fill = parseHex(tokens.get('--ct-ex-fill')!)!;
    expect(neutralSpread(mark), '--ct-mark has no hue to spend').toBeGreaterThan(4);
    expect(neutralSpread(fill), '--ct-ex-fill unexpectedly carries hue').toBeLessThanOrEqual(4);
    const { measures } = checkAdapter({ contract, tokens });
    const markFinding = measures.find((m: any) => m.check === 'mark' && m.pair[1] === '--ct-ex-fill')!;
    expect(markFinding.value).toBeGreaterThanOrEqual(markFinding.floor);
  });
});
