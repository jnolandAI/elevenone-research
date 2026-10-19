// The tools, defined once. The MCP server and the REST API both serve exactly
// this list, so a call means the same thing whichever door it comes through.

import { z } from 'zod';
import { ToolContext, type ToolResult } from './core/context.js';
import { ToolError, invalid } from './core/errors.js';
import type { Upstream } from './core/http.js';
import type { Config } from './config.js';
import { CATALOG, type CatalogEntry } from './catalog.js';
import { SOURCES, sourceStatus, type SourceId } from './sources/registry.js';
import { fredSearch, getSeries } from './sources/series.js';
import { DERIVED, METRICS, filings, financials, findCompanies, searchFilings } from './sources/sec.js';
import { ACS_PRESETS, acs } from './sources/census.js';
import { BEA_DATASETS, beaQuery } from './sources/bea.js';

export interface ToolDef<S extends z.ZodRawShape = z.ZodRawShape> {
  name: string;
  title: string;
  description: string;
  input: S;
  run: (ctx: ToolContext, args: z.infer<z.ZodObject<S>>) => Promise<unknown>;
}

const define = <S extends z.ZodRawShape>(t: ToolDef<S>) => t as unknown as ToolDef;

const SOURCE_IDS = Object.keys(SOURCES) as [SourceId, ...SourceId[]];
const date = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'YYYY, YYYY-MM or YYYY-MM-DD');

// ---------------------------------------------------------------- find_data

const STOP = new Set(['the', 'a', 'an', 'of', 'for', 'in', 'on', 'and', 'or', 'to', 'by', 'us', 'u', 's', 'data', 'rate', 'what', 'is', 'how', 'much', 'many']);

function tokens(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9&-]+/)
    .filter((t) => t && !STOP.has(t));
}

const singular = (t: string) => (t.length > 3 && t.endsWith('s') ? t.slice(0, -1) : t);

export function scoreEntry(entry: CatalogEntry, toks: string[]): number {
  const kws = entry.keywords.map(singular);
  const title = entry.title.toLowerCase();
  let score = 0;
  for (const raw of toks) {
    const t = singular(raw);
    if (kws.includes(t)) score += 3;
    else if (t.length >= 4 && kws.some((k) => k.startsWith(t) || t.startsWith(k))) score += 1;
    if (title.includes(t)) score += 2;
  }
  return score;
}

function callFor(e: CatalogEntry) {
  return e.tool === 'get_series' ? { tool: e.tool, args: { refs: [e.ref] } } : { tool: e.tool, args: e.args ?? {} };
}

const findData = define({
  name: 'find_data',
  title: 'Find data',
  description:
    'Start here. Describe what you need in plain words ("consulting industry employment", "inflation", "median income by county", "Accenture revenue") and get back the tool call and arguments that fetch it, from a curated catalog of tier-1 public series plus a live search of FRED. Returns candidates, not data: run the suggested call next.',
  input: {
    query: z.string().min(2).describe('What you are looking for, in plain words'),
    sources: z.array(z.enum(SOURCE_IDS)).optional().describe('Limit to these sources'),
    limit: z.number().int().min(1).max(25).optional().describe('Candidates per list, default 8'),
  },
  run: async (ctx, a) => {
    const toks = tokens(a.query);
    const limit = a.limit ?? 8;
    const allowed = (s: SourceId) => !a.sources?.length || a.sources.includes(s);
    const catalog = CATALOG.filter((e) => allowed(e.source))
      .map((e) => ({ e, score: scoreEntry(e, toks) }))
      .filter((x) => x.score > 0)
      .sort((x, y) => y.score - x.score)
      .slice(0, limit)
      .map(({ e, score }) => ({
        title: e.title,
        source: e.source,
        ...callFor(e),
        ...(e.frequency ? { frequency: e.frequency } : {}),
        ...(e.units ? { units: e.units } : {}),
        score,
      }));

    let fred: Awaited<ReturnType<typeof fredSearch>> = [];
    if (allowed('fred')) {
      if (ctx.config.fredKey) {
        try {
          const listed = new Set(catalog.flatMap((c) => ('refs' in c.args ? c.args.refs : [])));
          fred = (await fredSearch(ctx, a.query, limit)).filter((f) => !listed.has(f.ref));
        } catch (err) {
          ctx.note(`FRED search did not answer (${err instanceof Error ? err.message : 'unknown error'}); catalog results only.`);
        }
      } else {
        ctx.note('FRED search is not configured on this server; catalog results only.');
      }
    }
    if (!catalog.length && !fred.length) ctx.note('Nothing matched. Try broader words, or name the agency\'s own term (CPI, payrolls, ACS).');
    return {
      query: a.query,
      catalog,
      fred_search: fred.map((f) => ({ ...f, tool: 'get_series', args: { refs: [f.ref] } })),
    };
  },
});

