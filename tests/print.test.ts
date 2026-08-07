import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/print.css', 'utf8');

describe('the print register', () => {
  it('is entirely inside a print media query', () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, '').trim().startsWith('@media print')).toBe(true);
  });

  // The selectors below are anchored to a boundary on purpose. An unanchored
  // .rail[^{]*\{ also matches `.rail .chev { display: none }`, which is a
  // correct rule, so the assertion would fail against the reference CSS and
  // the next person would loosen the check rather than fix the pattern.
  it('keeps the apparatus, which is the point of the document', () => {
    expect(css).toContain('.rail');
    expect(css).not.toMatch(/(^|[\s,{}])\.rail\s*\{[^}]*display:\s*none/m);
  });

  it('expands every claim, so nothing is collapsed on paper', () => {
    // the rule that actually opens them; "details" appears in styling rules too
    expect(css).toMatch(/\.rail\s+details\s+\.body\s*\{[^}]*display:\s*block\s*!important/);
  });

  it('keeps the load path and the method block', () => {
    expect(css).not.toMatch(/(^|[\s,{}])\.path\s*\{[^}]*display:\s*none/m);
    expect(css).not.toMatch(/(^|[\s,{}])\.method\s*\{[^}]*display:\s*none/m);
  });

  it('suppresses the chrome and the drawn ground', () => {
    expect(css).toMatch(/\.nav[^{]*\{[^}]*display:\s*none/);
    expect(css).toMatch(/\.ground[^{]*,?[^{]*\{[^}]*display:\s*none/);
  });

  it('does not break a figure across a page', () => {
    // scoped to .fig: the phrase also appears on .rail li, .path and .method,
    // so a whole-file check survives deleting it from the figure rule
    expect(css).toMatch(/\.fig\s*\{[^}]*break-inside:\s*avoid/);
  });
});
