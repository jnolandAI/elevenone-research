import { readFileSync } from 'node:fs';
import { loadConfig, type Config } from '../src/config.js';
import { Upstream, type FetchLike } from '../src/core/http.js';
import type { Deps } from '../src/tools.js';

export const fixture = (name: string): unknown => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));

/** Distinctive credentials, so a test can prove none of them reaches a result. */
export const SECRETS = {
  FRED_API_KEY: 'fredSECRETfredSECRETfredSECRET01',
  BLS_API_KEY: 'blsSECRETblsSECRETblsSECRET00002',
  CENSUS_API_KEY: 'censusSECRETcensusSECRETcensus03',
  BEA_API_KEY: 'beaSECRET-0000-4000-8000-beaSECRET',
};

export function testConfig(overrides: Record<string, string> = {}): Config {
  return loadConfig({ SEC_USER_AGENT: 'Eleven One Research tests@example.com', ...SECRETS, EO_ALLOW_ANONYMOUS: '1', ...overrides });
}

type Body = unknown | ((url: URL, init?: RequestInit) => Response | Promise<Response>);
export type Route = [RegExp, Body];

export interface FakeFetch extends FetchLike {
  calls: Array<{ url: string; init?: RequestInit }>;
}

/** A fetch that answers from fixtures by URL pattern, and records every request it was asked to make. */
export function fakeFetch(routes: Route[]): FakeFetch {
  const calls: FakeFetch['calls'] = [];
  const f = (async (input: string, init?: RequestInit) => {
    calls.push({ url: input, init });
    const url = new URL(input);
    for (const [re, body] of routes) {
      if (!re.test(input)) continue;
      if (typeof body === 'function') return (body as (u: URL, i?: RequestInit) => Response)(url, init);
      return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return new Response('not found', { status: 404 });
  }) as FakeFetch;
  f.calls = calls;
  return f;
}

export const ROUTES: Route[] = [
  [/sec\.gov\/files\/company_tickers\.json/, fixture('sec-tickers.json')],
  [/data\.sec\.gov\/submissions\/CIK0000320193/, fixture('sec-submissions-aapl.json')],
  [/data\.sec\.gov\/api\/xbrl\/companyfacts\/CIK0000320193/, fixture('sec-companyfacts-aapl.json')],
  [/efts\.sec\.gov\/LATEST\/search-index/, fixture('sec-fts.json')],
  [/fred\/series\/observations\?series_id=UNRATE/, fixture('fred-obs-unrate.json')],
  [/fred\/series\/observations\?series_id=SP500/, fixture('fred-obs-sp500.json')],
  [/fred\/series\/release\?/, fixture('fred-release.json')],
  [/fred\/release\/sources\?/, fixture('fred-release-sources.json')],
  [/fred\/series\/search\?/, fixture('fred-search.json')],
  [/fred\/series\?series_id=UNRATE/, fixture('fred-series-unrate.json')],
  [/fred\/series\?series_id=SP500/, fixture('fred-series-sp500.json')],
  [/api\.bls\.gov\/publicAPI\/v2\/timeseries\/data\/CES6054160001/, fixture('bls-ces6054160001.json')],
  [/api\.census\.gov\/data\/\d{4}\/acs\/acs5\/variables\/B19013_001E/, fixture('census-var-b19013.json')],
  [/api\.census\.gov\/data\/\d{4}\/acs\/acs5\?/, fixture('census-acs5-b19013-state.json')],
  [/apps\.bea\.gov\/api\/data/, fixture('bea-sagdp1.json')],
  [/api\.worldbank\.org\/v2\/country\//, fixture('worldbank-gdp.json')],
  [/api\.worldbank\.org\/v2\/indicator\//, fixture('worldbank-indicator.json')],
];

export function testDeps(routes: Route[] = ROUTES, overrides: Record<string, string> = {}): Deps & { fetch: FakeFetch } {
  const fetch = fakeFetch(routes);
  return { config: testConfig(overrides), http: new Upstream({ fetch, retryBaseMs: 1 }), fetch };
}
