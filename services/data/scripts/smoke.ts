// Calls a running server the way a client would: over MCP, with a key, against
// live publishers. Exits non-zero if any check fails.
//
//   EO_URL=http://localhost:8787 EO_KEY=eo_... npm run smoke

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const url = new URL('/mcp', process.env.EO_URL ?? 'http://localhost:8787');
const key = process.env.EO_KEY;

const client = new Client({ name: 'eleven-one-smoke', version: '0' });
await client.connect(
  new StreamableHTTPClientTransport(url, key ? { requestInit: { headers: { authorization: `Bearer ${key}` } } } : undefined),
);

let failures = 0;
async function check(label: string, name: string, args: Record<string, unknown>, expect: (r: any) => string | undefined) {
  const started = performance.now();
  try {
    const res = (await client.callTool({ name, arguments: args })) as { isError?: boolean; content: Array<{ text: string }> };
    const body = JSON.parse(res.content[0]!.text);
    if (res.isError) {
      const skip = body.error?.code === 'not_configured';
      console.log(`${skip ? 'skip' : 'FAIL'}  ${label}: ${body.error?.message}`);
      if (!skip) failures++;
      return;
    }
    const problem = expect(body) ?? (body.citations?.length === 0 && name !== 'find_data' && name !== 'list_sources' ? 'no citations' : undefined);
    const ms = Math.round(performance.now() - started);
    console.log(`${problem ? 'FAIL' : 'ok  '}  ${label} (${ms}ms, ${body.meta.upstream_calls} upstream, ${body.meta.cache_hits} cached)${problem ? `: ${problem}` : ''}`);
    if (!problem && body.citations?.[0]) console.log(`      ${body.citations[0].text}`);
    if (problem) failures++;
  } catch (err) {
    console.log(`FAIL  ${label}: ${err instanceof Error ? err.message : err}`);
    failures++;
  }
}

const { tools } = await client.listTools();
console.log(`${tools.length} tools: ${tools.map((t) => t.name).join(', ')}\n`);

await check('find_data routes a plain-words question', 'find_data', { query: 'management consulting employment' }, (r) =>
  r.data.catalog.length ? undefined : 'no candidates',
);
await check('SEC: Accenture annual revenue and margins', 'company_financials', { company: 'ACN', metrics: ['revenue', 'gross_margin', 'operating_margin'], limit: 3 }, (r) =>
  r.data.metrics.revenue.values.length === 3 ? undefined : 'expected three years of revenue',
);
await check('SEC: recent 10-Ks mentioning "agentic AI"', 'search_filings', { query: '"agentic AI"', forms: ['10-K'], limit: 3 }, (r) =>
  r.data.hits.length ? undefined : 'no hits',
);
await check('World Bank: GDP growth, three economies', 'get_series', { refs: ['worldbank:NY.GDP.MKTP.KD.ZG:USA;DEU;IND'], limit: 3 }, (r) =>
  r.data.series.length === 3 ? undefined : `got ${r.data.series.length} series`,
);
await check('BLS: consulting services employment', 'get_series', { refs: ['bls:CES6054160001'], limit: 3 }, (r) =>
  r.data.series[0]?.observations.length ? undefined : 'no observations',
);
await check('FRED: unemployment rate', 'get_series', { refs: ['fred:UNRATE'], limit: 3 }, (r) =>
  r.data.series[0] ? undefined : (r.data.errors[0]?.message ?? 'no series'),
);
await check('Census: median household income, California counties', 'census_acs', { variables: ['median_household_income'], geography: 'county', state: 'CA', codes: ['075', '085'] }, (r) =>
  r.data.rows.length === 2 ? undefined : 'expected two counties',
);
await check('BEA: real GDP by state', 'bea_query', { dataset: 'Regional', params: { TableName: 'SAGDP1', LineCode: '1', GeoFips: 'STATE', Year: 'LAST5' }, limit: 5 }, (r) =>
  r.data.rows.length ? undefined : 'no rows',
);

await client.close();
console.log(failures ? `\n${failures} failed` : '\nall checks passed or skipped');
process.exit(failures ? 1 : 0);
