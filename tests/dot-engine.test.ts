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

describe('fadeSet normalises what a caller gives it', () => {
  it('expands a scalar the way the old symmetric ramp behaved', () => {
    const E = loadEngine();
    // the pre-1.2 edge() used f horizontally and f*0.9 vertically.
    // toBeCloseTo, not toEqual: 0.2 * 0.9 is 0.18000000000000002 in IEEE 754.
    const s = E.fadeSet(0.2);
    expect(s.left).toBeCloseTo(0.2, 10);
    expect(s.right).toBeCloseTo(0.2, 10);
    expect(s.top).toBeCloseTo(0.18, 10);
    expect(s.bottom).toBeCloseTo(0.18, 10);
  });

  it('falls back to CONST.fade when given nothing', () => {
    const E = loadEngine();
    expect(E.fadeSet(null)).toEqual(E.fadeSet(E.CONST.fade));
  });

  it('fills missing sides with zero rather than with a default', () => {
    const E = loadEngine();
    expect(E.fadeSet({ left: 0.18 })).toEqual({ top: 0, right: 0, bottom: 0, left: 0.18 });
  });
});

describe('edge dissolves per side', () => {
  const F = { top: 0, right: 0.18, bottom: 0, left: 0.18 };

  it('leaves the interior at full density', () => {
    const E = loadEngine();
    expect(E.edge(0.5, 0.5, F)).toBe(1);
  });

  it('reaches zero at a dissolving frame edge', () => {
    const E = loadEngine();
    expect(E.edge(0, 0.5, F)).toBe(0);
    expect(E.edge(1, 0.5, F)).toBe(0);
  });

  it('holds full density up to a frame edge whose fraction is zero', () => {
    const E = loadEngine();
    expect(E.edge(0.5, 0, F)).toBe(1);
    expect(E.edge(0.5, 1, F)).toBe(1);
  });

  it('rises monotonically across the fade band', () => {
    const E = loadEngine();
    const seen = [0, 0.25, 0.5, 0.75, 1].map((k) => E.edge(0.18 * k, 0.5, F));
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThan(seen[i - 1]);
  });

  // The midpoint is the one place smoothstep and a linear ramp agree, both 0.5.
  // The quarter point is where they diverge most, so that is what proves the
  // curve is eased rather than linear.
  it('eases rather than ramping linearly', () => {
    const E = loadEngine();
    expect(E.edge(0.18 * 0.25, 0.5, F)).toBeCloseTo(0.15625, 5);
    expect(E.edge(0.18 * 0.5, 0.5, F)).toBeCloseTo(0.5, 5);
  });

  it('multiplies two dissolving sides at a corner', () => {
    const E = loadEngine();
    const all = { top: 0.18, right: 0.18, bottom: 0.18, left: 0.18 };
    const one = E.edge(0.18 * 0.25, 0.5, all);
    expect(E.edge(0.18 * 0.25, 0.18 * 0.25, all)).toBeCloseTo(one * one, 5);
  });
});

describe('fadeFor resolves in the documented order', () => {
  it('starts every role on the 1.2 defaults', () => {
    const E = loadEngine();
    for (const role of Object.keys(E.ROLES)) {
      expect(E.fadeFor('grid', role)).toEqual({ top: 0, right: 0.18, bottom: 0, left: 0.18 });
    }
  });

  it('lets a subject and role override its role default', () => {
    const E = loadEngine();
    E.EDGE_ROLE['grid:hero'] = { top: 0, right: 0.3, bottom: 0.1, left: 0.3 };
    expect(E.fadeFor('grid', 'hero')).toEqual({ top: 0, right: 0.3, bottom: 0.1, left: 0.3 });
    expect(E.fadeFor('port', 'hero')).toEqual({ top: 0, right: 0.18, bottom: 0, left: 0.18 });
    delete E.EDGE_ROLE['grid:hero'];
  });

  it('ships the override table empty, because sparse is the discipline', () => {
    const E = loadEngine();
    expect(Object.keys(E.EDGE_ROLE)).toEqual([]);
  });
});
