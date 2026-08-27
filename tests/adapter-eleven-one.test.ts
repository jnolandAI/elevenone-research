import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolveTokens } from '../research-kit/contract/resolve.mjs';
import { checkAdapter } from '../research-kit/contract/checks.mjs';
import { parseHex, neutralSpread } from '../research-kit/contract/color.mjs';

const contract = JSON.parse(readFileSync('research-kit/contract/tokens.contract.json', 'utf8'));
const base = readFileSync('src/styles/tokens.css', 'utf8');
const adapter = readFileSync('research-kit/adapters/eleven-one.css', 'utf8');
const tokens = resolveTokens([base, adapter]);
const result = checkAdapter({ contract, tokens });

describe('the Eleven One Research adapter', () => {
  it('passes every contract check', () => {
    expect(result.findings, JSON.stringify(result.findings, null, 2)).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it('names no value of its own: every mapping is a var into the system', () => {
    const decls = [...adapter.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--ct-[\w-]+)\s*:\s*([^;}]+)/g)];
    expect(decls.length).toBeGreaterThan(0);
    for (const [, name, value] of decls) {
      if (name === '--ct-art-direction') continue;       // a prompt string, by design
      if (name === '--ct-sep-border') continue;          // "none", by design
      expect(value, `${name} carries a literal value instead of a var()`).toMatch(/var\(--/);
    }
  });

  it('introduces no hue, which is the rule its own token test enforces', () => {
    for (const name of contract.roles.colourNames) {
      const c = parseHex(tokens.get(name)!);
      expect(c, `${name} did not resolve to a colour`).not.toBeNull();
      expect(neutralSpread(c!), `${name} resolves to ${tokens.get(name)}, which carries hue`)
        .toBeLessThanOrEqual(4);
    }
  });

  it('satisfies the mark by value, having no hue to spend on it', () => {
    const mark = result.measures.find((m: any) => m.check === 'mark')!;
    expect(mark.value).toBeGreaterThanOrEqual(mark.floor);
  });

  it('separates by elevation and not by border, without any component branching', () => {
    expect(tokens.get('--ct-sep-border')).toBe('none');
    expect(tokens.get('--ct-sep-shadow')).not.toBe('none');
    expect(tokens.get('--ct-sep-shadow')!.length).toBeGreaterThan(4);
  });

  it('aliases display and body to the one family and mono to the mono stack', () => {
    expect(tokens.get('--ct-font-display')).toBe(tokens.get('--ct-font-body'));
    expect(tokens.get('--ct-font-mono')).toMatch(/Martian Mono/);
  });

  it('carries an art direction string that is this brand and not the other', () => {
    const art = tokens.get('--ct-art-direction')!;
    expect(art.length).toBeGreaterThan(40);
    expect(art).toMatch(/saturated/i);
  });
});
