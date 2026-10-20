// OAuth 2.1 for MCP clients that sign people in rather than take a key: Claude
// on the web, desktop and mobile, and ChatGPT. The server is its own
// authorization server, and the sign-in step is a page where the person enters
// their Eleven One key, on this domain, so the key never passes through the
// client. Replacing that step with real accounts changes nothing a client sees.
//
// Nothing here is stored. Client registrations, authorization codes and tokens
// are HMAC-signed and carry their own expiry; a token names the digest of the
// key it was issued against, so removing the key from EO_API_KEY_HASHES revokes
// every token issued for it. The one piece of state is the set of codes already
// redeemed, kept per process for their sixty-second life.

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Hono } from 'hono';
import { hashKey } from './auth.js';
import type { Config } from './config.js';
import type { FetchLike } from './core/http.js';

export const SCOPE = 'data:read';
const ACCESS_TTL = 3600;
const REFRESH_TTL = 30 * 86_400;
const CODE_TTL = 60;
const REQUEST_TTL = 600;

type Typ = 'access' | 'refresh' | 'code' | 'client' | 'request';
const PREFIX: Record<Typ, string> = { access: 'eoat_', refresh: 'eort_', code: 'eoac_', client: 'eocl_', request: 'eorq_' };

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url');

export class Signer {
  constructor(
    private readonly secret: string,
    private readonly now: () => number = Date.now,
  ) {}

  private mac(data: string): Buffer {
    return createHmac('sha256', this.secret).update(data).digest();
  }

  sign(typ: Typ, payload: Record<string, unknown>, ttlSeconds?: number): string {
    const body = b64(JSON.stringify({ ...payload, typ, ...(ttlSeconds ? { exp: Math.floor(this.now() / 1000) + ttlSeconds } : {}) }));
    return `${PREFIX[typ]}${body}.${b64(this.mac(`${typ}.${body}`))}`;
  }

  verify<T extends Record<string, unknown>>(token: string | undefined, typ: Typ): (T & { exp?: number }) | undefined {
    if (!token?.startsWith(PREFIX[typ])) return undefined;
    const [body, sig] = token.slice(PREFIX[typ].length).split('.');
    if (!body || !sig) return undefined;
    const want = this.mac(`${typ}.${body}`);
    const got = Buffer.from(sig, 'base64url');
    if (got.length !== want.length || !timingSafeEqual(got, want)) return undefined;
    let payload: T & { typ?: string; exp?: number };
    try {
      payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    } catch {
      return undefined;
    }
    if (payload.typ !== typ) return undefined;
    if (payload.exp !== undefined && payload.exp * 1000 <= this.now()) return undefined;
    return payload;
  }

  /** A DCR client's secret: derived, so it needs no storage, and useless without the server's key. */
  clientSecret(clientId: string): string {
    return b64(this.mac(`client-secret.${clientId}`));
  }
}

export interface AccessClaims {
  sub: string;
  lbl: string;
  aud: string;
  cid: string;
  sc: string;
}

/** The label of a valid access token for `audience`, or undefined. The key it was issued against must still be live. */
export function verifyAccessToken(config: Config, signer: Signer, token: string, audience: string): string | undefined {
  const claims = signer.verify<AccessClaims & Record<string, unknown>>(token, 'access');
  if (!claims || claims.aud !== audience) return undefined;
  return config.apiKeyHashes.has(claims.sub) ? claims.lbl : undefined;
}

// ---------------------------------------------------------------- clients

interface Client {
  client_id: string;
  client_name: string;
  redirect_uris: string[];
  auth_method: 'none' | 'client_secret_basic' | 'client_secret_post';
}

const AUTH_METHODS = ['none', 'client_secret_basic', 'client_secret_post'] as const;

function isLoopback(u: URL): boolean {
  return u.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
}

/** RFC 8252: a native client's loopback redirect may use any port. Everything else must match exactly. */
export function redirectAllowed(registered: string[], requested: string): boolean {
  let r: URL;
  try {
    r = new URL(requested);
  } catch {
    return false;
  }
  return registered.some((reg) => {
    if (reg === requested) return true;
    try {
      const g = new URL(reg);
      return isLoopback(g) && isLoopback(r) && g.hostname === r.hostname && g.pathname === r.pathname && g.search === r.search;
    } catch {
      return false;
    }
  });
}

