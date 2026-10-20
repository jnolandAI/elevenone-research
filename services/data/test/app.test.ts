import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { hashKey, newKey } from '../src/auth.js';
import { testDeps } from './helpers.js';

const KEY = newKey();

function app(overrides: Record<string, string> = {}) {
  return createApp(testDeps(undefined, { EO_ALLOW_ANONYMOUS: '0', EO_API_KEY_HASHES: `acme:${hashKey(KEY)}`, ...overrides }), () => {});
}

const auth = { authorization: `Bearer ${KEY}` };
const json = { 'content-type': 'application/json' };
const mcpHeaders = { ...auth, ...json, accept: 'application/json, text/event-stream' };

describe('REST', () => {
  it('needs a key, refuses a wrong one, and accepts a right one', async () => {
    const a = app();
    expect((await a.request('/v1/sources')).status).toBe(401);
    expect((await a.request('/v1/sources', { headers: { authorization: 'Bearer eo_wrong' } })).status).toBe(401);
    expect((await a.request('/v1/sources', { headers: auth })).status).toBe(200);
    expect((await a.request('/v1/sources', { headers: { 'x-api-key': KEY } })).status).toBe(200);
  });

  it('leaves health open, for the load balancer', async () => {
    const res = await app().request('/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true });
  });

  it('runs a tool and maps its errors to HTTP statuses', async () => {
    const a = app();
    const ok = await a.request('/v1/tools/company_lookup', { method: 'POST', headers: { ...auth, ...json }, body: JSON.stringify({ query: 'AAPL' }) });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ data: { matches: [{ ticker: 'AAPL' }] }, meta: { tool: 'company_lookup' } });

    const bad = await a.request('/v1/tools/get_series', { method: 'POST', headers: { ...auth, ...json }, body: JSON.stringify({ refs: [] }) });
    expect(bad.status).toBe(400);
    const missing = await a.request('/v1/tools/nope', { method: 'POST', headers: { ...auth, ...json }, body: '{}' });
    expect(missing.status).toBe(404);
    const notJson = await a.request('/v1/tools/list_sources', { method: 'POST', headers: { ...auth, ...json }, body: 'nope' });
    expect(notJson.status).toBe(400);
  });

  it('publishes every tool with a JSON Schema', async () => {
    const res = await app().request('/v1/tools', { headers: auth });
    const body = (await res.json()) as { tools: Array<{ name: string; input_schema: { type: string } }> };
    expect(body.tools.map((t) => t.name)).toContain('get_series');
    for (const t of body.tools) expect(t.input_schema.type).toBe('object');
  });

  it('limits each key per minute', async () => {
    const a = app({ EO_RATE_PER_MINUTE: '2' });
    const statuses = [];
    for (let i = 0; i < 3; i++) statuses.push((await a.request('/v1/sources', { headers: auth })).status);
    expect(statuses).toEqual([200, 200, 429]);
  });
});

describe('MCP over streamable HTTP', () => {
  const rpc = (a: ReturnType<typeof app>, body: unknown, headers: Record<string, string> = mcpHeaders) =>
    a.request('/mcp', { method: 'POST', headers, body: JSON.stringify(body) });

  it('needs the same key as REST', async () => {
    const res = await rpc(app(), { jsonrpc: '2.0', id: 1, method: 'tools/list' }, { ...json, accept: 'application/json, text/event-stream' });
    expect(res.status).toBe(401);
  });

  it('initializes, lists the tools, and calls one', async () => {
    const a = app();
    const init = await rpc(a, {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } },
    });
    expect(init.status).toBe(200);
    const initBody = (await init.json()) as any;
    expect(initBody.result.serverInfo.name).toBe('eleven-one-data');
    expect(initBody.result.instructions).toMatch(/cite it/);

    const list = (await (await rpc(a, { jsonrpc: '2.0', id: 2, method: 'tools/list' })).json()) as any;
    const names = list.result.tools.map((t: any) => t.name);
    expect(names).toEqual(['find_data', 'get_series', 'company_lookup', 'company_financials', 'company_filings', 'search_filings', 'census_acs', 'bea_query', 'list_sources']);
    expect(list.result.tools.every((t: any) => t.annotations.readOnlyHint)).toBe(true);

    const call = (await (
      await rpc(a, { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_series', arguments: { refs: ['fred:UNRATE'] } } })
    ).json()) as any;
    const result = JSON.parse(call.result.content[0].text);
    expect(result.data.series[0].ref).toBe('fred:UNRATE');
    expect(result.citations[0].url).toBe('https://fred.stlouisfed.org/series/UNRATE');
  });

  it('returns a tool error as a result the model can read, not a protocol failure', async () => {
    const call = (await (
      await rpc(app({ FRED_API_KEY: '' }), { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_series', arguments: { refs: ['fred:UNRATE'] } } })
    ).json()) as any;
    expect(call.result.isError).toBe(true);
    expect(JSON.parse(call.result.content[0].text).error.code).toBe('not_configured');
  });

  it('turns away GET, having no stream to offer', async () => {
    expect((await app().request('/mcp', { headers: auth })).status).toBe(405);
  });
});

describe('ChatGPT domain verification', () => {
  it('serves the challenge token when one is set, and nothing when not', async () => {
    expect((await app({ EO_OPENAI_APPS_CHALLENGE: 'tok-123' }).request('/.well-known/openai-apps-challenge')).status).toBe(200);
    expect(await (await app({ EO_OPENAI_APPS_CHALLENGE: 'tok-123' }).request('/.well-known/openai-apps-challenge')).text()).toBe('tok-123');
    expect((await app().request('/.well-known/openai-apps-challenge')).status).toBe(404);
  });
});
