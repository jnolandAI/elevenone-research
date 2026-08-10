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

describe('the tone scale', () => {
  it('runs five steps from lightest to darkest', () => {
    const E = loadEngine();
    expect(E.TONES).toEqual(['#D6D6D4', '#B8B8B6', '#9C9C9A', '#7A7A78', '#565654']);
  });

  // The two materials this replaces were #B8B8B6 and #8A8A88: 46 levels apart
  // out of 255. That gap is why every render read flat, so the span widening is
  // the actual deliverable and is worth asserting rather than eyeballing.
  it('spans at least 120 levels, against the 46 it replaces', () => {
    const E = loadEngine();
    const lum = (h: string) => parseInt(h.slice(1, 3), 16);
    expect(lum(E.TONES[0]) - lum(E.TONES[4])).toBeGreaterThanOrEqual(120);
  });

  it('keeps every step neutral, since rule 5 is greyscale absolutely', () => {
    const E = loadEngine();
    for (const h of E.TONES) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThanOrEqual(4);
    }
  });
});

describe('fog constants', () => {
  it('are declared as multipliers of camera distance, not as world units', () => {
    const E = loadEngine();
    expect(E.CONST.fogNear).toBe(0.55);
    expect(E.CONST.fogFar).toBe(1.9);
  });

  // Fog is deliberately not a per-subject table. If one subject needs its own
  // fog its camera is wrong, and a table would hide that rather than fix it.
  it('are not overridable per subject', () => {
    const E = loadEngine();
    expect((E as any).FOG_ROLE).toBeUndefined();
    expect((E as any).FOG).toBeUndefined();
  });
});

