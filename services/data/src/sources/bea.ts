// Bureau of Economic Analysis: national accounts, regional accounts and GDP by
// industry. Values come back as BEA publishes them, with the unit and the power
// of ten BEA states, never rescaled.

import { ToolError, invalid } from '../core/errors.js';
import type { ToolContext } from '../core/context.js';
import { SOURCES } from './registry.js';

const HOUR = 3_600_000;

export const BEA_DATASETS = ['NIPA', 'NIUnderlyingDetail', 'Regional', 'GDPbyIndustry', 'FixedAssets', 'ITA', 'IntlServTrade'] as const;
export type BeaDataset = (typeof BEA_DATASETS)[number];

const LANDING: Partial<Record<BeaDataset, string>> = {
  NIPA: 'https://apps.bea.gov/iTable/?reqid=19&step=2&isuri=1&categories=survey',
  NIUnderlyingDetail: 'https://apps.bea.gov/iTable/?reqid=19&step=2&isuri=1&categories=underlying',
  Regional: 'https://apps.bea.gov/itable/?ReqID=70&step=1',
  GDPbyIndustry: 'https://www.bea.gov/data/gdp/gdp-industry',
};

const SUPPRESSED: Record<string, string> = {
  '(D)': 'withheld to avoid disclosing data of individual companies',
  '(NA)': 'not available',
  '(NM)': 'not meaningful',
  '(L)': 'less than half the unit shown',
  '(S)': 'did not meet publication standards',
  '(X)': 'not applicable',
};

export interface BeaArgs {
  dataset: BeaDataset;
  params: Record<string, string>;
  limit?: number;
}

type Row = Record<string, string | undefined>;

interface BeaResults {
  Statistic?: string;
  UnitOfMeasure?: string;
  PublicTable?: string;
  Data?: Row[];
  Notes?: Array<{ NoteRef: string; NoteText: string }>;
  Error?: { APIErrorDescription?: string; ErrorDetail?: { Description?: string } };
}

export async function beaQuery(ctx: ToolContext, a: BeaArgs) {
  const key = ctx.config.beaKey;
  if (!key) throw new ToolError('not_configured', 'BEA is not configured on this server (BEA_API_KEY)', 'bea');
  if (!BEA_DATASETS.includes(a.dataset)) throw invalid(`BEA dataset must be one of ${BEA_DATASETS.join(', ')}`);

  const u = new URL('https://apps.bea.gov/api/data');
  u.searchParams.set('UserID', key);
  u.searchParams.set('method', 'GetData');
  u.searchParams.set('DataSetName', a.dataset);
  for (const [k, v] of Object.entries(a.params)) {
    if (/^(userid|method|datasetname|resultformat)$/i.test(k)) continue;
    u.searchParams.set(k, String(v));
  }
  u.searchParams.set('ResultFormat', 'JSON');

  const res = await ctx.get<{ BEAAPI: { Results?: BeaResults | BeaResults[]; Error?: BeaResults['Error'] } }>({
    source: 'bea',
    url: u.toString(),
    secretParams: ['UserID'],
    ttlMs: 6 * HOUR,
  });
  const raw = res.data.BEAAPI.Results;
  const results = Array.isArray(raw) ? raw[0] : raw;
  const error = results?.Error ?? res.data.BEAAPI.Error;
  if (error || !results) {
    const msg = error?.ErrorDetail?.Description || error?.APIErrorDescription || 'no results';
    throw new ToolError(/key|userid/i.test(msg) ? 'upstream_error' : 'invalid_request', `BEA: ${msg}`, 'bea');
  }

  const data = results.Data ?? [];
  const tableName = a.params.TableName ?? a.params.TableID ?? '';
  const titleNote = results.Notes?.find((n) => n.NoteRef === tableName) ?? results.Notes?.[0];
  const title = results.PublicTable || titleNote?.NoteText || results.Statistic || `${a.dataset} ${tableName}`.trim();

  const flags = new Set<string>();
  const limit = a.limit ?? 500;
  const rows = data.slice(0, limit).map((r) => {
    const rawValue = (r.DataValue ?? '').trim();
    const flag = SUPPRESSED[rawValue];
    if (flag) flags.add(`${rawValue}: ${flag}`);
    const n = flag ? null : Number(rawValue.replace(/,/g, ''));
    const period = r.TimePeriod ?? [r.Year, r.Quarter && r.Quarter !== 'A' ? `Q${r.Quarter.replace(/^Q/, '')}` : undefined].filter(Boolean).join('-');
    return compact({
      time_period: period,
      geo_fips: r.GeoFips,
      geo_name: r.GeoName,
      line: r.LineNumber,
      series_code: r.SeriesCode,
      industry: r.Industry,
      description: r.LineDescription ?? r.IndustrYDescription ?? r.Description,
      value: n !== null && Number.isFinite(n) ? n : null,
      unit: r.CL_UNIT ?? results.UnitOfMeasure,
      unit_multiplier: r.UNIT_MULT !== undefined ? Number(r.UNIT_MULT) : undefined,
      note_ref: r.NoteRef,
    });
  });

  if (data.length > limit) ctx.note(`BEA returned ${data.length} rows; the first ${limit} are shown. Narrow the request (LineCode, GeoFips, Year) or raise limit.`);
  for (const f of flags) ctx.note(`BEA ${f}; returned as null.`);
  if (rows.some((r) => r.unit_multiplier)) {
    ctx.note('unit_multiplier is the power of ten BEA states for the value (6 = millions). Where the unit already says millions or billions, it describes the same scaling: do not apply it twice.');
  }

  const citation = ctx.cite.add({
    source: 'bea',
    publisher: SOURCES.bea.publisher,
    dataset: a.dataset === 'NIPA' ? 'National Income and Product Accounts' : a.dataset,
    title,
    ...(tableName ? { identifier: tableName } : {}),
    url: LANDING[a.dataset] ?? 'https://apps.bea.gov/iTable/',
    api_url: res.apiUrl,
    retrieved_at: res.retrievedAt,
    ...(results.UnitOfMeasure ? { units: results.UnitOfMeasure } : {}),
    license: SOURCES.bea.license,
  });

  return {
    dataset: a.dataset,
    table: tableName || null,
    title,
    statistic: results.Statistic ?? null,
    notes: (results.Notes ?? []).filter((n) => n !== titleNote).map((n) => `${n.NoteRef}: ${n.NoteText}`),
    total_rows: data.length,
    rows,
    citation,
  };
}

function compact<T extends Record<string, unknown>>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as Partial<T>;
}
