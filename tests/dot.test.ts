import { describe, it, expect, vi } from 'vitest';
import { dotAsset } from '../src/lib/dot';

describe('dot asset resolution', () => {
  it('resolves a known subject and role to the WebP the site ships', () => {
    const a = dotAsset('grid', 'hero');
    expect(a.src).toBe('/assets/dot/grid-hero-dot.webp');
    expect(a.width).toBe(2880);
    expect(a.height).toBe(1200);
  });

  it('names the subject and says rendered, per the imagery caption rule', () => {
    expect(dotAsset('grid', 'hero').alt).toMatch(/transmission grid/i);
    expect(dotAsset('grid', 'hero').alt).toMatch(/rendered/i);
  });

  // A bad subject string must fail the BUILD, not emit an img that 404s. A
  // broken hero still leaves a structurally correct page, so nothing else
  // would catch it.
  it('throws on an unknown subject rather than emitting a broken path', () => {
    expect(() => dotAsset('nonexistent', 'hero')).toThrow(/nonexistent/);
  });

  // wind's cover role exists only as a contour render (wind-cover-contour.png,
  // for the PDF report cover), never as a dot render, so no
  // wind-cover-dot.png key is in the manifest. This is the "no manifest
  // entry" branch, not "no derived webp": Task 1 derived a webp for every
  // dot-mode entry that does exist, so that branch has no live fixture to
  // exercise it against real data. It stays in dotAsset() as documented,
  // defensive behaviour for a future render that has not yet been through
  // the webp step.
  it('throws when there is no dot-mode manifest entry for the role', () => {
    expect(() => dotAsset('wind', 'cover')).toThrow(/manifest entry/i);
  });

  // Every real manifest entry already carries a webp key (Task 1 ran to
  // completion), so the "entry exists, webp missing" branch has no live
  // fixture in public/assets/dot/manifest.json. Stub the manifest for just
  // this test with a synthetic entry that has everything except webp, so
  // the branch that fires when someone renders a new subject and forgets to
  // run webp_derive.py actually gets exercised, not just written.
  it('throws when a manifest entry exists but has no derived webp', async () => {
    vi.resetModules();
    vi.doMock('../public/assets/dot/manifest.json', () => ({
      default: {
        'urban-figure-dot.png': { w: 1440, h: 920, role: 'figure', subject: 'urban' },
      },
    }));
    const { dotAsset: dotAssetStubbed } = await import('../src/lib/dot');
    expect(() => dotAssetStubbed('urban', 'figure')).toThrow(/webp/i);
    vi.doUnmock('../public/assets/dot/manifest.json');
    vi.resetModules();
  });
});
