// Census Bureau American Community Survey. Every estimate comes back with its
// margin of error, because a county median quoted without one overstates what
// the survey knows.

import { ToolError, invalid } from '../core/errors.js';
import type { ToolContext } from '../core/context.js';
import { SOURCES } from './registry.js';

const DAY = 86_400_000;

export const ACS_PRESETS: Record<string, { variable: string; label: string }> = {
  population: { variable: 'B01003_001E', label: 'Total population' },
  median_age: { variable: 'B01002_001E', label: 'Median age' },
  households: { variable: 'B11001_001E', label: 'Households' },
  median_household_income: { variable: 'B19013_001E', label: 'Median household income (inflation-adjusted dollars)' },
  per_capita_income: { variable: 'B19301_001E', label: 'Per capita income (inflation-adjusted dollars)' },
  below_poverty: { variable: 'B17001_002E', label: 'Population with income below the poverty level' },
  labor_force: { variable: 'B23025_003E', label: 'Civilian labor force, 16 and over' },
  unemployed: { variable: 'B23025_005E', label: 'Unemployed, civilian labor force' },
  median_home_value: { variable: 'B25077_001E', label: 'Median value, owner-occupied housing units (dollars)' },
  median_gross_rent: { variable: 'B25064_001E', label: 'Median gross rent (dollars)' },
};

export const STATE_FIPS: Record<string, string> = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16',
  IL: '17', IN: '18', IA: '19', KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29',
  MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35', NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42',
  RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53', WV: '54', WI: '55', WY: '56', PR: '72',
};

export type AcsGeography = 'us' | 'state' | 'county' | 'place' | 'metro' | 'zcta';

export interface AcsArgs {
  variables: string[];
  geography: AcsGeography;
  /** Postal abbreviation or two-digit FIPS. Required for place; narrows county. */
  state?: string;
  /** Geography codes at the chosen level: county FIPS, place code, CBSA code, ZCTA */
  codes?: string[];
  year?: number;
  survey?: 'acs5' | 'acs1';
  include_moe?: boolean;
}

/** The latest vintage a survey has released by `now`: 1-year in September, 5-year in December, of the following year. */
export function latestAcsYear(survey: 'acs5' | 'acs1', now = new Date()): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth() + 1;
  return survey === 'acs1' ? (m >= 10 ? y - 1 : y - 2) : m >= 12 ? y - 1 : y - 2;
}

function stateFips(s: string): string {
  const t = s.trim().toUpperCase();
  if (/^\d{2}$/.test(t)) return t;
  const f = STATE_FIPS[t];
  if (!f) throw invalid(`"${s}" is not a state abbreviation or FIPS code`);
  return f;
}

function geoClause(a: AcsArgs): { for: string; in?: string } {
  const codes = a.codes?.length ? a.codes.join(',') : '*';
  switch (a.geography) {
    case 'us':
      return { for: 'us:1' };
    case 'state':
      return { for: `state:${a.codes?.length ? a.codes.map(stateFips).join(',') : a.state ? stateFips(a.state) : '*'}` };
    case 'county':
      return a.state ? { for: `county:${codes}`, in: `state:${stateFips(a.state)}` } : { for: `county:${codes}` };
    case 'place':
      if (!a.state) throw invalid('place geography needs a state');
      return { for: `place:${codes}`, in: `state:${stateFips(a.state)}` };
    case 'metro':
      return { for: `metropolitan statistical area/micropolitan statistical area:${codes}` };
    case 'zcta':
      if (!a.codes?.length) throw invalid('zcta geography needs codes (ZIP Code Tabulation Areas, e.g. ["94110"])');
      return { for: `zip code tabulation area:${codes}` };
  }
}

const ESTIMATE = /^[A-Z]\d{5}[A-Z]?_\d{3}E$/;
// The Census writes cells it cannot estimate as large negative sentinels (-666666666 and kin).
const SENTINEL = -111_111_111;

