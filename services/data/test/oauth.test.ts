import { createHash, randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { OAuthClientProvider } from '@modelcontextprotocol/sdk/client/auth.js';
import type { OAuthClientInformationMixed, OAuthClientMetadata, OAuthTokens } from '@modelcontextprotocol/sdk/shared/auth.js';
import { createApp } from '../src/app.js';
import { hashKey, newKey } from '../src/auth.js';
import { Signer, redirectAllowed } from '../src/oauth.js';
import { testDeps } from './helpers.js';

const BASE = 'https://data.test';
const KEY = newKey();
const SECRET = 'test-oauth-secret-test-oauth-secret-0123';
const CALLBACK = 'https://client.test/callback';

function setup(opts: { cimd?: Record<string, unknown>; now?: () => number; env?: Record<string, string> } = {}) {
  const deps = testDeps(undefined, {
    EO_ALLOW_ANONYMOUS: '0',
    EO_API_KEY_HASHES: `acme:${hashKey(KEY)}`,
    EO_OAUTH_SECRET: SECRET,
    EO_PUBLIC_URL: BASE,
    ...opts.env,
  });
  const cimdFetch = async (url: string) =>
    opts.cimd && url === opts.cimd.client_id ? Response.json(opts.cimd) : new Response('nope', { status: 404 });
  const app = createApp(deps, () => {}, { fetch: cimdFetch, ...(opts.now ? { now: opts.now } : {}) });
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> =>
    app.request(input instanceof Request ? input : String(input), init);
  return { app, deps, fetch };
}

/** The person at the browser: open the sign-in page, enter the key, return the redirect the browser would follow. */
async function signIn(fetch: ReturnType<typeof setup>['fetch'], authorizeUrl: URL | string, key = KEY): Promise<URL> {
  const page = await fetch(authorizeUrl);
  expect(page.status).toBe(200);
  const html = await page.text();
  const request = html.match(/name="request" value="([^"]+)"/)![1]!;
  const res = await fetch(`${BASE}/authorize`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ request, key, action: 'allow' }).toString(),
  });
  expect(res.status).toBe(302);
  return new URL(res.headers.get('location')!);
}

