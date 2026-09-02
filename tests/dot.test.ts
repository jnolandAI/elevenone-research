import { describe, it, expect } from 'vitest';
import { dotAsset, loadManifest, manifestEngineVersion } from '../src/lib/dot';

// The library is not shipped with the site. docs/dot-imagery.md, under
// Roles, says why and how to render it. Everything here runs against
// hand-built manifests, because there is no real one to run against and
// the seam still has to be honest for the day something calls it again.
const LIB = {
  'grid-hero-dot.png': { w: 2880, h: 1200, role: 'hero', subject: 'grid', webp: 'grid-hero-dot.webp', engine_version: '1.3' },
  'urban-figure-dot.png': { w: 1440, h: 920, role: 'figure', subject: 'urban', engine_version: '1.3' },
};

describe('dot asset resolution', () => {
  it('resolves a known subject and role to the WebP', () => {
    const a = dotAsset('grid', 'hero', LIB);
    expect(a.src).toBe('/assets/dot/grid-hero-dot.webp');
    expect(a.width).toBe(2880);
    expect(a.height).toBe(1200);
  });

  it('names the subject and says rendered, per the imagery caption rule', () => {
    expect(dotAsset('grid', 'hero', LIB).alt).toMatch(/transmission grid/i);
    expect(dotAsset('grid', 'hero', LIB).alt).toMatch(/rendered/i);
  });

  // A bad subject string must fail the BUILD, not emit an img that 404s.
  it('throws on an unknown subject rather than emitting a broken path', () => {
    expect(() => dotAsset('nonexistent', 'hero', LIB)).toThrow(/nonexistent/);
  });

  it('throws when there is no manifest entry for the role', () => {
    expect(() => dotAsset('grid', 'cover', LIB)).toThrow(/manifest entry/i);
  });

  it('throws when a manifest entry exists but has no derived webp', () => {
    expect(() => dotAsset('urban', 'figure', LIB)).toThrow(/webp/i);
  });

  // With nothing shipped, a call from a component is a build failure that
  // says how to render, not a 404 a visitor finds.
  it('throws telling you to render when no library is shipped', () => {
    expect(loadManifest()).toEqual({});
    expect(() => dotAsset('grid', 'hero')).toThrow(/render_dot\.py/);
  });
});

// These exercise the throw paths directly, against hand-built manifests
// passed to the optional parameter.
describe('manifestEngineVersion() against constructed manifests', () => {
  it('reports the one version a consistent library was rendered at', () => {
    expect(manifestEngineVersion(LIB)).toBe('1.3');
  });

  it('throws naming both versions when the library is split', () => {
    const split = {
      'a-hero-dot.png': { w: 1, h: 1, role: 'hero', subject: 'a', engine_version: '1.1' },
      'b-hero-dot.png': { w: 1, h: 1, role: 'hero', subject: 'b', engine_version: '1.2' },
    };
    expect(() => manifestEngineVersion(split)).toThrow(/1\.1/);
    expect(() => manifestEngineVersion(split)).toThrow(/1\.2/);
  });

  it('throws when every entry is missing engine_version', () => {
    const allMissing = {
      'a-hero-dot.png': { w: 1, h: 1, role: 'hero', subject: 'a' },
      'b-hero-dot.png': { w: 1, h: 1, role: 'hero', subject: 'b' },
    };
    expect(() => manifestEngineVersion(allMissing)).toThrow(/engine_version/i);
  });

  it('throws when only some entries are missing engine_version', () => {
    const partlyMissing = {
      'a-hero-dot.png': { w: 1, h: 1, role: 'hero', subject: 'a', engine_version: '1.1' },
      'b-hero-dot.png': { w: 1, h: 1, role: 'hero', subject: 'b' },
    };
    expect(() => manifestEngineVersion(partlyMissing)).toThrow(/engine_version/i);
  });

  it('throws on an empty manifest', () => {
    expect(() => manifestEngineVersion({})).toThrow(/empty/i);
  });
});
