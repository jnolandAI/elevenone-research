import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * dot-engine.js is a classic browser script that closes with `})(window)`.
 * `window` there is a free identifier, so binding it as a function parameter
 * loads the file in node with no change to the shipped file. Nothing at module
 * scope touches THREE or document: both are only reached inside buildScene and
 * luminanceField, which these tests do not call.
 */
function loadEngine(): any {
  const path = fileURLToPath(new URL('../prototypes/dot-engine.js', import.meta.url));
  const src = readFileSync(path, 'utf8');
  const stub: any = {};
  new Function('window', src)(stub);
  if (!stub.DotFoundry) {
    throw new Error('dot-engine.js did not attach DotFoundry. Has its IIFE tail changed?');
  }
  return stub.DotFoundry;
}

describe('the engine loads outside a browser', () => {
  it('attaches its API without THREE or a document present', () => {
    const E = loadEngine();
    expect(typeof E.edge).toBe('function');
    expect(Object.keys(E.ROLES)).toEqual(['hero', 'figure', 'card', 'social', 'cover']);
  });

  it('reports the constants the docs claim', () => {
    const E = loadEngine();
    expect(E.CONST.angle).toBe(15);
    expect(E.CONST.gamma).toBe(1.0);
    expect(E.CONST.dot).toBe('#131312');
    expect(E.CONST.field).toBe('#FCFCFB');
  });
});