class MemoryProvider implements OAuthClientProvider {
  info?: OAuthClientInformationMixed;
  saved?: OAuthTokens;
  verifier = '';
  authorizationUrl?: URL;
  constructor(readonly clientMetadataUrl?: string) {}
  get redirectUrl() {
    return CALLBACK;
  }
  get clientMetadata(): OAuthClientMetadata {
    return { client_name: 'Test Client', redirect_uris: [CALLBACK], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' };
  }
  clientInformation() {
    return this.info;
  }
  saveClientInformation(i: OAuthClientInformationMixed) {
    this.info = i;
  }
  tokens() {
    return this.saved;
  }
  saveTokens(t: OAuthTokens) {
    this.saved = t;
  }
  redirectToAuthorization(url: URL) {
    this.authorizationUrl = url;
  }
  saveCodeVerifier(v: string) {
    this.verifier = v;
  }
  codeVerifier() {
    return this.verifier;
  }
}

/** The MCP SDK's own client, run through the whole flow: 401, discovery, registration, sign-in, token, call. */
async function connectWithSdk(env: ReturnType<typeof setup>, provider: MemoryProvider) {
  const url = new URL(`${BASE}/mcp`);
  const first = new StreamableHTTPClientTransport(url, { authProvider: provider, fetch: env.fetch });
  await expect(new Client({ name: 't', version: '0' }).connect(first)).rejects.toThrow(/Unauthorized/i);
  expect(provider.authorizationUrl).toBeDefined();

  const back = await signIn(env.fetch, provider.authorizationUrl!);
  expect(back.origin + back.pathname).toBe(CALLBACK);
  expect(back.searchParams.get('iss')).toBe(BASE);
  await first.finishAuth(back.searchParams.get('code')!);

  const client = new Client({ name: 't', version: '0' });
  await client.connect(new StreamableHTTPClientTransport(url, { authProvider: provider, fetch: env.fetch }));
  return client;
}

describe('OAuth discovery', () => {
  it('answers an unauthenticated MCP request with a challenge naming the resource metadata', async () => {
    const { fetch } = setup();
    const res = await fetch(`${BASE}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBe(`Bearer resource_metadata="${BASE}/.well-known/oauth-protected-resource/mcp", scope="data:read"`);
  });

  it('publishes protected-resource and authorization-server metadata', async () => {
    const { fetch } = setup();
    const prm = (await (await fetch(`${BASE}/.well-known/oauth-protected-resource/mcp`)).json()) as any;
    expect(prm).toMatchObject({ resource: `${BASE}/mcp`, authorization_servers: [BASE] });
    const as = (await (await fetch(`${BASE}/.well-known/oauth-authorization-server`)).json()) as any;
    expect(as).toMatchObject({
      issuer: BASE,
      code_challenge_methods_supported: ['S256'],
      client_id_metadata_document_supported: true,
      registration_endpoint: `${BASE}/register`,
    });
  });

  it('serves none of it when OAuth is not configured', async () => {
    const { fetch } = setup({ env: { EO_OAUTH_SECRET: '' } });
    expect((await fetch(`${BASE}/.well-known/oauth-authorization-server`)).status).toBe(404);
    const res = await fetch(`${BASE}/mcp`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toBeNull();
  });
});

describe('the MCP SDK client, end to end', () => {
  it('registers dynamically, signs in, and calls a tool', async () => {
    const env = setup();
    const provider = new MemoryProvider();
    const client = await connectWithSdk(env, provider);
    expect(provider.info?.client_id).toMatch(/^eocl_/);
    expect(provider.saved?.access_token).toMatch(/^eoat_/);
    const r = (await client.callTool({ name: 'company_lookup', arguments: { query: 'AAPL' } })) as any;
    expect(JSON.parse(r.content[0].text).data.matches[0].ticker).toBe('AAPL');
  });

  it('identifies itself by a client ID metadata document when it has one', async () => {
    const docUrl = 'https://client.test/oauth/client.json';
    const env = setup({ cimd: { client_id: docUrl, client_name: 'Metadata Client', redirect_uris: [CALLBACK] } });
    const provider = new MemoryProvider(docUrl);
    const client = await connectWithSdk(env, provider);
    expect(provider.info?.client_id).toBe(docUrl);
    expect((await client.listTools()).tools.length).toBe(9);
  });

  it('refreshes an expired access token without asking the person again', async () => {
    let t = Date.now();
    const env = setup({ now: () => t });
    const provider = new MemoryProvider();
    await connectWithSdk(env, provider);
    const before = provider.saved!.access_token;
    t += 2 * 3600_000;
    const client = new Client({ name: 't', version: '0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(`${BASE}/mcp`), { authProvider: provider, fetch: env.fetch }));
    expect((await client.listTools()).tools.length).toBe(9);
    expect(provider.saved!.access_token).not.toBe(before);
  });
});

// The same flow by hand, to reach the failures a well-behaved client never triggers.
async function register(fetch: ReturnType<typeof setup>['fetch'], body: Record<string, unknown> = {}) {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_name: 'Manual', redirect_uris: [CALLBACK], token_endpoint_auth_method: 'none', ...body }),
  });
  return { status: res.status, body: (await res.json()) as any };
}

function pkce() {
  const verifier = randomBytes(32).toString('base64url');
  return { verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

function authorizeUrl(clientId: string, challenge: string, extra: Record<string, string> = {}) {
  const u = new URL(`${BASE}/authorize`);
  const params = { response_type: 'code', client_id: clientId, redirect_uri: CALLBACK, code_challenge: challenge, code_challenge_method: 'S256', state: 'xyz', ...extra };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u;
}

async function token(fetch: ReturnType<typeof setup>['fetch'], params: Record<string, string>) {
  const res = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params).toString(),
  });
  return { status: res.status, body: (await res.json()) as any, headers: res.headers };
}

describe('the authorization code flow, by hand', () => {
  it('rejects a wrong PKCE verifier, and a code used twice', async () => {
    const { fetch } = setup();
    const { body: client } = await register(fetch);
    const p = pkce();
    const code = (await signIn(fetch, authorizeUrl(client.client_id, p.challenge))).searchParams.get('code')!;
    const base = { grant_type: 'authorization_code', client_id: client.client_id, code, redirect_uri: CALLBACK };
    expect((await token(fetch, { ...base, code_verifier: 'wrong'.padEnd(43, 'x') })).body.error).toBe('invalid_grant');
    const ok = await token(fetch, { ...base, code_verifier: p.verifier });
    expect(ok.status).toBe(200);
    expect(ok.headers.get('cache-control')).toBe('no-store');
    const again = await token(fetch, { ...base, code_verifier: p.verifier });
    expect(again.body).toMatchObject({ error: 'invalid_grant', error_description: expect.stringMatching(/already been used/) });
  });

  it('shows, rather than redirects, an error about the client or its redirect address', async () => {
    const { fetch } = setup();
    const { body: client } = await register(fetch);
    const bad = await fetch(authorizeUrl(client.client_id, pkce().challenge, { redirect_uri: 'https://evil.test/cb' }));
    expect(bad.status).toBe(400);
    expect(bad.headers.get('location')).toBeNull();
    const unknown = await fetch(authorizeUrl('eocl_forged.sig', pkce().challenge));
    expect(unknown.status).toBe(400);
  });

  it('redirects back with an error when PKCE is missing or the person declines', async () => {
    const { fetch } = setup();
    const { body: client } = await register(fetch);
    const noPkce = await fetch(authorizeUrl(client.client_id, '', { code_challenge_method: 'plain' }));
    expect(new URL(noPkce.headers.get('location')!).searchParams.get('error')).toBe('invalid_request');

    const html = await (await fetch(authorizeUrl(client.client_id, pkce().challenge))).text();
    const request = html.match(/name="request" value="([^"]+)"/)![1]!;
    const deny = await fetch(`${BASE}/authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ request, action: 'deny' }).toString(),
    });
    const loc = new URL(deny.headers.get('location')!);
    expect([loc.searchParams.get('error'), loc.searchParams.get('state')]).toEqual(['access_denied', 'xyz']);
  });

  it('turns away a wrong key at the sign-in page, and a tampered request', async () => {
    const { fetch } = setup();
    const { body: client } = await register(fetch);
    const html = await (await fetch(authorizeUrl(client.client_id, pkce().challenge))).text();
    const request = html.match(/name="request" value="([^"]+)"/)![1]!;
    const post = (body: Record<string, string>) =>
      fetch(`${BASE}/authorize`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body).toString() });
    const wrong = await post({ request, key: 'eo_not-a-key', action: 'allow' });
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toContain('That key is not recognised.');
    const tampered = await post({ request: request.slice(0, -2) + 'AA', key: KEY, action: 'allow' });
    expect(tampered.status).toBe(400);
  });

  it('protects the sign-in page from framing and escapes what a client calls itself', async () => {
    const { fetch } = setup();
    const { body: client } = await register(fetch, { client_name: '<script>alert(1)</script>' });
    const res = await fetch(authorizeUrl(client.client_id, pkce().challenge));
    const html = await res.text();
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('content-security-policy')).toContain('form-action \'self\' https://client.test');
  });

  it('requires the secret from a client registered with one', async () => {
    const { fetch } = setup();
    const { body: client } = await register(fetch, { token_endpoint_auth_method: 'client_secret_post' });
    expect(client.client_secret).toBeTruthy();
    const p = pkce();
    const code = (await signIn(fetch, authorizeUrl(client.client_id, p.challenge))).searchParams.get('code')!;
    const base = { grant_type: 'authorization_code', client_id: client.client_id, code, redirect_uri: CALLBACK, code_verifier: p.verifier };
    expect((await token(fetch, base)).status).toBe(401);
    expect((await token(fetch, { ...base, client_secret: client.client_secret })).status).toBe(200);
  });

  it('refuses to register redirect addresses that could leak a code', async () => {
    const { fetch } = setup();
    for (const uri of ['http://client.test/cb', 'javascript:alert(1)', 'https://client.test/cb#frag']) {
      expect((await register(fetch, { redirect_uris: [uri] })).status, uri).toBe(400);
    }
    for (const uri of ['http://127.0.0.1:53682/callback', 'cursor://anysphere.cursor-mcp/oauth/callback']) {
      expect((await register(fetch, { redirect_uris: [uri] })).status, uri).toBe(201);
    }
  });
});

