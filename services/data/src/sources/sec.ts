// SEC EDGAR: company lookup, filing lists, XBRL financial facts and full-text
// search. Every figure is cited to the filing it was taken from, by accession.

import { ToolError, invalid } from '../core/errors.js';
import type { ToolContext } from '../core/context.js';
import { SOURCES } from './registry.js';

const HOUR = 3_600_000;
const PUBLISHER = SOURCES.sec.publisher;
const LICENSE = SOURCES.sec.license;

interface TickerRow {
  cik_str: number;
  ticker: string;
  title: string;
}

export interface CompanyRef {
  cik: string;
  name: string;
  ticker?: string;
}

interface Fact {
  start?: string;
  end: string;
  val: number;
  accn: string;
  fy: number;
  fp: string;
  form: string;
  filed: string;
  frame?: string;
}

interface CompanyFacts {
  cik: number;
  entityName: string;
  facts: Record<string, Record<string, { label?: string; units: Record<string, Fact[]> }>>;
}

interface Submissions {
  cik: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  sic: string;
  sicDescription: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  website?: string;
  addresses?: { business?: { city?: string; stateOrCountry?: string } };
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
    };
  };
}

function headers(ctx: ToolContext): Record<string, string> {
  const ua = ctx.config.secUserAgent;
  if (!ua) throw new ToolError('not_configured', 'SEC EDGAR is not configured on this server (SEC_USER_AGENT)', 'sec');
  return { 'user-agent': ua };
}

export const pad = (cik: string | number) => String(cik).replace(/^0+/, '').padStart(10, '0');
const cikInt = (cik: string) => String(Number(cik));
const noDash = (accn: string) => accn.replace(/-/g, '');

export function filingIndexUrl(cik: string, accn: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cikInt(cik)}/${noDash(accn)}/${accn}-index.htm`;
}

function documentUrl(cik: string, accn: string, doc: string): string {
  return `https://www.sec.gov/Archives/edgar/data/${cikInt(cik)}/${noDash(accn)}/${doc}`;
}