const UNSAFE_SCHEMES = new Set(['http:', 'javascript:', 'data:', 'file:', 'vbscript:', 'blob:', 'about:', 'ws:', 'wss:', 'ftp:']);

function acceptableRedirect(uri: unknown): uri is string {
  if (typeof uri !== 'string') return false;
  try {
    const u = new URL(uri);
    if (u.hash) return false;
    // https, a loopback for native clients, or a private-use scheme (cursor://, vscode://)
    if (u.protocol === 'https:' || isLoopback(u)) return true;
    return /^[a-z][a-z0-9+.-]*:$/.test(u.protocol) && !UNSAFE_SCHEMES.has(u.protocol);
  } catch {
    return false;
  }
}

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.|\[)/i;

export interface OAuthOptions {
  /** Fetches Client ID Metadata Documents. Defaults to global fetch. */
  fetch?: FetchLike;
  now?: () => number;
}

class ClientResolver {
  private readonly cimd = new Map<string, { client: Client; expires: number }>();

  constructor(
    private readonly signer: Signer,
    private readonly fetchImpl: FetchLike,
    private readonly now: () => number,
  ) {}

  async resolve(clientId: string | undefined): Promise<Client | undefined> {
    if (!clientId) return undefined;
    if (clientId.startsWith(PREFIX.client)) {
      const p = this.signer.verify<{ ru: string[]; n: string; am: Client['auth_method'] }>(clientId, 'client');
      return p ? { client_id: clientId, client_name: p.n, redirect_uris: p.ru, auth_method: p.am } : undefined;
    }
    if (clientId.startsWith('https://')) return this.metadataDocument(clientId);
    return undefined;
  }

  /** A Client ID Metadata Document: the client_id is an HTTPS URL serving the client's own registration. */
  private async metadataDocument(url: string): Promise<Client | undefined> {
    const hit = this.cimd.get(url);
    if (hit && hit.expires > this.now()) return hit.client;
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      return undefined;
    }
    if (PRIVATE_HOST.test(u.hostname) || u.port) return undefined;
    try {
      const res = await this.fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(5000), headers: { accept: 'application/json' } });
      if (!res.ok) return undefined;
      const text = await res.text();
      if (text.length > 64_000) return undefined;
      const doc = JSON.parse(text) as { client_id?: string; client_name?: string; redirect_uris?: unknown[]; token_endpoint_auth_method?: string };
      if (doc.client_id !== url || !Array.isArray(doc.redirect_uris) || !doc.redirect_uris.every(acceptableRedirect)) return undefined;
      // A metadata document cannot carry a secret, so its client is public whatever it claims.
      const client: Client = { client_id: url, client_name: String(doc.client_name ?? u.hostname), redirect_uris: doc.redirect_uris as string[], auth_method: 'none' };
      this.cimd.set(url, { client, expires: this.now() + 3_600_000 });
      return client;
    } catch {
      return undefined;
    }
  }
}

// ---------------------------------------------------------------- routes

export function baseUrl(config: Config, requestUrl: string): string {
  return (config.publicUrl ?? new URL(requestUrl).origin).replace(/\/$/, '');
}
export const resourceUrl = (base: string) => `${base}/mcp`;
export const resourceMetadataUrl = (base: string) => `${base}/.well-known/oauth-protected-resource/mcp`;

interface PendingRequest {
  cid: string;
  ru: string;
  st?: string;
  cc: string;
  sc: string;
  res: string;
}