describe('ground forms', () => {
  const source = () =>
    readFileSync(fileURLToPath(new URL('../prototypes/dot-engine.js', import.meta.url)), 'utf8');

  it('exposes the shared helper', () => {
    const E = loadEngine();
    expect(typeof E.ground).toBe('function');
  });

  // Five subjects each added a single thin box as ground. docs/dot-imagery.md
  // lists "a ground plane filling a third of the frame with flat mid-grey" as a
  // standard cause of a failed recognition test, so leaving one behind is a
  // known defect, not a style preference.
  //
  // The pattern is a wide, deep, very shallow box: two dimensions of at least
  // two integer digits either side of a fractional height. That is broader than
  // the literal `.4` this used to require, which only ever caught the exact
  // spelling the five deleted slabs happened to share. What it still does not
  // catch: a slab whose dimensions are named constants or expressions rather
  // than literals, one built through `new THREE.Mesh(new THREE.BoxGeometry(...))`
  // instead of the `box()` helper, or one made from a flat PlaneGeometry. A
  // source scan cannot close those; the depth test in docs/dot-imagery.md is
  // what covers them.
  it('leaves no subject standing on a bare slab', () => {
    expect(source()).not.toMatch(/box\(\s*\d{2,}\s*,\s*0?\.\d+\s*,\s*\d{2,}\s*,/);
  });

  it('is called once by every subject', () => {
    const E = loadEngine();
    const calls = source().match(/^\s*ground\(g, TONE, rnd, \{/gm) ?? [];
    expect(calls).toHaveLength(E.SUBJECTS.length);
  });
});

// The ridge used to derive its distance from -d/2 + 4, tying how far the
// horizon sits to how large the ground plane was, and a silent fallback there
// is exactly what let five subjects' ridges land past fogFar and render as
// pure white with nobody noticing. ridgeDist replaces the derivation and is
// required whenever ridge is set, with no fallback: ground() throws instead.
// Passing plane: false and scatter: 0 (or leaving scatter at its 0 default)
// means these calls never reach a THREE.* constructor, so the throw path is
// exercised with no THREE stub at all — the throw is the first statement
// inside the `if (o.ridge)` branch, ahead of any geometry construction.
describe("ground() requires ridgeDist whenever ridge is set", () => {
  it('throws when ridge is non-zero and ridgeDist is absent', () => {
    const E = loadEngine();
    expect(() =>
      E.ground({}, [], () => 0.5, { plane: false, ridge: 5.5 }),
    ).toThrow(/ridgeDist/);
  });

  it('does not throw for ridge: 0 even without ridgeDist, as robotics relies on', () => {
    const E = loadEngine();
    expect(() =>
      E.ground({}, [], () => 0.5, { plane: false, scatter: 0, ridge: 0 }),
    ).not.toThrow();
  });
});

// A prior review flagged flat + 6 + t*(d/2 - flat - 8) as an unguarded edge
// case: once d is cut small enough relative to flat, the span goes negative,
// the near/far gradient inverts, and scatter boxes land inside flat, the one
// radius the option exists to keep clear. scatterRadius is the same formula
// with the span clamped at 0, pulled out so this is checkable without THREE.
describe('scatterRadius', () => {
  it('exposes the helper', () => {
    const E = loadEngine();
    expect(typeof E.scatterRadius).toBe('function');
  });

  it('spans the annulus from flat+6 to d/2-2 when the annulus is wide', () => {
    const E = loadEngine();
    // grid: flat 12, d 150 -> span from 18 to 73
    expect(E.scatterRadius(12, 150, 0)).toBeCloseTo(18);
    expect(E.scatterRadius(12, 150, 1)).toBeCloseTo(73);
    expect(E.scatterRadius(12, 150, 0.5)).toBeCloseTo(45.5);
  });

  it("collapses to flat+6 for port's actual flat/d, where the raw span is -4.5", () => {
    const E = loadEngine();
    expect(E.scatterRadius(44, 95, 0)).toBeCloseTo(50);
    expect(E.scatterRadius(44, 95, 0.5)).toBeCloseTo(50);
    expect(E.scatterRadius(44, 95, 1)).toBeCloseTo(50);
  });

  it("collapses to flat+6 for datacenter's actual flat/d, where the raw span is -10.5", () => {
    const E = loadEngine();
    expect(E.scatterRadius(30, 55, 0)).toBeCloseTo(36);
    expect(E.scatterRadius(30, 55, 0.5)).toBeCloseTo(36);
    expect(E.scatterRadius(30, 55, 1)).toBeCloseTo(36);
  });

  it('never returns a radius inside flat, across a spread of flat/d/t combinations', () => {
    const E = loadEngine();
    const flats = [0, 12, 26, 30, 36, 44];
    const ds = [20, 55, 80, 95, 120, 150];
    const ts = [0, 0.25, 0.5, 0.75, 1];
    for (const flat of flats) for (const d of ds) for (const t of ts) {
      expect(E.scatterRadius(flat, d, t)).toBeGreaterThanOrEqual(flat);
    }
  });

  it('is monotonic non-decreasing in t for a fixed flat and d', () => {
    const E = loadEngine();
    for (const [flat, d] of [[12, 150], [44, 95], [30, 55], [36, 120]]) {
      let prev = -Infinity;
      for (let t = 0; t <= 1; t += 0.1) {
        const r = E.scatterRadius(flat, d, t);
        expect(r).toBeGreaterThanOrEqual(prev);
        prev = r;
      }
    }
  });

  // Task 5 shrank d on five subjects to pull their ridges inside the fog band,
  // which pushed d/2 below flat + 8 on four of them and collapsed their scatter
  // annulus to a ring at flat+6 (the two collapse cases above). ridgeDist now
  // carries that job instead, so Task 7b restores every subject's w/d to Task
  // 5's original, larger values. These cases prove the span is a real range
  // again — t=0 and t=1 must land at different radii, not the same one — at
  // the actual flat/d each subject ships with post-restore.
  it('is non-degenerate again at the restored w/d values, unlike the shrunk ones above', () => {
    const E = loadEngine();
    // [flat, d, expected span = d/2 - flat - 8]
    const restored: Array<[number, number, number]> = [
      [44, 120, 8],   // port
      [30, 110, 17],  // datacenter
      [26, 130, 31],  // wind (flat defaults to 26 — wind passes no flat)
      [12, 150, 55],  // grid
      [36, 120, 16],  // urban
    ];
    for (const [flat, d, span] of restored) {
      const near = E.scatterRadius(flat, d, 0);
      const far = E.scatterRadius(flat, d, 1);
      expect(near).toBeCloseTo(flat + 6);
      expect(far).toBeCloseTo(flat + 6 + span);
      // non-degenerate: t=0 and t=1 must differ, i.e. a real range, not a ring
      expect(far).toBeGreaterThan(near);
    }
  });
});

const engineSource = () =>
  readFileSync(fileURLToPath(new URL('../prototypes/dot-engine.js', import.meta.url)), 'utf8');

// comments discuss `mat` and `dark` by name on purpose, and they name TONE
// steps in prose; strip them so every assertion below is about code
const sceneBody = () =>
  engineSource().slice(engineSource().indexOf('function buildScene')).replace(/\/\*[\s\S]*?\*\//g, '');

describe('scenes use the whole tone scale', () => {
  it('has deleted the migration aliases', () => {
    expect(sceneBody()).not.toMatch(/const mat\s+=\s+TONE\[1\]/);
    expect(sceneBody()).not.toMatch(/const dark\s+=\s+TONE\[3\]/);
  });

  it('leaves no scene referring to the removed names', () => {
    expect(sceneBody()).not.toMatch(/\b(mat|dark)\b/);
  });
});

/**
 * Per-subject tone coverage.
 *
 * This replaces a single `used.size >= 4` taken across the whole `buildScene`
 * body. That form was satisfied by one compliant subject on behalf of all six,
 * which is exactly how datacenter regressed to TONE[0..2] for a whole commit
 * without a test noticing. The scoring below is per subject and nothing else
 * can stand in for a subject that has gone flat.
 *
 * A subject's tones are the `TONE[n]` literals inside its own
 * `if (id === '<subject>')` block, plus the tones `ground()` itself draws for
 * the parts that subject switches on. `ground()` is where most subjects' light
 * end comes from (the ridge and the scatter are both TONE[0]), so scoring the
 * block alone would score half the scene and mark grid, which draws nothing
 * lighter than TONE[2] itself, as flat when it is not.
 */
describe('every subject draws from the dark end of the tone scale', () => {
  const level = (hex: string) => parseInt(hex.slice(1, 3), 16);

  // ground()'s own three tones, in the order it draws them: the displaced
  // plane, the ridge silhouette, the scatter. Read as an ordered list rather
  // than restated as constants, so retuning the helper fails this loudly
  // instead of quietly scoring subjects against tones it no longer draws.
  const groundTones = () => {
    const src = engineSource();
    const body = src
      .slice(src.indexOf('function ground('), src.indexOf('function buildScene('))
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const found = (body.match(/TONE\[(\d)\]/g) ?? []).map((m) => Number(m.slice(5, 6)));
    return { plane: found[0], ridge: found[1], scatter: found[2], all: found };
  };

  // The block runs from this subject's `if (id === ...)` to the next subject's,
  // or to `s.add(g)` where the last subject ends.
  const blockOf = (id: string, ids: string[]) => {
    const body = sceneBody();
    const start = body.indexOf(`if (id === '${id}')`);
    expect(start, `no buildScene branch for ${id}`).toBeGreaterThan(-1);
    let end = body.indexOf('s.add(g);');
    for (const other of ids) {
      if (other === id) continue;
      const i = body.indexOf(`if (id === '${other}')`);
      if (i > start && i < end) end = i;
    }
    return body.slice(start, end);
  };

  const stepsFor = (id: string, ids: string[]) => {
    const block = blockOf(id, ids);
    const steps = new Set([...block.matchAll(/TONE\[(\d)\]/g)].map((m) => Number(m[1])));
    const g = groundTones();
    const opts = block.match(/ground\(g, TONE, rnd, \{([^}]*)\}\)/);
    expect(opts, `${id} does not call ground()`).not.toBeNull();
    const num = (key: string) => {
      const m = opts![1].match(new RegExp(`${key}:\\s*([\\d.]+)`));
      return m ? parseFloat(m[1]) : 0;
    };
    if (!/plane:\s*false/.test(opts![1])) steps.add(g.plane);
    if (num('ridge') > 0) steps.add(g.ridge);
    if (num('scatter') > 0) steps.add(g.scatter);
    return steps;
  };

  it('reads three tones out of ground(), in the order plane, ridge, scatter', () => {
    // If this fails the scoring below is measuring the wrong thing, so it is
    // asserted separately rather than folded into the per-subject cases.
    expect(groundTones().all).toHaveLength(3);
  });

  /**
   * The bar. Four of five steps, and at least 96 levels between a subject's
   * lightest tone and its darkest.
   *
   * 96 is set just under the 98 that TONE[1] to TONE[4] gives, which is the
   * narrowest span a subject can have while still reaching the darkest step,
   * and it is more than double the 46 levels the two materials this version
   * replaced sat apart. It is also unreachable without TONE[4]: the lightest
   * step is 214 and TONE[3] is 122, a span of 92. The darkest step is asserted
   * separately anyway, because "span too narrow" is a worse failure message
   * than "never reaches the darkest step".
   */
  const MIN_STEPS = 4;
  const MIN_SPAN = 96;

  /**
   * Urban is the one legitimate exception and is named here with its reason
   * rather than handled by lowering the bar for everyone. It is a field of
   * massing seen from above with no fine structure in it at all: no leg, no
   * conductor, no cap rail, nothing thin enough to earn the deepest step. Its
   * blocks are graded by depth (TONE[0] at the back through TONE[2]/TONE[3] at
   * the front), so it uses the scale for recession rather than for structure,
   * and TONE[4] on a 2.7-unit-wide massing block would read as a hole rather
   * than as detail. It still has to reach TONE[3] and span 90.
   */
  const EXCEPTIONS: Record<string, { maxStep: number; minSpan: number; why: string }> = {
    urban: {
      maxStep: 3,
      minSpan: 90,
      why: 'a field of massing with no fine structure, so nothing earns the deepest step',
    },
  };

  const E = loadEngine();
  const ids: string[] = E.SUBJECTS.map((s: any) => s.id);

  for (const id of ids) {
    const exception = EXCEPTIONS[id];

    it(`${id} reaches at least ${MIN_STEPS} distinct steps`, () => {
      expect(stepsFor(id, ids).size).toBeGreaterThanOrEqual(MIN_STEPS);
    });

    it(
      exception
        ? `${id} reaches TONE[${exception.maxStep}] (${exception.why})`
        : `${id} reaches TONE[4], the structure the eye should land on first`,
      () => {
        const steps = [...stepsFor(id, ids)];
        expect(Math.max(...steps)).toBe(exception ? exception.maxStep : 4);
      },
    );

    it(`${id} spans at least ${exception ? exception.minSpan : MIN_SPAN} levels`, () => {
      const steps = [...stepsFor(id, ids)];
      const levels = steps.map((s) => level(E.TONES[s]));
      const span = Math.max(...levels) - Math.min(...levels);
      expect(span).toBeGreaterThanOrEqual(exception ? exception.minSpan : MIN_SPAN);
    });
  }
});

/**
 * The ridge in its fog band.
 *
 * Five subjects once had ridges past fogFar, rendering as pure white with
 * nobody noticing, and the fix for that was a hand-solved `ridgeDist` per
 * subject. Nothing tested it. That solve depends on CAM and CAM_ROLE, and a
 * camera change is the most likely next edit to this file, so this is the
 * assertion that turns a silent dead horizon back into a failing test.
 *
 * The equivalent assertion for the scatter field is deliberately absent. The
 * scatter currently sits mostly past fogFar on the hero crops (measured: 94%
 * of datacenter hero's in-frame scatter boxes at a fog factor of 0.98 or
 * above, 97% for its card, 75% for port hero, 63% urban, 61% wind, 41% grid),
 * so writing it would commit a knowingly failing test. Moving that geometry
 * changes every asset in the library and is deferred to its own pass. Add the
 * scatter case in that pass, not before.
 */
describe('every ridge sits inside its fog band', () => {
  const E = loadEngine();
  const src = engineSource();
  const body = src.slice(src.indexOf('function buildScene')).replace(/\/\*[\s\S]*?\*\//g, '');
  const ids: string[] = E.SUBJECTS.map((s: any) => s.id);

  // The roles a subject actually renders at, read from the shipped manifest
  // rather than from a list here: the point is to cover what is published.
  const manifest = JSON.parse(
    readFileSync(fileURLToPath(new URL('../public/assets/dot/manifest.json', import.meta.url)), 'utf8'),
  ) as Record<string, { subject: string; role: string }>;
  const rolesOf = (id: string) =>
    [...new Set(Object.values(manifest).filter((a) => a.subject === id).map((a) => a.role))].sort();

  const groundCall = (id: string) => {
    const start = body.indexOf(`if (id === '${id}')`);
    let end = body.indexOf('s.add(g);');
    for (const other of ids) {
      if (other === id) continue;
      const i = body.indexOf(`if (id === '${other}')`);
      if (i > start && i < end) end = i;
    }
    const m = body.slice(start, end).match(/ground\(g, TONE, rnd, \{([^}]*)\}\)/);
    const num = (key: string) => {
      const v = m![1].match(new RegExp(`${key}:\\s*([\\d.]+)`));
      return v ? parseFloat(v[1]) : 0;
    };
    return { ridge: num('ridge'), ridgeDist: num('ridgeDist') };
  };

  // Same solve the ridgeDist values were derived under: the fog band is
  // camDist * fogNear to camDist * fogFar, camDist measured to the camera's
  // look-at point, and the ridge is scored at its centre-line box, whose
  // average height is ridge * 0.725 (the midpoint of ground()'s 0.45 + rnd()
  // * 0.55 height factor) and whose centre therefore sits at that / 2 - 1.
  const fogAt = (id: string, role: string) => {
    const R = E.ROLES[role];
    const c = E.camFor(id, role);
    const d = R.dist;
    const cam = [c[0] * d, c[1] * d, c[2] * d];
    const camDist = Math.hypot(cam[0] - c[3], cam[1] - c[4], cam[2] - c[5]);
    const near = camDist * E.CONST.fogNear;
    const far = camDist * E.CONST.fogFar;
    const { ridge, ridgeDist } = groundCall(id);
    const y = (ridge * 0.725) / 2 - 1;
    const dist = Math.hypot(cam[0], y - cam[1], -ridgeDist - cam[2]);
    return { near, far, dist, fraction: (dist - near) / (far - near) };
  };

  const bearers = ids.filter((id) => groundCall(id).ridge > 0);

  it('covers every subject that has a ridge at all', () => {
    // robotics is the one subject with ridge: 0, so five of six is right.
    expect(bearers).toEqual(['port', 'datacenter', 'wind', 'grid', 'urban']);
  });

  for (const id of bearers) {
    for (const role of rolesOf(id)) {
      it(`${id} at ${role} lands between fogNear and fogFar`, () => {
        const f = fogAt(id, role);
        expect(f.dist).toBeGreaterThan(f.near);
        expect(f.dist).toBeLessThan(f.far);
      });

      // Inside the band is the hard requirement, but a ridge at a fog fraction
      // of 0.98 is inside it and still functionally erased, which is what the
      // dead ridges measured at (0.92 to 1.00). The target when ridgeDist was
      // solved was 0.55 to 0.70; port straddles it at 0.516 and 0.707 because
      // its two cameras differ by nearly 2x and no single value satisfies
      // both. 0.35 to 0.85 is that target with the straddle allowed for, and
      // it still fails anything approaching a dead ridge.
      it(`${id} at ${role} is faded but not erased`, () => {
        const f = fogAt(id, role);
        expect(f.fraction).toBeGreaterThan(0.35);
        expect(f.fraction).toBeLessThan(0.85);
      });
    }
  }
});
