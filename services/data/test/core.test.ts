import { describe, expect, it } from 'vitest';
import { Citations, formatCitation } from '../src/core/citation.js';
import { TtlCache } from '../src/core/cache.js';
import { Upstream, stripParams } from '../src/core/http.js';
import { ToolError } from '../src/core/errors.js';
import { loadConfig, parseKeyHashes } from '../src/config.js';
import { fakeFetch } from './helpers.js';

const base = {
  source: 'bls' as const,
  publisher: 'U.S. Bureau of Labor Statistics',
  dataset: 'Current Population Survey',
  title: 'Unemployment rate',
  identifier: 'LNS14000000',
  url: 'https://data.bls.gov/timeseries/LNS14000000',
  api_url: 'https://api.bls.gov/publicAPI/v2/timeseries/data/LNS14000000',
  retrieved_at: '2026-10-19T12:00:00.000Z',
  license: 'U.S. government work, public domain',
};

describe('citations (docs/citations.md)', () => {
  it('formats a footnote line naming publisher, title, id, date and link', () => {
    expect(formatCitation(base)).toBe(
      'U.S. Bureau of Labor Statistics, "Unemployment rate" (LNS14000000), Current Population Survey, retrieved 2026-10-19, https://data.bls.gov/timeseries/LNS14000000.',
    );
  });

  it('credits the agency first and the relay second, as FRED asks', () => {
    const text = formatCitation({ ...base, source: 'fred', via: 'FRED, Federal Reserve Bank of St. Louis', as_of: '2026-10-03' });
    expect(text).toMatch(/^U\.S\. Bureau of Labor Statistics, /);
    expect(text).toContain('as of 2026-10-03, retrieved from FRED, Federal Reserve Bank of St. Louis 2026-10-19');
  });

  it('numbers citations and folds duplicates, but keeps two pages of one request apart', () => {
    const c = new Citations();
    expect(c.add(base)).toBe('c1');
    expect(c.add(base)).toBe('c1');
    expect(c.add({ ...base, url: 'https://example.org/other-country' })).toBe('c2');
    expect(c.list().map((x) => x.id)).toEqual(['c1', 'c2']);
    expect(c.list()[0]!.text).toBe(formatCitation(base));
  });
});

describe('cache', () => {
  it('expires entries and evicts the least recently used past its bound', () => {
    let now = 0;
    const cache = new TtlCache<number>(2, () => now);
    cache.set('a', 1, 100);
    cache.set('b', 2, 100);
    cache.get('a');
    cache.set('c', 3, 100);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(1);
    now = 100;
    expect(cache.get('a')).toBeUndefined();
  });
});

