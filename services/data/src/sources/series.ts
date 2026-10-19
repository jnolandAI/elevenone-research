// Time series from FRED, BLS and the World Bank, in one shape. A ref names the
// source and the publisher's own id: fred:UNRATE, bls:LNS14000000,
// worldbank:NY.GDP.MKTP.CD:USA;GBR.

import { ToolError, invalid } from '../core/errors.js';
import type { ToolContext } from '../core/context.js';
import { SOURCES } from './registry.js';
import { CATALOG } from '../catalog.js';

const HOUR = 3_600_000;

export interface Observation {
  /** First day of the period, ISO 8601 */
  date: string;
  /** The period as its publisher names it: 2026-09, 2026-Q3, 2026 */
  period: string;
  /** null where the publisher reports no value; never filled in */
  value: number | null;
  preliminary?: boolean;
}

export interface Series {
  ref: string;
  source: 'fred' | 'bls' | 'worldbank';
  title: string;
  units: string | null;
  frequency: string | null;
  seasonal_adjustment: string | null;
  geography: string | null;
  last_updated: string | null;
  observations: Observation[];
  citation: string;
}

export interface SeriesQuery {
  /** YYYY, YYYY-MM or YYYY-MM-DD */
  start?: string;
  end?: string;
  /** Most recent N observations within the range */
  limit?: number;
}

const DEFAULT_LIMIT = 40;

export async function getSeries(ctx: ToolContext, ref: string, q: SeriesQuery = {}): Promise<Series[]> {
  const i = ref.indexOf(':');
  const prefix = i > 0 ? ref.slice(0, i).toLowerCase() : '';
  const rest = i > 0 ? ref.slice(i + 1).trim() : '';
  if (!rest) throw invalid(`"${ref}" is not a series ref. Use fred:<id>, bls:<id> or worldbank:<indicator>:<countries>.`);
  switch (prefix) {
    case 'fred':
      return [await fred(ctx, rest.toUpperCase(), q)];
    case 'bls':
      return [await bls(ctx, rest.toUpperCase(), q)];
    case 'worldbank':
    case 'wb': {
      const [indicator, countries] = rest.split(':');
      if (!indicator || !countries) throw invalid(`World Bank refs name an indicator and countries, e.g. worldbank:NY.GDP.MKTP.CD:USA;GBR`);
      return worldbank(ctx, indicator.toUpperCase(), countries.toUpperCase(), q);
    }
    default:
      throw invalid(`Unknown source "${prefix}" in "${ref}". get_series covers fred, bls and worldbank; use bea_query and census_acs for those sources.`);
  }
}

function recent<T>(xs: T[], limit: number | undefined): T[] {
  return xs.slice(-(limit ?? DEFAULT_LIMIT));
}

