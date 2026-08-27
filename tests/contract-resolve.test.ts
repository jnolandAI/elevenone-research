import { describe, it, expect } from 'vitest';
import { collectDeclarations, resolveTokens } from '../research-kit/contract/resolve.mjs';

describe('collectDeclarations', () => {
  it('reads custom properties out of a :root block', () => {
    const d = collectDeclarations(':root { --a: #FFFFFF; --b: 12px; }');
    expect(d.get('--a')).toBe('#FFFFFF');
    expect(d.get('--b')).toBe('12px');
  });

  it('ignores anything inside a comment', () => {
    const d = collectDeclarations(':root { /* --a: #000000; */ --a: #FFFFFF; }');
    expect(d.get('--a')).toBe('#FFFFFF');
  });

  it('keeps a value that contains commas and parentheses intact', () => {
    const d = collectDeclarations(":root { --e1: 0 1px 2px rgba(20,20,18,.05), 0 2px 8px rgba(20,20,18,.035); }");
    expect(d.get('--e1')).toBe('0 1px 2px rgba(20,20,18,.05), 0 2px 8px rgba(20,20,18,.035)');
  });

  it('lets a later declaration of the same name win', () => {
    const d = collectDeclarations(':root { --a: #111111; } :root { --a: #222222; }');
    expect(d.get('--a')).toBe('#222222');
  });

  it('ignores ordinary properties', () => {
    const d = collectDeclarations(':root { color: #FFFFFF; --a: #000000; }');
    expect(d.has('color')).toBe(false);
    expect(d.get('--a')).toBe('#000000');
  });
});

describe('resolveTokens', () => {
  const BASE = ':root { --g80: #4A4A48; --rule: var(--g30); --g30: #DEDEDD; }';

  it('resolves an adapter alias through to the base value', () => {
    const t = resolveTokens([BASE, ':root { --ct-text: var(--g80); }']);
    expect(t.get('--ct-text')).toBe('#4A4A48');
  });

  it('resolves a chain of aliases', () => {
    const t = resolveTokens([BASE, ':root { --ct-rule: var(--rule); }']);
    expect(t.get('--ct-rule')).toBe('#DEDEDD');
  });

  it('gives the adapter precedence over the base', () => {
    const t = resolveTokens([':root { --x: #111111; }', ':root { --x: #222222; }']);
    expect(t.get('--x')).toBe('#222222');
  });

  it('uses a fallback when the referenced name is undeclared', () => {
    const t = resolveTokens([':root { --ct-mono: var(--font-mono, monospace); }']);
    expect(t.get('--ct-mono')).toBe('monospace');
  });

  it('prefers the declared value over the fallback', () => {
    const t = resolveTokens([':root { --font-mono: Courier; --ct-mono: var(--font-mono, monospace); }']);
    expect(t.get('--ct-mono')).toBe('Courier');
  });

  it('resolves a var embedded in a longer value', () => {
    const t = resolveTokens([':root { --rule: #DEDEDD; --ct-sep-border: 1px solid var(--rule); }']);
    expect(t.get('--ct-sep-border')).toBe('1px solid #DEDEDD');
  });

  it('resolves an undeclared reference with no fallback to the empty string', () => {
    const t = resolveTokens([':root { --ct-text: var(--nope); }']);
    expect(t.get('--ct-text')).toBe('');
  });

  it('throws on a cycle and names it', () => {
    expect(() => resolveTokens([':root { --a: var(--b); --b: var(--a); }']))
      .toThrow(/cycle/i);
  });

  it('leaves a literal value untouched', () => {
    const t = resolveTokens([':root { --ct-slide-w: 1280px; --ct-sep-shadow: none; }']);
    expect(t.get('--ct-slide-w')).toBe('1280px');
    expect(t.get('--ct-sep-shadow')).toBe('none');
  });
});