describe('tokens', () => {
  async function accessToken(env: ReturnType<typeof setup>) {
    const { body: client } = await register(env.fetch);
    const p = pkce();
    const code = (await signIn(env.fetch, authorizeUrl(client.client_id, p.challenge))).searchParams.get('code')!;
    return (await token(env.fetch, { grant_type: 'authorization_code', client_id: client.client_id, code, redirect_uri: CALLBACK, code_verifier: p.verifier })).body;
  }
  const call = (env: ReturnType<typeof setup>, tok: string) =>
    env.fetch(`${BASE}/v1/tools/list_sources`, { method: 'POST', headers: { authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: '{}' });

  it('work on REST as well as MCP, and stop working when their key is retired', async () => {
    const env = setup();
    const t = await accessToken(env);
    expect((await call(env, t.access_token)).status).toBe(200);
    env.deps.config.apiKeyHashes.delete(hashKey(KEY));
    const res = await call(env, t.access_token);
    expect(res.status).toBe(401);
    expect(res.headers.get('www-authenticate')).toContain('error="invalid_token"');
    const refresh = await token(env.fetch, { grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: 'x' });
    expect(refresh.status).toBe(401);
  });

  it('are bound to this server: a token for another audience is refused', async () => {
    const env = setup();
    const forged = new Signer(SECRET).sign('access', { sub: hashKey(KEY), lbl: 'acme', aud: 'https://other.test/mcp', cid: 'c', sc: 'data:read' }, 3600);
    expect((await call(env, forged)).status).toBe(401);
    const signedElsewhere = new Signer('another-secret-another-secret-another-0').sign('access', { sub: hashKey(KEY), lbl: 'acme', aud: `${BASE}/mcp`, cid: 'c', sc: 'data:read' }, 3600);
    expect((await call(env, signedElsewhere)).status).toBe(401);
  });

  it('expire', async () => {
    let t = Date.now();
    const env = setup({ now: () => t });
    const tok = await accessToken(env);
    t += 3601_000;
    expect((await call(env, tok.access_token)).status).toBe(401);
  });
});

describe('loopback redirects', () => {
  it('match on any port, as RFC 8252 requires for native clients, and nothing else does', () => {
    expect(redirectAllowed(['http://127.0.0.1:1/cb'], 'http://127.0.0.1:53682/cb')).toBe(true);
    expect(redirectAllowed(['http://127.0.0.1:1/cb'], 'http://127.0.0.1:53682/other')).toBe(false);
    expect(redirectAllowed(['https://client.test/cb'], 'https://client.test:8443/cb')).toBe(false);
  });
});

describe('the no-key tier', () => {
  it('is off unless asked for, and when on, limits each address on its own', async () => {
    const closed = setup();
    expect((await closed.fetch(`${BASE}/v1/sources`)).status).toBe(401);

    const open = setup({ env: { EO_ALLOW_ANONYMOUS: '1', EO_ANON_RATE_PER_MINUTE: '1' } });
    const from = (ip: string) => open.fetch(`${BASE}/v1/sources`, { headers: { 'x-forwarded-for': ip } });
    expect((await from('203.0.113.1')).status).toBe(200);
    expect((await from('203.0.113.1')).status).toBe(429);
    expect((await from('203.0.113.2')).status).toBe(200);
    // a key holder is not held to the no-key limit
    const keyed = await open.fetch(`${BASE}/v1/sources`, { headers: { authorization: `Bearer ${KEY}`, 'x-forwarded-for': '203.0.113.1' } });
    expect(keyed.status).toBe(200);
  });
});
