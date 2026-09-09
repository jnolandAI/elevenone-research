import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveTokens } from '../research-kit/contract/resolve.mjs';
import { checkAdapter } from '../research-kit/contract/checks.mjs';
import { parseHex, toOklab } from '../research-kit/contract/color.mjs';
import { NOLAND, announceSkip, assertUsable } from '../research-kit/tests/noland-repo';

/* The adapter moved beside the ramp it maps: it now lives, along with its
   base, in the noland-advisory repository, not this one. That checkout is
   resolved rather than remembered — see research-kit/tests/noland-repo.ts,
   and for why: this file's six tests skipped on every default `npm test` in
   this repo and said nothing about it, because the only thing that set
   NOLAND_REPO was a gate block someone had to remember to paste.

   Skipping is only right when the sibling repo is genuinely not on disk.
   Once it resolves, a missing file means the path is stale, mistyped, or the
   other repository renamed something out from under this test — every one of
   those is a real failure this file exists to catch, not a reason to quietly
   skip. */
const repo = NOLAND.repo;
const skip = !repo;
announceSkip('adapter-noland.test.ts', "the whole file: the adapter it checks is in the other repo");
const adapterPath = repo ? join(repo, 'src/styles/contract-adapter.css') : undefined;
const basePath = repo ? join(repo, 'src/styles/tokens.css') : undefined;
assertUsable([adapterPath, basePath].filter((p): p is string => p !== undefined));

const contract = JSON.parse(readFileSync('research-kit/contract/tokens.contract.json', 'utf8'));
const adapter = skip ? '' : readFileSync(adapterPath!, 'utf8');
const allNames = Object.values(contract.groups)
  .filter((g: any) => !g.optional)
  .flatMap((g: any) => g.names) as string[];

describe.skipIf(skip)('the Noland Advisory adapter, structurally', () => {
  it('declares every contract name exactly once', () => {
    const decls = [...adapter.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--ct-[\w-]+)\s*:/g)]
      .map((m) => m[1]!);
    expect(new Set(decls).size, 'a name is declared twice').toBe(decls.length);
    // Optional groups are exempt: an adapter may decline one entirely, and
    // checks.mjs fails it separately if it declares only part of one.
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
    // would break: the mark itself carries real chroma while the fill it
    // stands off from does not. The plain mark.value >= mark.floor assertion
    // this replaces could not tell that apart from the greyscale system's own
    // value-only pass.
    //
    // Measured as OKLab chroma rather than as 8-bit channel spread. Spread was
    // a fair proxy while that system's greys sat at chroma 0.003; in September
    // 2026 it cooled its spine to hue 250 at chroma 0.011 and spread began
    // reporting 11 for a grey that is a cast rather than a colour, failing this
    // test for a change it was never meant to catch. The bands below keep the
    // original intent and restore the headroom: the mark measures 0.041 and the
    // fill 0.011, still near four to one.
    const chroma = (hex: string) => {
      const { a, b } = toOklab(parseHex(hex)!);
      return Math.hypot(a, b);
    };
    const tokens = resolveTokens([readFileSync(basePath!, 'utf8'), adapter]);
    expect(chroma(tokens.get('--ct-mark')!), '--ct-mark has no hue to spend').toBeGreaterThan(0.025);
    expect(chroma(tokens.get('--ct-ex-fill')!), '--ct-ex-fill unexpectedly carries hue')
      .toBeLessThanOrEqual(0.02);
    const { measures } = checkAdapter({ contract, tokens });
    const markFinding = measures.find((m: any) => m.check === 'mark' && m.pair[1] === '--ct-ex-fill')!;
    expect(markFinding.value).toBeGreaterThanOrEqual(markFinding.floor);
  });
});
