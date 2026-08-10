import { describe, it, expect, vi } from 'vitest';
import { dotAsset, manifestEngineVersion } from '../src/lib/dot';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

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
    try {
      const { dotAsset: dotAssetStubbed } = await import('../src/lib/dot');
      expect(() => dotAssetStubbed('urban', 'figure')).toThrow(/webp/i);
    } finally {
      // In try/finally rather than after the assertion: a failed toThrow
      // above would otherwise skip this and leave the stubbed manifest
      // mocked for whatever test runs next. This is the last test in the
      // file today, so nothing leaks yet, but that is an accident of file
      // order, not a guarantee.
      vi.doUnmock('../public/assets/dot/manifest.json');
      vi.resetModules();
    }
  });
});

describe('the manifest is not split across engine versions', () => {
  it('agrees on one version across every asset', () => {
    expect(() => manifestEngineVersion()).not.toThrow();
  });

  // A partial re-render is easy to do and invisible on the page: half the
  // library at 1.1 and half at 1.2 looks fine one image at a time. This is the
  // only thing that catches it.
  it('reports the version the whole library was rendered at', () => {
    expect(manifestEngineVersion()).toMatch(/^\d+\.\d+$/);
  });

  it('matches the version declared in the engine', () => {
    const src = readFileSync(
      fileURLToPath(new URL('../prototypes/dot-engine.js', import.meta.url)),
      'utf8',
    );
    const declared = /version:\s*'([^']+)'/.exec(src)?.[1];
    expect(manifestEngineVersion()).toBe(declared);
  });
});