// ---------------------------------------------------------------- the rest

const getSeriesTool = define({
  name: 'get_series',
  title: 'Get time series',
  description:
    'Fetch one or more time series, in parallel, each with its citation. Refs: fred:<series id> (e.g. fred:UNRATE), bls:<series id> (e.g. bls:CES6054160001), worldbank:<indicator>:<ISO countries separated by ;> (e.g. worldbank:NY.GDP.MKTP.CD:USA;DEU). Values are exactly as published: a missing value is null, never filled in. Returns the most recent `limit` observations in the range.',
  input: {
    refs: z.array(z.string()).min(1).max(10).describe('Series refs, up to 10'),
    start: date.optional().describe('Earliest period, YYYY or YYYY-MM or YYYY-MM-DD'),
    end: date.optional().describe('Latest period'),
    limit: z.number().int().min(1).max(1000).optional().describe('Most recent N observations per series, default 40'),
  },
  run: async (ctx, a) => {
    const settled = await Promise.allSettled(a.refs.map((ref) => getSeries(ctx, ref, a)));
    const series = settled.flatMap((s) => (s.status === 'fulfilled' ? s.value : []));
    const errors = settled.flatMap((s, i) =>
      s.status === 'rejected' ? [{ ref: a.refs[i], ...(s.reason instanceof ToolError ? s.reason.toJSON().error : { code: 'upstream_error', message: String(s.reason) }) }] : [],
    );
    if (!series.length && settled[0]?.status === 'rejected') throw settled[0].reason;
    return { series, errors };
  },
});

const companyLookup = define({
  name: 'company_lookup',
  title: 'Look up a company',
  description: 'Find SEC registrants by ticker, CIK, or name. Returns CIKs to pass to the other company tools. Covers companies with listed securities; for others pass the CIK directly.',
  input: {
    query: z.string().min(1).describe('Ticker (ACN), CIK (1467373), or name (Accenture)'),
    limit: z.number().int().min(1).max(25).optional(),
  },
  run: async (ctx, a) => ({ matches: await findCompanies(ctx, a.query, a.limit ?? 10) }),
});

const companyFinancials = define({
  name: 'company_financials',
  title: 'Company financials',
  description: `Reported financial statement figures for an SEC registrant, from its XBRL filings. Each value is cited to the 10-K or 10-Q it came from, shows the XBRL concept used, and flags restatements. Margins are computed from two reported figures for the same period and labelled derived. Metrics: ${Object.keys(METRICS).join(', ')}; derived: ${Object.keys(DERIVED).join(', ')}. US GAAP filers only for now.`,
  input: {
    company: z.string().min(1).describe('Ticker, CIK, or name'),
    metrics: z.array(z.string()).optional().describe('Defaults to revenue, gross_profit, operating_income, net_income, eps_diluted, total_assets, stockholders_equity, operating_cash_flow'),
    period: z.enum(['annual', 'quarterly']).optional().describe('Default annual'),
    limit: z.number().int().min(1).max(40).optional().describe('Most recent N periods, default 5 annual or 8 quarterly'),
  },
  run: (ctx, a) => financials(ctx, a),
});

const companyFilings = define({
  name: 'company_filings',
  title: 'Company filings',
  description: 'A registrant\'s profile (industry SIC, fiscal year end, headquarters) and its recent filings, each with links to the document and the filing index.',
  input: {
    company: z.string().min(1).describe('Ticker, CIK, or name'),
    forms: z.array(z.string()).optional().describe('Filter, e.g. ["10-K","10-Q","8-K","DEF 14A"]; amendments are included'),
    limit: z.number().int().min(1).max(100).optional().describe('Default 20'),
  },
  run: (ctx, a) => filings(ctx, a),
});