export async function acs(ctx: ToolContext, a: AcsArgs) {
  const key = ctx.config.censusKey;
  if (!key) throw new ToolError('not_configured', 'Census is not configured on this server (CENSUS_API_KEY)', 'census');
  const survey = a.survey ?? 'acs5';
  const year = a.year ?? latestAcsYear(survey);
  const includeMoe = a.include_moe ?? true;

  const vars = a.variables.map((v) => {
    const preset = ACS_PRESETS[v];
    const code = preset?.variable ?? v.toUpperCase();
    if (!ESTIMATE.test(code)) throw invalid(`"${v}" is neither a preset (${Object.keys(ACS_PRESETS).join(', ')}) nor an ACS estimate code like B19013_001E`);
    return { name: preset ? v : code, code, preset: preset?.label };
  });
  if (!vars.length) throw invalid('name at least one variable');
  const get = ['NAME', ...vars.flatMap((v) => (includeMoe ? [v.code, v.code.replace(/E$/, 'M')] : [v.code]))];
  if (get.length > 50) throw invalid('the Census API takes at most 50 columns a request; ask for fewer variables');

  const base = `https://api.census.gov/data/${year}/acs/${survey}`;
  const geo = geoClause(a);
  const u = new URL(base);
  u.searchParams.set('get', get.join(','));
  u.searchParams.set('for', geo.for);
  if (geo.in) u.searchParams.set('in', geo.in);
  u.searchParams.set('key', key);

  const [table, ...metas] = await Promise.all([
    ctx.get<string[][]>({ source: 'census', url: u.toString(), secretParams: ['key'], ttlMs: 7 * DAY }).catch((err) => {
      if (err instanceof ToolError && err.code === 'not_found') {
        throw new ToolError('not_found', `ACS ${survey} ${year} is not published, or does not cover this geography. Try an earlier year.`, 'census');
      }
      throw err;
    }),
    ...vars.map((v) =>
      ctx
        .get<{ label?: string; concept?: string }>({
          source: 'census',
          url: `${base}/variables/${v.code}.json?key=${encodeURIComponent(key)}`,
          secretParams: ['key'],
          ttlMs: 30 * DAY,
        })
        .catch(() => undefined),
    ),
  ]);

  const [header, ...rows] = table.data;
  if (!header) throw new ToolError('upstream_error', 'Census returned an empty table', 'census');
  const geoCols = header.filter((h) => !get.includes(h));

  const surveyName = survey === 'acs5' ? '5-Year' : '1-Year';
  const citations = new Map<string, string>();
  const variables = vars.map((v, i) => {
    const meta = metas[i]?.data;
    const tableId = v.code.split('_')[0]!;
    if (!citations.has(tableId)) {
      citations.set(
        tableId,
        ctx.cite.add({
          source: 'census',
          publisher: SOURCES.census.publisher,
          dataset: `American Community Survey ${surveyName} Estimates, ${year}`,
          title: meta?.concept ? titleCase(meta.concept) : `Table ${tableId}`,
          identifier: tableId,
          url: `https://data.census.gov/table/ACSDT${survey === 'acs5' ? '5Y' : '1Y'}${year}.${tableId}`,
          api_url: table.apiUrl,
          retrieved_at: table.retrievedAt,
          as_of: `${year} vintage`,
          license: SOURCES.census.license,
        }),
      );
    }
    return {
      name: v.name,
      code: v.code,
      label: meta?.label ? meta.label.replace(/!!/g, ' > ').replace(/:$/, '') : (v.preset ?? v.code),
      citation: citations.get(tableId)!,
    };
  });

  let sentinels = false;
  const value = (raw: string | undefined) => {
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    if (n <= SENTINEL) {
      sentinels = true;
      return null;
    }
    return n;
  };

  const out = rows.map((r) => {
    const cell = (h: string) => r[header.indexOf(h)];
    return {
      name: cell('NAME') ?? '',
      geoid: geoCols.map(cell).join(''),
      values: Object.fromEntries(
        vars.map((v) => [
          v.name,
          { estimate: value(cell(v.code)), ...(includeMoe ? { moe: value(cell(v.code.replace(/E$/, 'M'))) } : {}) },
        ]),
      ),
    };
  });

  if (sentinels) ctx.note('Some cells came back as Census sentinels (the survey could not produce an estimate, or the margin is not applicable) and are returned as null.');
  if (includeMoe) ctx.note('ACS margins of error are at the 90% confidence level.');
  if (survey === 'acs5') ctx.note(`5-year estimates pool ${year - 4} to ${year}; they describe that period, not ${year} alone.`);

  return { survey: `acs/${survey}`, year, geography: a.geography, variables, rows: out };
}

function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
