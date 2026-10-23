// Checks each publisher credential in this environment with one live call, the way the
// service will use it. Prints which sources work and why any does not. Never prints a key.
//
//   npm run verify-keys

import { loadConfig } from '../src/config.js';
import { Upstream } from '../src/core/http.js';
import { ToolError } from '../src/core/errors.js';
import { SOURCES, type SourceId } from '../src/sources/registry.js';
import { runTool } from '../src/tools.js';

const ENV: Record<SourceId, string> = {
  sec: 'SEC_USER_AGENT',
  fred: 'FRED_API_KEY',
  bls: 'BLS_API_KEY',
  census: 'CENSUS_API_KEY',
  bea: 'BEA_API_KEY',
  worldbank: '(none needed)',
};

const CHECKS: Record<SourceId, [string, Record<string, unknown>, (d: any) => string]> = {
  sec: ['company_financials', { company: 'ACN', metrics: ['revenue'], limit: 1 }, (d) => `Accenture revenue, ${d.metrics.revenue.values[0]?.period_end}`],
  fred: ['get_series', { refs: ['fred:UNRATE'], limit: 1 }, (d) => `unemployment rate, ${d.series[0].observations.at(-1)?.period}`],
  bls: ['get_series', { refs: ['bls:CES6054160001'], limit: 1 }, (d) => `consulting employment, ${d.series[0].observations.at(-1)?.period}`],
  census: ['census_acs', { variables: ['median_household_income'], geography: 'state', codes: ['06'] }, (d) => `California median household income, ACS ${d.year}`],
  bea: ['bea_query', { dataset: 'Regional', params: { TableName: 'SAGDP1', LineCode: '1', GeoFips: '06000', Year: 'LAST5' }, limit: 5 }, (d) => `California real GDP, ${d.rows.at(-1)?.time_period}`],
  worldbank: ['get_series', { refs: ['worldbank:NY.GDP.MKTP.CD:USA'], limit: 1 }, (d) => `U.S. GDP, ${d.series[0].observations.at(-1)?.period}`],
};

let config;
try {
  config = loadConfig();
} catch (err) {
  console.log(`The environment has a malformed setting: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
const deps = { config, http: new Upstream({ timeoutMs: 20_000 }) };
let failed = 0;

for (const id of Object.keys(SOURCES) as SourceId[]) {
  const name = SOURCES[id].name.padEnd(26);
  const keyed = id === 'bls' ? Boolean(config.blsKey) : SOURCES[id].configured(config);
  if (!keyed && id !== 'bls') {
    console.log(`missing  ${name} set ${ENV[id]}`);
    failed++;
    continue;
  }
  const [tool, args, describe] = CHECKS[id];
  try {
    const r = await runTool(deps, tool, args);
    const d = r.data as any;
    if (d.errors?.length) throw new ToolError(d.errors[0].code, d.errors[0].message);
    console.log(`ok       ${name} ${describe(d)}${id === 'bls' && !config.blsKey ? ' (without a key: 25 requests a day; set BLS_API_KEY)' : ''}`);
    if (id === 'bls' && !config.blsKey) failed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const hint = /redirect|rejected key|api_key|UserID|invalid/i.test(msg) ? ` (check ${ENV[id]}, and that the key was activated from its email)` : '';
    console.log(`FAIL     ${name} ${msg}${hint}`);
    failed++;
  }
}

console.log(failed ? `\n${failed} to fix` : '\nevery source answers with this environment\'s credentials');
process.exit(failed ? 1 : 0);
