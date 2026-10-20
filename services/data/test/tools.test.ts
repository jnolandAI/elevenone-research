import { describe, expect, it } from 'vitest';
import { TOOLS, runTool } from '../src/tools.js';
import { CATALOG } from '../src/catalog.js';
import { SECRETS, testDeps } from './helpers.js';

describe('find_data', () => {
  it('answers a consultant\'s phrasing with a ready-to-run call', async () => {
    const r = await runTool(testDeps(), 'find_data', { query: 'management consulting employment', sources: ['bls'] });
    const top = (r.data as any).catalog[0];
    expect(top).toMatchObject({ tool: 'get_series', args: { refs: ['bls:CES6054160001'] } });
  });

  it('routes company questions to the SEC tools', async () => {
    const r = await runTool(testDeps(), 'find_data', { query: 'competitor revenue and margins' });
    expect((r.data as any).catalog[0].tool).toBe('company_financials');
  });

  it('adds live FRED search results the catalog does not already list', async () => {
    const r = await runTool(testDeps(), 'find_data', { query: 'unemployment' });
    const d = r.data as any;
    const catalogRefs = d.catalog.flatMap((c: any) => c.args.refs ?? []);
    expect(catalogRefs).toContain('fred:UNRATE');
    expect(d.fred_search.map((f: any) => f.ref)).not.toContain('fred:UNRATE');
    expect(d.fred_search[0]).toMatchObject({ tool: 'get_series', args: { refs: ['fred:CES6054160001'] } });
  });
});

describe('the catalog', () => {
  it('names only refs and tools the service can run', () => {
    const names = new Set(TOOLS.map((t) => t.name));
    for (const e of CATALOG) {
      expect(names.has(e.tool)).toBe(true);
      if (e.tool === 'get_series') expect(e.ref).toMatch(/^(fred|bls|worldbank):\S+$/);
    }
    const refs = CATALOG.flatMap((e) => (e.ref ? [e.ref] : []));
    expect(new Set(refs).size).toBe(refs.length);
  });
});

describe('runTool', () => {
  it('rejects unknown arguments and bad values with a message the caller can act on', async () => {
    await expect(runTool(testDeps(), 'get_series', { refs: [] })).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(runTool(testDeps(), 'get_series', { refs: ['fred:GDP'], bogus: 1 })).rejects.toMatchObject({ code: 'invalid_request' });
    await expect(runTool(testDeps(), 'nope', {})).rejects.toMatchObject({ code: 'not_found' });
    await expect(runTool(testDeps(), 'get_series', { refs: ['gdp'] })).rejects.toMatchObject({ code: 'invalid_request' });
  });

  it('returns what it could when one of several series fails', async () => {
    const r = await runTool(testDeps(), 'get_series', { refs: ['fred:UNRATE', 'fred:NOSUCH'] });
    const d = r.data as any;
    expect(d.series).toHaveLength(1);
    expect(d.errors).toEqual([expect.objectContaining({ ref: 'fred:NOSUCH', code: 'not_found' })]);
  });

  it('says a source is not configured instead of failing upstream', async () => {
    const r = await runTool(testDeps(undefined, { FRED_API_KEY: '' }), 'get_series', { refs: ['fred:UNRATE'] }).catch((e) => e);
    expect(r.code).toBe('not_configured');
  });

  it('reports what it did: sources, upstream calls, cache hits, latency', async () => {
    const deps = testDeps();
    await runTool(deps, 'get_series', { refs: ['bls:CES6054160001'] });
    const again = await runTool(deps, 'get_series', { refs: ['bls:CES6054160001'] });
    expect(again.meta).toMatchObject({ tool: 'get_series', sources: ['bls'], upstream_calls: 1, cache_hits: 1 });
    expect(again.meta.latency_ms).toBeGreaterThanOrEqual(0);
  });
});

describe('credentials never leave the server', () => {
  const calls: Array<[string, Record<string, unknown>]> = [
    ['find_data', { query: 'unemployment' }],
    ['get_series', { refs: ['fred:UNRATE', 'fred:SP500', 'bls:CES6054160001', 'worldbank:NY.GDP.MKTP.CD:USA;GBR', 'fred:NOSUCH'] }],
    ['census_acs', { variables: ['median_household_income'], geography: 'state' }],
    ['bea_query', { dataset: 'Regional', params: { TableName: 'SAGDP1', LineCode: '1', GeoFips: 'STATE', Year: 'LAST5' } }],
    ['company_financials', { company: 'AAPL' }],
    ['company_filings', { company: 'AAPL' }],
    ['search_filings', { query: 'margin' }],
    ['list_sources', {}],
  ];

  it.each(calls)('%s', async (name, args) => {
    const deps = testDeps();
    const out = JSON.stringify(await runTool(deps, name, args));
    for (const secret of Object.values(SECRETS)) expect(out).not.toContain(secret);
    // ...while the requests upstream did carry them
    if (name === 'census_acs') expect(deps.fetch.calls.some((c) => c.url.includes(SECRETS.CENSUS_API_KEY))).toBe(true);
  });

  it('and every figure-bearing result is cited', async () => {
    for (const [name, args] of calls) {
      if (name === 'find_data' || name === 'list_sources') continue;
      const r = await runTool(testDeps(), name, args);
      expect(r.citations.length, name).toBeGreaterThan(0);
      for (const c of r.citations) {
        expect(c.url, name).toMatch(/^https:\/\//);
        expect(c.api_url, name).toMatch(/^https:\/\//);
        expect(c.retrieved_at, name).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(c.license, name).toBeTruthy();
      }
    }
  });
});

describe('publisher notices', () => {
  it('carries, quoted exactly, the notice each publisher used requires, and no other', async () => {
    const r = await runTool(testDeps(), 'get_series', { refs: ['fred:UNRATE', 'bls:CES6054160001'] });
    expect(r.notices).toEqual([
      'This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.',
      'BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov.',
    ]);
    const census = await runTool(testDeps(), 'census_acs', { variables: ['population'], geography: 'state' });
    expect(census.notices).toEqual(['This product uses the Census Bureau Data API but is not endorsed or certified by the Census Bureau.']);
    const bea = await runTool(testDeps(), 'bea_query', { dataset: 'Regional', params: { TableName: 'SAGDP1' } });
    expect(bea.notices[0]).toMatch(/^This product uses the Bureau of Economic Analysis \(BEA\) Data API/);
    const sec = await runTool(testDeps(), 'company_lookup', { query: 'AAPL' });
    expect(sec.notices).toEqual([]);
  });
});

describe('the catalog and third-party copyright', () => {
  it('offers no FRED series its owner holds copyright in', async () => {
    const { THIRD_PARTY_FRED } = await import('../src/catalog.js');
    const refs = CATALOG.flatMap((e) => (e.ref ? [e.ref] : []));
    for (const id of THIRD_PARTY_FRED) expect(refs).not.toContain(`fred:${id}`);
  });
});
