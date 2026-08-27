import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolveTokens } from '../research-kit/contract/resolve.mjs';
import { checkAdapter } from '../research-kit/contract/checks.mjs';
import { parseHex, neutralSpread } from '../research-kit/contract/color.mjs';

const contract = JSON.parse(readFileSync('research-kit/contract/tokens.contract.json', 'utf8'));
const adapter = readFileSync('research-kit/adapters/noland.css', 'utf8');
const allNames = Object.values(contract.groups).flatMap((g: any) => g.names) as string[];

/* The base lives in another repository. Set NOLAND_TOKENS to its tokens.css to
   run the value checks; without it only the structural ones run, and the suite
   says so rather than passing quietly. */
const basePath = process.env.NOLAND_TOKENS;

describe('the Noland Advisory adapter, structurally', () => {
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

describe.skipIf(!basePath || !existsSync(basePath))('the Noland Advisory adapter, by value', () => {
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