async function tickers(ctx: ToolContext): Promise<TickerRow[]> {
  const res = await ctx.get<Record<string, TickerRow>>({
    source: 'sec',
    url: 'https://www.sec.gov/files/company_tickers.json',
    headers: headers(ctx),
    ttlMs: 24 * HOUR,
  });
  return Object.values(res.data);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Finds registrants by ticker, CIK, or name. Ticker and CIK are exact; names rank exact, then prefix, then contains-every-word. */
export async function findCompanies(ctx: ToolContext, query: string, limit = 10): Promise<CompanyRef[]> {
  const q = query.trim();
  if (!q) throw invalid('company query is empty');
  const rows = await tickers(ctx);

  if (/^\d{1,10}$/.test(q)) {
    const cik = pad(q);
    const row = rows.find((r) => pad(r.cik_str) === cik);
    return [{ cik, name: row?.title ?? `CIK ${cik}`, ...(row ? { ticker: row.ticker } : {}) }];
  }

  const t = q.toUpperCase().replace(/\./g, '-');
  const byTicker = rows.filter((r) => r.ticker.toUpperCase() === t);
  if (byTicker.length) return byTicker.slice(0, limit).map(toRef);

  const nq = norm(q);
  const words = nq.split(' ');
  const scored: Array<{ row: TickerRow; score: number; order: number }> = [];
  rows.forEach((row, order) => {
    const n = norm(row.title);
    const score = n === nq ? 3 : n.startsWith(nq) ? 2 : words.every((w) => n.split(' ').includes(w)) ? 1 : 0;
    if (score) scored.push({ row, score, order });
  });
  // company_tickers.json lists the largest registrants first; keep that order within a score
  scored.sort((a, b) => b.score - a.score || a.order - b.order);
  // one entry per CIK: share classes list the same company under several tickers
  const seen = new Set<number>();
  const out: CompanyRef[] = [];
  for (const s of scored) {
    if (seen.has(s.row.cik_str)) continue;
    seen.add(s.row.cik_str);
    out.push(toRef(s.row));
    if (out.length >= limit) break;
  }
  return out;
}

function toRef(r: TickerRow): CompanyRef {
  return { cik: pad(r.cik_str), name: r.title, ticker: r.ticker };
}

export async function resolveCompany(ctx: ToolContext, query: string): Promise<CompanyRef> {
  const [first] = await findCompanies(ctx, query, 1);
  if (!first) throw new ToolError('not_found', `No SEC registrant matches "${query}". Try a ticker, a CIK, or the legal name.`, 'sec');
  return first;
}

// ---------------------------------------------------------------- filings

export interface FilingsArgs {
  company: string;
  forms?: string[];
  limit?: number;
}

export async function filings(ctx: ToolContext, args: FilingsArgs) {
  const company = await resolveCompany(ctx, args.company);
  const res = await ctx.get<Submissions>({
    source: 'sec',
    url: `https://data.sec.gov/submissions/CIK${company.cik}.json`,
    headers: headers(ctx),
    ttlMs: HOUR,
  });
  const s = res.data;
  const r = s.filings.recent;
  const wanted = args.forms?.map((f) => f.toUpperCase());
  const limit = args.limit ?? 20;
  const out = [];
  for (let i = 0; i < r.accessionNumber.length && out.length < limit; i++) {
    const form = r.form[i] ?? '';
    if (wanted && !wanted.some((w) => form === w || form === `${w}/A`)) continue;
    const accn = r.accessionNumber[i]!;
    const filed = r.filingDate[i]!;
    const index = filingIndexUrl(company.cik, accn);
    out.push({
      form,
      filed,
      report_date: r.reportDate[i] || null,
      accession: accn,
      description: r.primaryDocDescription[i] || form,
      document_url: r.primaryDocument[i] ? documentUrl(company.cik, accn, r.primaryDocument[i]!) : index,
      index_url: index,
      citation: ctx.cite.add({
        source: 'sec',
        publisher: PUBLISHER,
        dataset: 'EDGAR filings',
        title: `${s.name} ${form} filed ${filed}`,
        identifier: accn,
        url: index,
        api_url: res.apiUrl,
        retrieved_at: res.retrievedAt,
        as_of: filed,
        license: LICENSE,
      }),
    });
  }
  return {
    company: {
      cik: company.cik,
      name: s.name,
      tickers: s.tickers,
      exchanges: s.exchanges,
      sic: s.sic,
      industry: s.sicDescription,
      fiscal_year_end: s.fiscalYearEnd,
      state_of_incorporation: s.stateOfIncorporation,
      headquarters: [s.addresses?.business?.city, s.addresses?.business?.stateOrCountry].filter(Boolean).join(', ') || null,
      website: s.website || null,
    },
    filings: out,
  };
}

// ---------------------------------------------------------------- financials

interface MetricDef {
  label: string;
  taxonomy: 'us-gaap' | 'dei';
  concepts: string[];
  unit: 'USD' | 'USD/shares' | 'shares';
  kind: 'duration' | 'instant';
}

export const METRICS: Record<string, MetricDef> = {
  revenue: {
    label: 'Revenue',
    taxonomy: 'us-gaap',
    concepts: [
      'RevenueFromContractWithCustomerExcludingAssessedTax',
      'Revenues',
      'RevenueFromContractWithCustomerIncludingAssessedTax',
      'SalesRevenueNet',
      'SalesRevenueServicesNet',
      'SalesRevenueGoodsNet',
    ],
    unit: 'USD',
    kind: 'duration',
  },
  cost_of_revenue: {
    label: 'Cost of revenue',
    taxonomy: 'us-gaap',
    concepts: ['CostOfGoodsAndServicesSold', 'CostOfRevenue', 'CostOfGoodsSold', 'CostOfServices'],
    unit: 'USD',
    kind: 'duration',
  },
  gross_profit: { label: 'Gross profit', taxonomy: 'us-gaap', concepts: ['GrossProfit'], unit: 'USD', kind: 'duration' },
  rd_expense: { label: 'Research and development expense', taxonomy: 'us-gaap', concepts: ['ResearchAndDevelopmentExpense'], unit: 'USD', kind: 'duration' },
  sga_expense: {
    label: 'Selling, general and administrative expense',
    taxonomy: 'us-gaap',
    concepts: ['SellingGeneralAndAdministrativeExpense'],
    unit: 'USD',
    kind: 'duration',
  },
  operating_income: { label: 'Operating income', taxonomy: 'us-gaap', concepts: ['OperatingIncomeLoss'], unit: 'USD', kind: 'duration' },
  net_income: { label: 'Net income', taxonomy: 'us-gaap', concepts: ['NetIncomeLoss', 'ProfitLoss'], unit: 'USD', kind: 'duration' },
  eps_diluted: { label: 'Diluted EPS', taxonomy: 'us-gaap', concepts: ['EarningsPerShareDiluted'], unit: 'USD/shares', kind: 'duration' },
  operating_cash_flow: {
    label: 'Net cash from operating activities',
    taxonomy: 'us-gaap',
    concepts: ['NetCashProvidedByUsedInOperatingActivities'],
    unit: 'USD',
    kind: 'duration',
  },
  capex: {
    label: 'Capital expenditure (purchases of PP&E)',
    taxonomy: 'us-gaap',
    concepts: ['PaymentsToAcquirePropertyPlantAndEquipment'],
    unit: 'USD',
    kind: 'duration',
  },
  total_assets: { label: 'Total assets', taxonomy: 'us-gaap', concepts: ['Assets'], unit: 'USD', kind: 'instant' },
  total_liabilities: { label: 'Total liabilities', taxonomy: 'us-gaap', concepts: ['Liabilities'], unit: 'USD', kind: 'instant' },
  stockholders_equity: {
    label: "Stockholders' equity",
    taxonomy: 'us-gaap',
    concepts: ['StockholdersEquity', 'StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest'],
    unit: 'USD',
    kind: 'instant',
  },
  cash: {
    label: 'Cash and cash equivalents',
    taxonomy: 'us-gaap',
    concepts: ['CashAndCashEquivalentsAtCarryingValue', 'CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents'],
    unit: 'USD',
    kind: 'instant',
  },
  long_term_debt: {
    label: 'Long-term debt',
    taxonomy: 'us-gaap',
    concepts: ['LongTermDebt', 'LongTermDebtNoncurrent'],
    unit: 'USD',
    kind: 'instant',
  },
  shares_outstanding: {
    label: 'Common shares outstanding (cover page)',
    taxonomy: 'dei',
    concepts: ['EntityCommonStockSharesOutstanding'],
    unit: 'shares',
    kind: 'instant',
  },
};

/**
 * Ratios this service computes from reported figures for the same period, and labels as computed.
 * A service firm often reports no gross profit line; gross margin then falls back to revenue less cost of revenue.
 */
export const DERIVED: Record<string, { label: string; numerator: string; denominator: string; fallback?: [string, string] }> = {
  gross_margin: { label: 'Gross margin', numerator: 'gross_profit', denominator: 'revenue', fallback: ['revenue', 'cost_of_revenue'] },
  operating_margin: { label: 'Operating margin', numerator: 'operating_income', denominator: 'revenue' },
  net_margin: { label: 'Net margin', numerator: 'net_income', denominator: 'revenue' },
};

export const DEFAULT_METRICS = [
  'revenue',
  'gross_profit',
  'operating_income',
  'net_income',
  'eps_diluted',
  'total_assets',
  'stockholders_equity',
  'operating_cash_flow',
];

export interface FinancialValue {
  period_start: string | null;
  period_end: string;
  fiscal_year: number;
  fiscal_period: string;
  value: number;
  concept: string;
  form: string;
  filed: string;
  accession: string;
  citation: string;
  restated?: { original_value: number; original_accession: string; original_filed: string };
}

export interface FinancialsArgs {
  company: string;
  metrics?: string[];
  period?: 'annual' | 'quarterly';
  limit?: number;
}

const DAY = 86_400_000;
const FILED_FORMS = /^(10-K|10-Q|20-F|40-F)/;

function inPeriod(f: Fact, kind: MetricDef['kind'], period: 'annual' | 'quarterly'): boolean {
  if (kind === 'instant') return !f.start;
  if (!f.start) return false;
  const days = (Date.parse(f.end) - Date.parse(f.start)) / DAY;
  return period === 'annual' ? days >= 350 && days <= 380 : days >= 80 && days <= 100;
}

export function seriesFor(
  facts: CompanyFacts,
  def: MetricDef,
  period: 'annual' | 'quarterly',
  limit: number,
): Array<Omit<FinancialValue, 'citation'>> {
  const groups = new Map<string, { concept: string; facts: Fact[] }>();
  for (const concept of def.concepts) {
    const all = facts.facts[def.taxonomy]?.[concept]?.units[def.unit] ?? [];
    const byPeriod = new Map<string, Fact[]>();
    for (const f of all) {
      if (!FILED_FORMS.test(f.form) || !inPeriod(f, def.kind, period)) continue;
      const key = `${f.start ?? ''}|${f.end}`;
      (byPeriod.get(key) ?? byPeriod.set(key, []).get(key)!).push(f);
    }
    // The first concept in the list that reports a period wins that period.
    for (const [key, fs] of byPeriod) if (!groups.has(key)) groups.set(key, { concept, facts: fs });
  }

  const out: Array<Omit<FinancialValue, 'citation'>> = [];
  for (const { concept, facts: fs } of groups.values()) {
    fs.sort((a, b) => a.filed.localeCompare(b.filed));
    const original = fs[0]!;
    const latest = fs[fs.length - 1]!;
    // A balance-sheet figure belongs to the annual series when the filing that first reported it was an annual one.
    if (def.kind === 'instant' && period === 'annual' && original.fp !== 'FY') continue;
    out.push({
      period_start: latest.start ?? null,
      period_end: latest.end,
      fiscal_year: original.fy,
      fiscal_period: original.fp,
      value: latest.val,
      concept: `${def.taxonomy}:${concept}`,
      form: latest.form,
      filed: latest.filed,
      accession: latest.accn,
      ...(original.val !== latest.val
        ? { restated: { original_value: original.val, original_accession: original.accn, original_filed: original.filed } }
        : {}),
    });
  }
  out.sort((a, b) => a.period_end.localeCompare(b.period_end));
  return out.slice(-limit);
}

export async function financials(ctx: ToolContext, args: FinancialsArgs) {
  const period = args.period ?? 'annual';
  const limit = args.limit ?? (period === 'annual' ? 5 : 8);
  const requested = args.metrics?.length ? args.metrics : DEFAULT_METRICS;
  const unknown = requested.filter((m) => !METRICS[m] && !DERIVED[m]);
  if (unknown.length) {
    throw invalid(`Unknown metric(s): ${unknown.join(', ')}. Known: ${[...Object.keys(METRICS), ...Object.keys(DERIVED)].join(', ')}`);
  }

  const company = await resolveCompany(ctx, args.company);
  const res = await ctx.get<CompanyFacts>({
    source: 'sec',
    url: `https://data.sec.gov/api/xbrl/companyfacts/CIK${company.cik}.json`,
    headers: headers(ctx),
    ttlMs: 6 * HOUR,
  });
  const facts = res.data;

  const cite = (v: Omit<FinancialValue, 'citation'>) =>
    ctx.cite.add({
      source: 'sec',
      publisher: PUBLISHER,
      dataset: 'EDGAR XBRL financial data',
      title: `${facts.entityName} ${v.form} filed ${v.filed}`,
      identifier: v.accession,
      url: filingIndexUrl(company.cik, v.accession),
      api_url: res.apiUrl,
      retrieved_at: res.retrievedAt,
      as_of: v.filed,
      license: LICENSE,
    });

  const reported: Record<string, ReturnType<typeof seriesFor>> = {};
  const need = new Set(
    requested.flatMap((m) => {
      const d = DERIVED[m];
      return d ? [d.numerator, d.denominator, ...(d.fallback ?? [])] : [m];
    }),
  );
  for (const m of need) reported[m] = seriesFor(facts, METRICS[m]!, period, limit);

  const metrics: Record<string, unknown> = {};
  for (const m of requested) {
    const derived = DERIVED[m];
    if (derived) {
      const key = (v: { period_start: string | null; period_end: string }) => `${v.period_start}|${v.period_end}`;
      const byPeriod = (metric: string) => new Map((reported[metric] ?? []).map((v) => [key(v), v]));
      const num = byPeriod(derived.numerator);
      const den = byPeriod(derived.denominator);
      const fbLess = derived.fallback ? byPeriod(derived.fallback[1]) : new Map();
      const periods = [...den.values()];
      const values = periods.flatMap((d) => {
        if (d.value === 0) return [];
        const n = num.get(key(d));
        const less = fbLess.get(key(d));
        const ratio = n ? n.value / d.value : less && derived.fallback ? (d.value - less.value) / d.value : undefined;
        if (ratio === undefined) return [];
        return [
          {
            period_start: d.period_start,
            period_end: d.period_end,
            fiscal_year: d.fiscal_year,
            fiscal_period: d.fiscal_period,
            value: Math.round(ratio * 1e6) / 1e6,
            formula: n ? `${derived.numerator} / ${derived.denominator}` : `(${derived.fallback![0]} - ${derived.fallback![1]}) / ${derived.denominator}`,
            citations: [...new Set([cite(d), cite((n ?? less)!)])],
          },
        ];
      });
      metrics[m] = { label: derived.label, unit: 'ratio', derived: true, values };
      if (!values.length) {
        ctx.note(`${derived.label} could not be computed: the company does not report ${derived.numerator}${derived.fallback ? ` or ${derived.fallback[1]}` : ''} alongside ${derived.denominator} for the same periods.`);
      } else if (values.some((v) => v.formula.startsWith('('))) {
        ctx.note(`${derived.label} is computed as revenue less cost of revenue where the company reports no gross profit line.`);
      }
      continue;
    }
    const def = METRICS[m]!;
    const values = reported[m]!.map((v) => ({ ...v, citation: cite(v) }));
    metrics[m] = { label: def.label, unit: def.unit, derived: false, values };
    if (!values.length) ctx.note(`${def.label}: no ${period} values tagged with ${def.concepts.join(' or ')}.`);
    if (values.some((v) => 'restated' in v && v.restated)) ctx.note(`${def.label}: some periods were restated in a later filing; the latest filed value is shown with the original alongside.`);
  }

  if (period === 'quarterly') {
    ctx.note('Fourth quarters are not filed on their own: a 10-K reports the full year. A Q4 figure is the annual less the first three quarters, which this service does not compute for you.');
  }
  return { company: { cik: company.cik, name: facts.entityName, ticker: company.ticker ?? null }, period, metrics };
}

// ---------------------------------------------------------------- full-text search

interface FtsHit {
  _id: string;
  _source: {
    ciks: string[];
    display_names: string[];
    form: string;
    file_date: string;
    period_ending?: string;
    adsh: string;
  };
}

export interface SearchFilingsArgs {
  query: string;
  forms?: string[];
  start_date?: string;
  end_date?: string;
  limit?: number;
}

export async function searchFilings(ctx: ToolContext, args: SearchFilingsArgs) {
  const u = new URL('https://efts.sec.gov/LATEST/search-index');
  u.searchParams.set('q', args.query);
  if (args.forms?.length) u.searchParams.set('forms', args.forms.join(','));
  if (args.start_date || args.end_date) {
    u.searchParams.set('dateRange', 'custom');
    u.searchParams.set('startdt', args.start_date ?? '2001-01-01');
    u.searchParams.set('enddt', args.end_date ?? new Date().toISOString().slice(0, 10));
  }
  const res = await ctx.get<{ hits: { total: { value: number }; hits: FtsHit[] } }>({
    source: 'sec',
    url: u.toString(),
    headers: headers(ctx),
    ttlMs: HOUR,
  });
  const limit = args.limit ?? 10;
  const hits = res.data.hits.hits.slice(0, limit).map((h) => {
    const [, file] = h._id.split(':');
    const cik = pad(h._source.ciks[0] ?? '0');
    const accn = h._source.adsh;
    // "GLOBAL AI, INC.  (GLAI)  (CIK 0001473490)" -> "GLOBAL AI, INC. (GLAI)"
    const company = (h._source.display_names[0] ?? `CIK ${cik}`).replace(/\s+\(CIK \d+\)$/, '').replace(/\s+/g, ' ').trim();
    return {
      company,
      cik,
      form: h._source.form,
      filed: h._source.file_date,
      period_ending: h._source.period_ending ?? null,
      accession: accn,
      document_url: file ? documentUrl(cik, accn, file) : filingIndexUrl(cik, accn),
      citation: ctx.cite.add({
        source: 'sec',
        publisher: PUBLISHER,
        dataset: 'EDGAR full-text search',
        title: `${company} ${h._source.form} filed ${h._source.file_date}`,
        identifier: accn,
        url: file ? documentUrl(cik, accn, file) : filingIndexUrl(cik, accn),
        api_url: res.apiUrl,
        retrieved_at: res.retrievedAt,
        as_of: h._source.file_date,
        license: LICENSE,
      }),
    };
  });
  return {
    query: args.query,
    total_matches: res.data.hits.total.value,
    search_url: `https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(args.query)}${args.forms?.length ? `&forms=${args.forms.join(',')}` : ''}`,
    hits,
  };
}