export function mountOAuth(app: Hono<any>, config: Config, signer: Signer, opts: OAuthOptions = {}): void {
  const now = opts.now ?? Date.now;
  const clients = new ClientResolver(signer, opts.fetch ?? ((i, init) => fetch(i, init)), now);
  const redeemed = new Map<string, number>();

  const prm = (c: { req: { url: string } }) => {
    const base = baseUrl(config, c.req.url);
    return {
      resource: resourceUrl(base),
      authorization_servers: [base],
      scopes_supported: [SCOPE],
      bearer_methods_supported: ['header'],
      resource_name: 'Eleven One Data',
      resource_documentation: 'https://elevenoneresearch.com',
    };
  };
  app.get('/.well-known/oauth-protected-resource', (c) => c.json(prm(c)));
  app.get('/.well-known/oauth-protected-resource/mcp', (c) => c.json(prm(c)));

  app.get('/.well-known/oauth-authorization-server', (c) => {
    const base = baseUrl(config, c.req.url);
    return c.json({
      issuer: base,
      authorization_endpoint: `${base}/authorize`,
      token_endpoint: `${base}/token`,
      registration_endpoint: `${base}/register`,
      scopes_supported: [SCOPE],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: [...AUTH_METHODS],
      code_challenge_methods_supported: ['S256'],
      client_id_metadata_document_supported: true,
      authorization_response_iss_parameter_supported: true,
    });
  });

  // RFC 7591 dynamic registration. The client_id is the signed registration itself.
  app.post('/register', async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
    const uris = body.redirect_uris;
    if (!Array.isArray(uris) || !uris.length || !uris.every(acceptableRedirect)) {
      return c.json({ error: 'invalid_redirect_uri', error_description: 'redirect_uris must be https, loopback, or a private-use scheme' }, 400);
    }
    // RFC 7591 §2: client_secret_basic when the client does not say
    const am = (body.token_endpoint_auth_method ?? 'client_secret_basic') as Client['auth_method'];
    if (!AUTH_METHODS.includes(am)) return c.json({ error: 'invalid_client_metadata', error_description: `token_endpoint_auth_method must be one of ${AUTH_METHODS.join(', ')}` }, 400);
    const name = String(body.client_name ?? 'An MCP client').slice(0, 100);
    const client_id = signer.sign('client', { ru: uris, n: name, am });
    return c.json(
      {
        client_id,
        ...(am === 'none' ? {} : { client_secret: signer.clientSecret(client_id), client_secret_expires_at: 0 }),
        client_id_issued_at: Math.floor(now() / 1000),
        client_name: name,
        redirect_uris: uris,
        token_endpoint_auth_method: am,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        scope: SCOPE,
      },
      201,
    );
  });

  // Errors before the redirect URI is trusted are shown, never redirected (RFC 6749 §4.1.2.1).
  const errorPage = (c: any, message: string, status = 400) => c.html(page('Cannot connect', `<p>${esc(message)}</p>`), status, securityHeaders());

  app.get('/authorize', async (c) => {
    const q = c.req.query();
    const client = await clients.resolve(q.client_id);
    if (!client) return errorPage(c, 'This application is not registered with Eleven One Data.');
    const ru = q.redirect_uri ?? (client.redirect_uris.length === 1 ? client.redirect_uris[0] : undefined);
    if (!ru || !redirectAllowed(client.redirect_uris, ru)) return errorPage(c, 'The redirect address does not match the application’s registration.');

    const base = baseUrl(config, c.req.url);
    const fail = (error: string, description: string) => c.redirect(withParams(ru, { error, error_description: description, state: q.state, iss: base }), 302);
    if (q.response_type !== 'code') return fail('unsupported_response_type', 'response_type must be code');
    if (!q.code_challenge || q.code_challenge_method !== 'S256') return fail('invalid_request', 'PKCE with S256 is required');
    if (q.resource && !sameResource(q.resource, base)) return fail('invalid_target', `this server issues tokens for ${resourceUrl(base)}`);

    const pending: PendingRequest = { cid: client.client_id, ru, cc: q.code_challenge, sc: SCOPE, res: resourceUrl(base), ...(q.state ? { st: q.state } : {}) };
    const request = signer.sign('request', pending as unknown as Record<string, unknown>, REQUEST_TTL);
    return c.html(consentPage(client.client_name, ru, request), 200, securityHeaders(ru));
  });

  app.post('/authorize', async (c) => {
    const form = await c.req.parseBody();
    const pending = signer.verify<PendingRequest & Record<string, unknown>>(String(form.request ?? ''), 'request');
    if (!pending) return errorPage(c, 'This sign-in page has expired. Go back to the application and connect again.');
    const base = baseUrl(config, c.req.url);
    if (form.action === 'deny') {
      return c.redirect(withParams(pending.ru, { error: 'access_denied', error_description: 'The user declined', state: pending.st, iss: base }), 302);
    }
    const key = String(form.key ?? '').trim();
    const sub = hashKey(key);
    const label = key ? config.apiKeyHashes.get(sub) : undefined;
    if (!label) {
      const client = await clients.resolve(pending.cid);
      return c.html(consentPage(client?.client_name ?? 'An MCP client', pending.ru, String(form.request), 'That key is not recognised.'), 401, securityHeaders(pending.ru));
    }
    const code = signer.sign('code', { cid: pending.cid, ru: pending.ru, cc: pending.cc, sc: pending.sc, res: pending.res, sub, lbl: label, jti: b64(randomBytes(12)) }, CODE_TTL);
    return c.redirect(withParams(pending.ru, { code, state: pending.st, iss: base }), 302);
  });

  app.post('/token', async (c) => {
    const ct = c.req.header('content-type') ?? '';
    const body: Record<string, string> = ct.includes('application/json')
      ? ((await c.req.json().catch(() => ({}))) as Record<string, string>)
      : Object.fromEntries(Object.entries(await c.req.parseBody()).map(([k, v]) => [k, String(v)]));
    const tokenError = (error: string, description: string, status: 400 | 401 = 400) =>
      c.json({ error, error_description: description }, status, { 'cache-control': 'no-store' });

    // Client authentication: HTTP Basic, or client_id (and secret) in the body
    let clientId = body.client_id;
    let secret = body.client_secret;
    const basic = c.req.header('authorization')?.match(/^Basic\s+(.+)$/i)?.[1];
    if (basic) {
      const [id, sec] = Buffer.from(basic, 'base64').toString('utf8').split(':').map((s) => decodeURIComponent(s));
      clientId = id;
      secret = sec;
    }
    const client = await clients.resolve(clientId);
    if (!client) return tokenError('invalid_client', 'unknown client', 401);
    if (client.auth_method !== 'none') {
      const want = Buffer.from(signer.clientSecret(client.client_id));
      const got = Buffer.from(secret ?? '');
      if (got.length !== want.length || !timingSafeEqual(got, want)) return tokenError('invalid_client', 'client authentication failed', 401);
    }

    const base = baseUrl(config, c.req.url);
    if (body.resource && !sameResource(body.resource, base)) return tokenError('invalid_target', `this server issues tokens for ${resourceUrl(base)}`);

    const issue = (sub: string, lbl: string) => {
      const claims = { sub, lbl, aud: resourceUrl(base), cid: client.client_id, sc: SCOPE };
      return c.json(
        {
          access_token: signer.sign('access', claims, ACCESS_TTL),
          token_type: 'Bearer',
          expires_in: ACCESS_TTL,
          refresh_token: signer.sign('refresh', claims, REFRESH_TTL),
          scope: SCOPE,
        },
        200,
        { 'cache-control': 'no-store' },
      );
    };

    if (body.grant_type === 'authorization_code') {
      const code = signer.verify<{ cid: string; ru: string; cc: string; res: string; sub: string; lbl: string; jti: string } & Record<string, unknown>>(body.code, 'code');
      if (!code || code.cid !== client.client_id) return tokenError('invalid_grant', 'the code is invalid, expired, or for another client');
      for (const [jti, exp] of redeemed) if (exp * 1000 <= now()) redeemed.delete(jti);
      if (redeemed.has(code.jti)) return tokenError('invalid_grant', 'the code has already been used');
      if (body.redirect_uri && body.redirect_uri !== code.ru) return tokenError('invalid_grant', 'redirect_uri does not match the authorization request');
      const verifier = body.code_verifier ?? '';
      if (b64(createHash('sha256').update(verifier).digest()) !== code.cc) return tokenError('invalid_grant', 'PKCE verification failed');
      if (!config.apiKeyHashes.has(code.sub)) return tokenError('invalid_grant', 'the key behind this sign-in has been revoked');
      redeemed.set(code.jti, code.exp ?? Math.floor(now() / 1000) + CODE_TTL);
      return issue(code.sub, code.lbl);
    }

    if (body.grant_type === 'refresh_token') {
      const rt = signer.verify<AccessClaims & Record<string, unknown>>(body.refresh_token, 'refresh');
      if (!rt || rt.cid !== client.client_id || rt.aud !== resourceUrl(base)) return tokenError('invalid_grant', 'the refresh token is invalid or expired');
      if (!config.apiKeyHashes.has(rt.sub)) return tokenError('invalid_grant', 'the key behind this sign-in has been revoked');
      return issue(rt.sub, rt.lbl);
    }

    return tokenError('unsupported_grant_type', 'grant_type must be authorization_code or refresh_token');
  });
}

