import { describe, expect, it } from 'vitest';
import { runTool } from '../src/tools.js';
import { latestAcsYear } from '../src/sources/census.js';
import { seriesFor } from '../src/sources/sec.js';
import { ROUTES, fixture, testDeps, type Route } from './helpers.js';

// Captured from SEC on 2026-10-19 (see test/fixtures/README.md); these values are Apple's as filed.
describe('SEC EDGAR', () => {
  it('finds a company by ticker, CIK and name', async () => {
    const deps = testDeps();
    const byTicker = await runTool(deps, 'company_lookup', { query: 'acn' });
    expect(byTicker.data).toEqual({ matches: [{ cik: '0001467373', name: 'Accenture plc', ticker: 'ACN' }] });
    const byCik = await runTool(deps, 'company_lookup', { query: '320193' });
    expect(byCik.data).toMatchObject({ matches: [{ cik: '0000320193', ticker: 'AAPL' }] });
    const byName = await runTool(deps, 'company_lookup', { query: 'booz allen' });
    expect(byName.data).toMatchObject({ matches: [{ ticker: 'BAH' }] });
  });

  it('returns annual revenue cited to the 10-K that reported it', async () => {
    const r = await runTool(testDeps(), 'company_financials', { company: 'AAPL', metrics: ['revenue'], limit: 2 });
    const rev = (r.data as any).metrics.revenue;
    expect(rev.derived).toBe(false);
    const fy25 = rev.values.find((v: any) => v.period_end === '2025-09-27');
    expect(fy25).toMatchObject({
      value: 416161000000,
      fiscal_year: 2025,
      fiscal_period: 'FY',
      form: '10-K',
      accession: '0000320193-25-000079',
      concept: 'us-gaap:RevenueFromContractWithCustomerExcludingAssessedTax',
    });
    const c = r.citations.find((x) => x.id === fy25.citation)!;
    expect(c.url).toBe('https://www.sec.gov/Archives/edgar/data/320193/000032019325000079/0000320193-25-000079-index.htm');
    expect(c.as_of).toBe('2025-10-31');
    expect(c.api_url).toBe('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json');
  });

  it('labels computed margins as derived and cites both inputs', async () => {
    const r = await runTool(testDeps(), 'company_financials', { company: 'AAPL', metrics: ['gross_margin'], limit: 1 });
    const gm = (r.data as any).metrics.gross_margin;
    expect(gm.derived).toBe(true);
    expect(gm.values[0].formula).toBe('gross_profit / revenue');
    expect(gm.values[0].value).toBeGreaterThan(0.4);
    expect(gm.values[0].value).toBeLessThan(0.5);
    expect(gm.values[0].citations.length).toBeGreaterThanOrEqual(1);
  });

  it('keeps the latest filed value and records the original when a period is restated', () => {
    const facts = {
      cik: 1,
      entityName: 'Example Co',
      facts: {
        'us-gaap': {
          Revenues: {
            units: {
              USD: [
                { start: '2024-01-01', end: '2024-12-31', val: 100, accn: 'A-24', fy: 2024, fp: 'FY', form: '10-K', filed: '2025-02-01' },
                { start: '2024-01-01', end: '2024-12-31', val: 95, accn: 'A-25', fy: 2025, fp: 'FY', form: '10-K', filed: '2026-02-01' },
                { start: '2024-01-01', end: '2024-06-30', val: 40, accn: 'Q-24', fy: 2024, fp: 'Q2', form: '10-Q', filed: '2024-08-01' },
              ],
            },
          },
        },
      },
    };
    const def = { label: 'Revenue', taxonomy: 'us-gaap' as const, concepts: ['Revenues'], unit: 'USD' as const, kind: 'duration' as const };
    const [v] = seriesFor(facts, def, 'annual', 5);
    expect(v).toMatchObject({ value: 95, accession: 'A-25', fiscal_year: 2024, restated: { original_value: 100, original_accession: 'A-24' } });
    // the six-month year-to-date figure is neither a year nor a quarter
    expect(seriesFor(facts, def, 'quarterly', 5)).toEqual([]);
  });

  it('notes that fourth quarters are not filed on their own', async () => {
    const r = await runTool(testDeps(), 'company_financials', { company: 'AAPL', metrics: ['revenue'], period: 'quarterly', limit: 4 });
    expect(r.notes.join(' ')).toMatch(/Fourth quarters are not filed/);
    expect((r.data as any).metrics.revenue.values.every((v: any) => v.form.startsWith('10-Q'))).toBe(true);
  });

  it('lists filings with document links, filtered by form', async () => {
    const r = await runTool(testDeps(), 'company_filings', { company: 'AAPL', forms: ['10-K', '10-Q'], limit: 3 });
    const d = r.data as any;
    expect(d.company).toMatchObject({ name: 'Apple Inc.', industry: 'Electronic Computers' });
    expect(d.filings.length).toBeGreaterThan(0);
    for (const f of d.filings) {
      expect(['10-K', '10-Q', '10-K/A', '10-Q/A']).toContain(f.form);
      expect(f.document_url).toMatch(/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/320193\//);
    }
  });

  it('maps full-text hits to their documents', async () => {
    const r = await runTool(testDeps(), 'search_filings', { query: '"gross margin compression"', forms: ['10-K'], limit: 2 });
    const d = r.data as any;
    expect(d.total_matches).toBeGreaterThan(0);
    expect(d.hits[0].document_url).toMatch(/^https:\/\/www\.sec\.gov\/Archives\/edgar\/data\/\d+\/\d{18}\/.+\.htm$/);
    expect(r.citations).toHaveLength(2);
  });

  it('declines without an SEC user agent rather than being refused by SEC', async () => {
    await expect(runTool(testDeps(ROUTES, { SEC_USER_AGENT: '' }), 'company_lookup', { query: 'AAPL' })).rejects.toMatchObject({ code: 'not_configured' });
  });
});

// FRED, BLS, Census and BEA fixtures are hand-written in the publishers' formats; their values are illustrative.
describe('FRED', () => {
  it('returns observations oldest first, a missing value as null, and credits the original agency', async () => {
    const r = await runTool(testDeps(), 'get_series', { refs: ['fred:UNRATE'], limit: 3 });
    const s = (r.data as any).series[0];
    expect(s.observations).toEqual([
      { date: '2026-07-01', period: '2026-07', value: 4.2 },
      { date: '2026-08-01', period: '2026-08', value: null },
      { date: '2026-09-01', period: '2026-09', value: 4.3 },
    ]);
    const c = r.citations[0]!;
    expect(c).toMatchObject({ publisher: 'U.S. Bureau of Labor Statistics', via: 'FRED, Federal Reserve Bank of St. Louis', dataset: 'Employment Situation', as_of: '2026-10-03' });
    expect(c.url).toBe('https://fred.stlouisfed.org/series/UNRATE');
  });

  it('serves every range of a series from one fetch of its history', async () => {
    const deps = testDeps();
    const a = await runTool(deps, 'get_series', { refs: ['fred:UNRATE'], start: '2026-08' });
    const b = await runTool(deps, 'get_series', { refs: ['fred:UNRATE'], end: '2026-07', limit: 1 });
    expect((a.data as any).series[0].observations.map((o: any) => o.period)).toEqual(['2026-08', '2026-09']);
    expect((b.data as any).series[0].observations.map((o: any) => o.period)).toEqual(['2026-07']);
    expect(deps.fetch.calls.filter((c) => c.url.includes('/series/observations')).length).toBe(1);
  });

  it('flags third-party copyright in the notes and the licence', async () => {
    const r = await runTool(testDeps(), 'get_series', { refs: ['fred:SP500'], limit: 1 });
    expect(r.notes.join(' ')).toMatch(/third-party copyright/);
    expect(r.citations[0]!.license).toMatch(/^Third-party copyright/);
  });
});

describe('BLS', () => {
  it('maps periods, drops annual averages, keeps gaps as null and flags preliminary values', async () => {
    const r = await runTool(testDeps(), 'get_series', { refs: ['bls:CES6054160001'] });
    const s = (r.data as any).series[0];
    expect(s.observations).toEqual([
      { date: '2026-06-01', period: '2026-06', value: 1898 },
      { date: '2026-07-01', period: '2026-07', value: null },
      { date: '2026-08-01', period: '2026-08', value: 1899.5, preliminary: true },
      { date: '2026-09-01', period: '2026-09', value: 1900, preliminary: true },
    ]);
    expect(s.title).toBe('All employees, management, scientific, and technical consulting services');
    expect(r.notes.join(' ')).toMatch(/preliminary/);
  });

  it('reports an exhausted daily quota as rate limited', async () => {
    const routes: Route[] = [[/api\.bls\.gov/, fixture('bls-threshold.json')]];
    const r = await runTool(testDeps(routes), 'get_series', { refs: ['bls:CES6054160001'] }).catch((e) => e);
    expect(r.code).toBe('rate_limited');
  });
});

describe('World Bank', () => {
  it('returns one series and one citation per country', async () => {
    const r = await runTool(testDeps(), 'get_series', { refs: ['worldbank:NY.GDP.MKTP.CD:USA;GBR'], start: '2021', end: '2023' });
    const series = (r.data as any).series;
    expect(series.map((s: any) => s.ref).sort()).toEqual(['worldbank:NY.GDP.MKTP.CD:GBR', 'worldbank:NY.GDP.MKTP.CD:USA']);
    expect(new Set(series.map((s: any) => s.citation)).size).toBe(2);
    const uk = series.find((s: any) => s.geography === 'United Kingdom');
    expect(uk.observations.map((o: any) => o.period)).toEqual(['2021', '2022', '2023']);
    expect(r.citations.find((c) => c.id === uk.citation)!.url).toBe('https://data.worldbank.org/indicator/NY.GDP.MKTP.CD?locations=GB');
    expect(r.citations[0]!.license).toBe('CC BY 4.0');
  });
});

describe('Census ACS', () => {
  it('pairs each estimate with its margin of error and nulls the sentinels', async () => {
    const r = await runTool(testDeps(), 'census_acs', { variables: ['median_household_income'], geography: 'state', year: 2024 });
    const d = r.data as any;
    expect(d.rows).toEqual([
      { name: 'California', geoid: '06', values: { median_household_income: { estimate: 100000, moe: 400 } } },
      { name: 'Wyoming', geoid: '56', values: { median_household_income: { estimate: null, moe: null } } },
    ]);
    expect(d.variables[0].label).toBe('Estimate > Median household income in the past 12 months (in 2024 inflation-adjusted dollars)');
    expect(r.citations[0]).toMatchObject({ identifier: 'B19013', url: 'https://data.census.gov/table/ACSDT5Y2024.B19013' });
    expect(r.notes.join(' ')).toMatch(/sentinels/);
    expect(r.notes.join(' ')).toMatch(/2020 to 2024/);
  });

  it('builds the geography clause the API expects', async () => {
    const deps = testDeps();
    await runTool(deps, 'census_acs', { variables: ['B19013_001E'], geography: 'county', state: 'CA', codes: ['075'], year: 2024 });
    const u = new URL(deps.fetch.calls.find((c) => /acs5\?/.test(c.url))!.url);
    expect(u.searchParams.get('for')).toBe('county:075');
    expect(u.searchParams.get('in')).toBe('state:06');
    expect(u.searchParams.get('get')).toBe('NAME,B19013_001E,B19013_001M');
  });

  it('knows when each survey releases', () => {
    expect(latestAcsYear('acs5', new Date('2026-10-19'))).toBe(2024);
    expect(latestAcsYear('acs5', new Date('2026-12-15'))).toBe(2025);
    expect(latestAcsYear('acs1', new Date('2026-10-19'))).toBe(2025);
  });
});

describe('BEA', () => {
  it('parses values with thousands separators, nulls suppressed cells and says why', async () => {
    const r = await runTool(testDeps(), 'bea_query', { dataset: 'Regional', params: { TableName: 'SAGDP1', LineCode: '1', GeoFips: 'STATE', Year: '2025' } });
    const d = r.data as any;
    expect(d.title).toBe('SAGDP1 State annual gross domestic product (GDP) summary');
    expect(d.rows[0]).toMatchObject({ geo_name: 'California', time_period: '2025', value: 3000000, unit_multiplier: 6 });
    expect(d.rows[1].value).toBeNull();
    expect(r.notes.join(' ')).toMatch(/\(D\): withheld to avoid disclosing/);
  });

  it('surfaces a BEA parameter error as the caller\'s to fix', async () => {
    const routes: Route[] = [[/apps\.bea\.gov/, fixture('bea-error.json')]];
    await expect(runTool(testDeps(routes), 'bea_query', { dataset: 'NIPA', params: {} })).rejects.toMatchObject({
      code: 'invalid_request',
      message: 'BEA: The dataset requested requires parameter TableName',
    });
  });
});

describe('SEC full-text search names', () => {
  it('drops the CIK suffix and the double spaces EDGAR pads display names with', async () => {
    const r = await runTool(testDeps(), 'search_filings', { query: 'margin', limit: 1 });
    const hit = (r.data as any).hits[0];
    expect(hit.company).not.toMatch(/\s{2}|\(CIK/);
    expect(r.citations[0]!.title).toBe(`${hit.company} ${hit.form} filed ${hit.filed}`);
  });
});