describe('upstream', () => {
  it('strips credential parameters from the URL a caller sees', () => {
    expect(stripParams('https://x.test/a?series_id=GDP&api_key=SECRET&file_type=json', ['api_key'])).toBe('https://x.test/a?series_id=GDP&file_type=json');
  });

  it('caches, and coalesces concurrent identical requests into one fetch', async () => {
    const f = fakeFetch([[/x\.test/, { ok: 1 }]]);
    const up = new Upstream({ fetch: f });
    const req = { source: 'fred' as const, url: 'https://x.test/a?api_key=K', secretParams: ['api_key'], ttlMs: 60_000 };
    const [a, b] = await Promise.all([up.json(req), up.json(req)]);
    const c = await up.json(req);
    expect(f.calls).toHaveLength(1);
    expect([a.cached, b.cached, c.cached]).toEqual([false, true, true]);
    expect(c.apiUrl).toBe('https://x.test/a');
    // a cache hit reports when the publisher served the figure, not when it was asked again
    expect(c.retrievedAt).toBe(a.retrievedAt);
  });

  it('retries a 503 and succeeds', async () => {
    let n = 0;
    const f = fakeFetch([[/x\.test/, () => (++n < 2 ? new Response('busy', { status: 503 }) : Response.json({ ok: 1 }))]]);
    const up = new Upstream({ fetch: f, retryBaseMs: 1 });
    await expect(up.json({ source: 'bea', url: 'https://x.test/', ttlMs: 1 })).resolves.toMatchObject({ data: { ok: 1 } });
    expect(f.calls).toHaveLength(2);
  });

  it('treats a redirect as a refused key, and does not follow it', async () => {
    const f = fakeFetch([[/x\.test/, () => new Response(null, { status: 302, headers: { location: 'https://x.test/missing_key.html' } })]]);
    const up = new Upstream({ fetch: f });
    await expect(up.json({ source: 'census', url: 'https://x.test/data?key=K', secretParams: ['key'], ttlMs: 1 })).rejects.toMatchObject({
      code: 'upstream_error',
      message: expect.stringContaining('missing or rejected key'),
    });
    expect(f.calls[0]!.init?.redirect).toBe('manual');
  });

  it('removes an echoed credential from an upstream error, and reduces HTML to its title', async () => {
    const f = fakeFetch([
      [/echo/, () => new Response('bad api_key=SECRETKEY123', { status: 400 })],
      [/html/, () => new Response('<html><head><title>Request Rate Threshold Exceeded</title></head><body>...</body></html>', { status: 403 })],
    ]);
    const up = new Upstream({ fetch: f });
    const err = await up.json({ source: 'fred', url: 'https://x.test/echo?api_key=SECRETKEY123', secretParams: ['api_key'], ttlMs: 1 }).catch((e) => e);
    expect(err).toBeInstanceOf(ToolError);
    expect(err.message).not.toContain('SECRETKEY123');
    const html = await up.json({ source: 'sec', url: 'https://x.test/html', ttlMs: 1 }).catch((e) => e);
    expect(html.message).toBe('sec answered 403: Request Rate Threshold Exceeded');
  });
});

describe('config', () => {
  it('parses label:hash pairs and rejects anything that is not a digest', () => {
    const h = 'a'.repeat(64);
    expect([...parseKeyHashes(`acme:${h}, ${'b'.repeat(64)}`)]).toEqual([
      [h, 'acme'],
      ['b'.repeat(64), 'default'],
    ]);
    expect(() => parseKeyHashes('acme:plaintextkey')).toThrow(/sha256/);
  });

  it('refuses an SEC user agent without a contact email, which SEC would answer with 403', () => {
    expect(() => loadConfig({ SEC_USER_AGENT: 'Eleven One Research' })).toThrow(/contact email/);
    expect(loadConfig({ SEC_USER_AGENT: 'Eleven One Research ops@example.com' }).secUserAgent).toBe('Eleven One Research ops@example.com');
  });
});

describe('the warmer', () => {
  it('refreshes catalog series past the cache, so they never expire into a cold fetch', async () => {
    const { warmOnce, warmRefs } = await import('../src/warm.js');
    const { testDeps } = await import('./helpers.js');
    const deps = testDeps();
    expect(warmRefs(deps).length).toBeGreaterThan(40);
    await warmOnce(deps);
    const first = deps.fetch.calls.length;
    await warmOnce(deps);
    // a second pass fetches again rather than reading its own cache
    expect(deps.fetch.calls.length).toBe(first * 2);
    // and leaves a client's identical call a pure cache hit
    const { runTool } = await import('../src/tools.js');
    const r = await runTool(deps, 'get_series', { refs: ['bls:CES6054160001'] });
    expect(r.meta.cache_hits).toBe(r.meta.upstream_calls);
  });
});

describe('the warmer, without a BLS key', () => {
  it('leaves BLS alone rather than spend its 25 keyless requests a day', async () => {
    const { warmRefs } = await import('../src/warm.js');
    const { testDeps, ROUTES } = await import('./helpers.js');
    expect(warmRefs(testDeps()).some((r) => r.startsWith('bls:'))).toBe(true);
    expect(warmRefs(testDeps(ROUTES, { BLS_API_KEY: '' })).some((r) => r.startsWith('bls:'))).toBe(false);
  });
});