function sameResource(requested: string, base: string): boolean {
  const r = requested.replace(/\/$/, '');
  return r === resourceUrl(base) || r === base;
}

function withParams(uri: string, params: Record<string, string | undefined>): string {
  const u = new URL(uri);
  for (const [k, v] of Object.entries(params)) if (v !== undefined) u.searchParams.set(k, v);
  return u.toString();
}

// ---------------------------------------------------------------- the sign-in page

function securityHeaders(redirectUri?: string): Record<string, string> {
  // Browsers apply form-action to the redirect that follows the post, so the client's origin must be allowed.
  let target = '';
  if (redirectUri) {
    const u = new URL(redirectUri);
    target = u.protocol === 'https:' || u.protocol === 'http:' ? ` ${u.origin}` : ` ${u.protocol}`;
  }
  return {
    'content-security-policy': `default-src 'none'; style-src 'unsafe-inline'; form-action 'self'${target}; frame-ancestors 'none'; base-uri 'none'`,
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'cache-control': 'no-store',
  };
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);
}

function consentPage(clientName: string, redirectUri: string, request: string, error?: string): string {
  const u = new URL(redirectUri);
  const dest = u.protocol === 'https:' || u.protocol === 'http:' ? u.host : u.protocol.replace(/:$/, '');
  return page(
    'Connect to Eleven One Data',
    `<p><strong>${esc(clientName)}</strong> is asking to read cited data from Eleven One on your behalf. It can look up figures; it cannot change anything.</p>
<p class="small">After you allow it, you return to <strong>${esc(dest)}</strong>.</p>
<form method="post" action="/authorize">
  <input type="hidden" name="request" value="${esc(request)}">
  <label for="key">Your Eleven One key</label>
  <input id="key" name="key" type="password" autocomplete="current-password" spellcheck="false" placeholder="eo_..." required autofocus>
  ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ''}
  <div class="row">
    <button type="submit" name="action" value="allow">Allow</button>
    <button type="submit" name="action" value="deny" formnovalidate class="secondary">Deny</button>
  </div>
</form>
<p class="small">Your key is checked here and is never shared with ${esc(clientName)}. It receives a token that expires, which you can revoke by retiring the key.</p>`,
  );
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { --bg: #f6f5f1; --fg: #16161a; --muted: #5b5b66; --line: #d9d7cf; --accent: #16161a; --accent-fg: #f6f5f1; --error: #a3261b; }
  @media (prefers-color-scheme: dark) { :root { --bg: #121215; --fg: #ecebe6; --muted: #a2a1aa; --line: #34343b; --accent: #ecebe6; --accent-fg: #121215; --error: #f08a7e; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--fg); font: 16px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 28rem; margin: 12vh auto; padding: 0 16px; }
  .mark { font-size: 0.75rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); margin-bottom: 1.5rem; }
  h1 { font-size: 1.5rem; line-height: 1.2; margin: 0 0 1rem; }
  label { display: block; font-weight: 600; margin: 1.5rem 0 0.5rem; }
  input[type=password] { width: 100%; padding: 0.7rem 0.8rem; font: inherit; color: inherit; background: transparent; border: 1px solid var(--line); border-radius: 6px; }
  input:focus-visible, button:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }
  .row { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
  button { flex: 1; padding: 0.7rem; font: inherit; font-weight: 600; border-radius: 6px; border: 1px solid var(--accent); background: var(--accent); color: var(--accent-fg); cursor: pointer; }
  button.secondary { background: transparent; color: var(--fg); border-color: var(--line); }
  .small { font-size: 0.875rem; color: var(--muted); }
  .error { color: var(--error); margin: 0.75rem 0 0; }
</style>
</head>
<body>
<main>
  <div class="mark">Eleven One Research</div>
  <h1>${esc(title)}</h1>
  ${body}
</main>
</body>
</html>`;
}