const searchFilingsTool = define({
  name: 'search_filings',
  title: 'Search filing text',
  description:
    'Full-text search of SEC filings since 2001. Put exact phrases in double quotes ("gross margin compression"). Useful for finding which companies discuss a risk, a customer, a technology or a competitor. Each hit is cited to its filing.',
  input: {
    query: z.string().min(2),
    forms: z.array(z.string()).optional().describe('e.g. ["10-K"]'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    limit: z.number().int().min(1).max(100).optional().describe('Default 10'),
  },
  run: (ctx, a) => searchFilings(ctx, a),
});

const censusAcs = define({
  name: 'census_acs',
  title: 'Census ACS',
  description: `American Community Survey estimates with margins of error, by US, state, county, place, metro (CBSA) or ZIP code tabulation area. Variables are presets (${Object.keys(ACS_PRESETS).join(', ')}) or ACS estimate codes such as B19013_001E. Defaults to the latest 5-year release.`,
  input: {
    variables: z.array(z.string()).min(1).max(24),
    geography: z.enum(['us', 'state', 'county', 'place', 'metro', 'zcta']),
    state: z.string().optional().describe('Postal code or FIPS; required for place, narrows county'),
    codes: z.array(z.string()).optional().describe('Geography codes at that level: county FIPS ("075"), CBSA ("41860"), ZCTA ("94110")'),
    year: z.number().int().min(2005).max(2100).optional(),
    survey: z.enum(['acs5', 'acs1']).optional().describe('acs5 (default) covers every geography; acs1 only areas of 65,000+'),
    include_moe: z.boolean().optional().describe('Default true'),
  },
  run: (ctx, a) => acs(ctx, a),
});

const beaQueryTool = define({
  name: 'bea_query',
  title: 'BEA query',
  description:
    'Query the Bureau of Economic Analysis. dataset NIPA takes TableName (T10101 real GDP percent change, T10105 GDP, T20100 personal income), Frequency (A, Q, M) and Year (comma list, or X for all). Regional takes TableName (SAGDP1 state GDP, SAINC1 state income, CAINC1 county income), LineCode, GeoFips (STATE, COUNTY, MSA, or FIPS codes) and Year (LAST5, ALL, or a list). GDPbyIndustry takes TableID, Frequency, Year and Industry (ALL). Values are as published, with the unit and power-of-ten multiplier BEA states.',
  input: {
    dataset: z.enum(BEA_DATASETS),
    params: z.record(z.string(), z.string()).describe('BEA parameters for the dataset, e.g. {"TableName":"T10101","Frequency":"Q","Year":"2025"}'),
    limit: z.number().int().min(1).max(5000).optional().describe('Rows returned, default 500'),
  },
  run: (ctx, a) => beaQuery(ctx, a),
});

const listSources = define({
  name: 'list_sources',
  title: 'List sources',
  description: 'The publishers this service draws on, what each covers, its licence, and whether it is available on this server right now.',
  input: {},
  run: async (ctx) => ({ sources: sourceStatus(ctx.config) }),
});

export const TOOLS: ToolDef[] = [
  findData,
  getSeriesTool,
  companyLookup,
  companyFinancials,
  companyFilings,
  searchFilingsTool,
  censusAcs,
  beaQueryTool,
  listSources,
];

export const TOOL_INDEX = new Map(TOOLS.map((t) => [t.name, t]));

export interface Deps {
  config: Config;
  http: Upstream;
}

/** Validates arguments and runs one tool. Throws ToolError; anything else is a bug. `refresh` bypasses cached answers. */
export async function runTool(deps: Deps, name: string, rawArgs: unknown, opts: { refresh?: boolean } = {}): Promise<ToolResult> {
  const tool = TOOL_INDEX.get(name);
  if (!tool) throw new ToolError('not_found', `No tool named "${name}". Tools: ${TOOLS.map((t) => t.name).join(', ')}`);
  const parsed = z.object(tool.input).strict().safeParse(rawArgs ?? {});
  if (!parsed.success) throw invalid(`${name}: ${z.prettifyError(parsed.error)}`);
  const started = performance.now();
  const ctx = new ToolContext(deps.config, deps.http, opts.refresh);
  const data = await tool.run(ctx, parsed.data);
  return ctx.finish(name, data, started);
}

/** Server-level guidance an MCP client hands its model. */
export const INSTRUCTIONS = `Eleven One serves cited figures from tier-1 public sources: SEC EDGAR, FRED, BLS, Census ACS, BEA and the World Bank.

Call find_data first when you do not already know the exact series or tool. Every result carries a citations array; each value points at one by id ("c1"). When you report a figure, cite it, using the citation's text or its url. Report values as returned: do not round away precision the publisher gave, do not fill nulls, and pass on anything in notes (preliminary values, restatements, margins of error, copyright). Where a value is marked derived, say it was computed and from what.`;