/** Observations whose period starts within [start, end]; `xs` must be oldest first. */
function inRange(xs: Observation[], q: SeriesQuery): Observation[] {
  const lo = q.start ? startDate(q.start) : undefined;
  const hi = q.end ? endDate(q.end) : undefined;
  return xs.filter((o) => (!lo || o.date >= lo) && (!hi || o.date <= hi));
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const t = String(v).replace(/,/g, '').trim();
  if (!t || t === '.' || t === '-' || t === '(NA)') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function periodOf(date: string, freq: string | undefined): string {
  const [y, m] = date.split('-');
  switch (freq) {
    case 'M':
      return `${y}-${m}`;
    case 'Q':
      return `${y}-Q${Math.floor((Number(m) - 1) / 3) + 1}`;
    case 'SA':
      return `${y}-H${Number(m) <= 6 ? 1 : 2}`;
    case 'A':
      return `${y}`;
    default:
      return date;
  }
}

function startDate(s: string): string {
  return s.length === 4 ? `${s}-01-01` : s.length === 7 ? `${s}-01` : s;
}
function endDate(s: string): string {
  if (s.length === 4) return `${s}-12-31`;
  if (s.length === 7) {
    const [y, m] = s.split('-').map(Number);
    return new Date(Date.UTC(y!, m!, 0)).toISOString().slice(0, 10);
  }
  return s;
}

// ---------------------------------------------------------------- FRED

interface FredSeries {
  id: string;
  title: string;
  frequency: string;
  frequency_short: string;
  units: string;
  seasonal_adjustment: string;
  last_updated: string;
  notes?: string;
}

const COPYRIGHT = /copyright|©|all rights reserved|used with permission/i;

async function fred(ctx: ToolContext, id: string, q: SeriesQuery): Promise<Series> {
  const key = ctx.config.fredKey;
  if (!key) throw new ToolError('not_configured', 'FRED is not configured on this server (FRED_API_KEY)', 'fred');
  const base = 'https://api.stlouisfed.org/fred';
  const auth = `api_key=${encodeURIComponent(key)}&file_type=json`;
  const enc = encodeURIComponent(id);
  const secretParams = ['api_key'];

  // The whole history, once: every range and limit a caller asks for is then a slice of one cached response.
  const obsUrl = `${base}/series/observations?series_id=${enc}&${auth}`;

  const [meta, obs, release] = await Promise.all([
    ctx.get<{ seriess: FredSeries[] }>({ source: 'fred', url: `${base}/series?series_id=${enc}&${auth}`, secretParams, ttlMs: HOUR }),
    ctx.get<{ observations: Array<{ date: string; value: string }> }>({ source: 'fred', url: obsUrl, secretParams, ttlMs: HOUR }),
    ctx
      .get<{ releases: Array<{ id: number; name: string }> }>({ source: 'fred', url: `${base}/series/release?series_id=${enc}&${auth}`, secretParams, ttlMs: 24 * HOUR })
      .catch(() => undefined),
  ]);
  const s = meta.data.seriess[0];
  if (!s) throw new ToolError('not_found', `FRED has no series ${id}`, 'fred');

  // FRED relays other agencies' data; the citation names the agency, as FRED asks.
  let publisher = SOURCES.fred.publisher;
  const releaseId = release?.data.releases[0]?.id;
  if (releaseId !== undefined) {
    const src = await ctx
      .get<{ sources: Array<{ name: string }> }>({
        source: 'fred',
        url: `${base}/release/sources?release_id=${releaseId}&${auth}`,
        secretParams,
        ttlMs: 24 * HOUR,
      })
      .catch(() => undefined);
    publisher = src?.data.sources[0]?.name ?? publisher;
  }

  const copyrighted = COPYRIGHT.test(s.notes ?? '');
  if (copyrighted) {
    ctx.note(`FRED ${id} carries third-party copyright (see its notes on FRED). Check the owner's terms before republishing the values.`);
  }

  const asOf = s.last_updated.slice(0, 10);
  const url = `https://fred.stlouisfed.org/series/${id}`;
  return {
    ref: `fred:${id}`,
    source: 'fred',
    title: s.title,
    units: s.units,
    frequency: s.frequency,
    seasonal_adjustment: s.seasonal_adjustment,
    geography: null,
    last_updated: asOf,
    observations: recent(
      inRange(
        obs.data.observations.map((o) => ({ date: o.date, period: periodOf(o.date, s.frequency_short), value: num(o.value) })),
        q,
      ),
      q.limit,
    ),
    citation: ctx.cite.add({
      source: 'fred',
      publisher,
      via: 'FRED, Federal Reserve Bank of St. Louis',
      dataset: release?.data.releases[0]?.name ?? 'FRED',
      title: s.title,
      identifier: id,
      url,
      api_url: obs.apiUrl,
      retrieved_at: obs.retrievedAt,
      as_of: asOf,
      units: s.units,
      license: copyrighted ? `Third-party copyright; see ${url}` : 'Public domain unless noted on the series page; FRED terms at https://fred.stlouisfed.org/legal/',
    }),
  };
}

export async function fredSearch(ctx: ToolContext, text: string, limit: number) {
  const key = ctx.config.fredKey;
  if (!key) return [];
  const u = new URL('https://api.stlouisfed.org/fred/series/search');
  u.searchParams.set('search_text', text);
  u.searchParams.set('api_key', key);
  u.searchParams.set('file_type', 'json');
  u.searchParams.set('order_by', 'popularity');
  u.searchParams.set('sort_order', 'desc');
  u.searchParams.set('limit', String(limit));
  const res = await ctx.get<{ seriess: Array<FredSeries & { popularity: number; observation_end: string }> }>({
    source: 'fred',
    url: u.toString(),
    secretParams: ['api_key'],
    ttlMs: 6 * HOUR,
  });
  return res.data.seriess.map((s) => ({
    ref: `fred:${s.id}`,
    title: s.title,
    frequency: s.frequency,
    units: s.units,
    seasonal_adjustment: s.seasonal_adjustment,
    data_through: s.observation_end,
    popularity: s.popularity,
  }));
}

// ---------------------------------------------------------------- BLS

interface BlsResponse {
  status: string;
  message?: string[];
  Results?: {
    series?: Array<{
      seriesID: string;
      catalog?: { series_title?: string; survey_name?: string; seasonality?: string; area?: string };
      data: Array<{ year: string; period: string; value: string; footnotes?: Array<{ code?: string; text?: string } | null> }>;
    }>;
  };
}

function blsPeriod(year: string, period: string): { date: string; period: string } | undefined {
  const kind = period[0];
  const n = Number(period.slice(1));
  if (kind === 'M' && n >= 1 && n <= 12) {
    const mm = String(n).padStart(2, '0');
    return { date: `${year}-${mm}-01`, period: `${year}-${mm}` };
  }
  if (kind === 'Q' && n >= 1 && n <= 4) return { date: `${year}-${String((n - 1) * 3 + 1).padStart(2, '0')}-01`, period: `${year}-Q${n}` };
  if (kind === 'S' && (n === 1 || n === 2)) return { date: `${year}-${n === 1 ? '01' : '07'}-01`, period: `${year}-H${n}` };
  if (kind === 'A' && n === 1) return { date: `${year}-01-01`, period: year };
  return undefined; // M13, Q05, S03: annual averages, which are not periods of the series
}

async function bls(ctx: ToolContext, id: string, q: SeriesQuery): Promise<Series> {
  const key = ctx.config.blsKey;
  const thisYear = new Date().getUTCFullYear();
  const endYear = q.end ? Number(q.end.slice(0, 4)) : thisYear;
  // BLS serves 20 years a request with a key and 10 without.
  const span = key ? 19 : 9;
  let startYear = q.start ? Number(q.start.slice(0, 4)) : endYear - 4;
  if (endYear - startYear > span) {
    ctx.note(`BLS serves ${span + 1} years per request${key ? '' : ' without a key'}; ${id} starts at ${endYear - span}, not ${startYear}.`);
    startYear = endYear - span;
  }

  const u = new URL(`https://api.bls.gov/publicAPI/v2/timeseries/data/${encodeURIComponent(id)}`);
  u.searchParams.set('startyear', String(startYear));
  u.searchParams.set('endyear', String(endYear));
  if (key) {
    u.searchParams.set('registrationkey', key);
    u.searchParams.set('catalog', 'true');
  }
  const res = await ctx.get<BlsResponse>({ source: 'bls', url: u.toString(), secretParams: ['registrationkey'], ttlMs: HOUR });
  const body = res.data;
  if (body.status !== 'REQUEST_SUCCEEDED') {
    const msg = body.message?.join(' ') || body.status;
    throw new ToolError(/threshold|limit/i.test(msg) ? 'rate_limited' : 'upstream_error', `BLS: ${msg}`, 'bls');
  }
  const s = body.Results?.series?.[0];
  if (!s || !s.data.length) {
    const msg = body.message?.find((m) => /does not exist|no data/i.test(m));
    throw new ToolError('not_found', `BLS has no data for ${id}${msg ? `: ${msg}` : ''}`, 'bls');
  }

  const known = CATALOG.find((c) => c.ref === `bls:${id}`);
  const observations: Observation[] = [];
  for (const d of s.data) {
    const p = blsPeriod(d.year, d.period);
    if (!p) continue;
    const preliminary = (d.footnotes ?? []).some((f) => f?.code === 'P');
    observations.push({ ...p, value: num(d.value), ...(preliminary ? { preliminary: true } : {}) });
  }
  observations.sort((a, b) => a.date.localeCompare(b.date));
  if (observations.some((o) => o.preliminary)) ctx.note(`BLS ${id}: values marked preliminary are revised in later releases.`);

  const ranged = inRange(observations, q);

  const title = s.catalog?.series_title ?? known?.title ?? id;
  return {
    ref: `bls:${id}`,
    source: 'bls',
    title,
    units: known?.units ?? null,
    frequency: known?.frequency ?? null,
    seasonal_adjustment: s.catalog?.seasonality ?? null,
    geography: s.catalog?.area ?? null,
    last_updated: null,
    observations: recent(ranged, q.limit),
    citation: ctx.cite.add({
      source: 'bls',
      publisher: SOURCES.bls.publisher,
      dataset: s.catalog?.survey_name ?? known?.dataset ?? 'BLS time series',
      title,
      identifier: id,
      url: `https://data.bls.gov/timeseries/${id}`,
      api_url: res.apiUrl,
      retrieved_at: res.retrievedAt,
      ...(known?.units ? { units: known.units } : {}),
      license: SOURCES.bls.license,
    }),
  };
}

// ---------------------------------------------------------------- World Bank

interface WbRow {
  indicator: { id: string; value: string };
  country: { id: string; value: string };
  countryiso3code: string;
  date: string;
  value: number | null;
}

interface WbIndicator {
  id: string;
  name: string;
  unit: string;
  source: { value: string };
  sourceOrganization?: string;
}

async function worldbank(ctx: ToolContext, id: string, countries: string, q: SeriesQuery): Promise<Series[]> {
  const codes = countries.split(/[;,]/).map((c) => c.trim()).filter(Boolean);
  if (!codes.every((c) => /^[A-Z0-9]{2,3}$/.test(c))) throw invalid(`World Bank country codes are ISO2 or ISO3 (USA, GB, EUU): "${countries}"`);
  const u = new URL(`https://api.worldbank.org/v2/country/${codes.join(';')}/indicator/${encodeURIComponent(id)}`);
  u.searchParams.set('format', 'json');
  // Every year at once (a few hundred rows a country), so ranges are slices of one cached response.
  u.searchParams.set('per_page', '20000');

  const [data, meta] = await Promise.all([
    ctx.get<[{ lastupdated?: string; message?: Array<{ value: string }> }, WbRow[] | null]>({ source: 'worldbank', url: u.toString(), ttlMs: 24 * HOUR }),
    ctx.get<[unknown, WbIndicator[] | null]>({
      source: 'worldbank',
      url: `https://api.worldbank.org/v2/indicator/${encodeURIComponent(id)}?format=json`,
      ttlMs: 24 * HOUR,
    }),
  ]);
  const [head, rows] = data.data;
  if (head?.message?.length) throw new ToolError('not_found', `World Bank: ${head.message.map((m) => m.value).join(' ')}`, 'worldbank');
  const ind = meta.data[1]?.[0];
  if (!ind) throw new ToolError('not_found', `World Bank has no indicator ${id}`, 'worldbank');
  if (!rows?.length) throw new ToolError('not_found', `World Bank has no ${id} data for ${codes.join(', ')}`, 'worldbank');

  const byCountry = new Map<string, WbRow[]>();
  for (const r of rows) {
    const k = r.countryiso3code || r.country.id;
    (byCountry.get(k) ?? byCountry.set(k, []).get(k)!).push(r);
  }

  return [...byCountry.entries()].map(([iso3, rs]) => {
    const iso2 = rs[0]!.country.id;
    const name = rs[0]!.country.value;
    const obs = rs
      .map((r) => ({ date: `${r.date}-01-01`, period: r.date, value: r.value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    // Recent years the World Bank has not filled yet come back as nulls; they are not observations
    while (obs.length && obs[obs.length - 1]!.value === null) obs.pop();
    return {
      ref: `worldbank:${id}:${iso3}`,
      source: 'worldbank' as const,
      title: ind.name,
      units: ind.unit || null,
      frequency: 'Annual',
      seasonal_adjustment: null,
      geography: name,
      last_updated: head?.lastupdated ?? null,
      observations: recent(inRange(obs, { ...q, ...(q.start ? { start: q.start.slice(0, 4) } : {}), ...(q.end ? { end: q.end.slice(0, 4) } : {}) }), q.limit),
      citation: ctx.cite.add({
        source: 'worldbank',
        publisher: SOURCES.worldbank.publisher,
        dataset: ind.source.value,
        title: `${ind.name}, ${name}`,
        identifier: id,
        url: `https://data.worldbank.org/indicator/${id}?locations=${iso2}`,
        api_url: data.apiUrl,
        retrieved_at: data.retrievedAt,
        ...(head?.lastupdated ? { as_of: head.lastupdated } : {}),
        license: SOURCES.worldbank.license,
      }),
    };
  });
}
