// The HTTP surface: REST under /v1 and MCP (streamable HTTP, stateless) at /mcp.
// Both run the same tools behind the same key.

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { ANONYMOUS, RateLimiter, authenticate, bearer } from './auth.js';
import { ToolError } from './core/errors.js';
import { buildMcpServer } from './mcp.js';
import { SCOPE, Signer, baseUrl, mountOAuth, resourceMetadataUrl, resourceUrl, verifyAccessToken, type OAuthOptions } from './oauth.js';
import { sourceStatus } from './sources/registry.js';
import { TOOLS, runTool, type Deps } from './tools.js';
import { VERSION } from './version.js';

type Vars = { Variables: { client: string } };

export type Logger = (line: Record<string, unknown>) => void;

export function createApp(deps: Deps, log: Logger = (l) => console.log(JSON.stringify(l)), oauth: OAuthOptions = {}) {
  const app = new Hono<Vars>();
  const { config } = deps;
  const limiter = new RateLimiter(config.ratePerMinute);
  const signer = config.oauthSecret ? new Signer(config.oauthSecret, oauth.now) : undefined;
  if (signer) mountOAuth(app, config, signer, oauth);

  app.use('*', async (c, next) => {
    const started = performance.now();
    await next();
    log({ t: new Date().toISOString(), method: c.req.method, path: c.req.path, status: c.res.status, ms: Math.round(performance.now() - started), client: c.get('client') ?? null });
  });

  app.get('/', (c) =>
    c.json({
      name: 'Eleven One Data',
      version: VERSION,
      mcp: '/mcp',
      rest: { tools: '/v1/tools', call: 'POST /v1/tools/{name}', sources: '/v1/sources' },
      auth: signer ? ['Authorization: Bearer <your Eleven One key>', 'OAuth 2.1: /.well-known/oauth-protected-resource/mcp'] : 'Authorization: Bearer <your Eleven One key>',
    }),
  );

  // ChatGPT's app directory proves domain ownership by fetching this.
  if (config.openaiAppsChallenge) app.get('/.well-known/openai-apps-challenge', (c) => c.text(config.openaiAppsChallenge!));

  app.get('/health', (c) => c.json({ ok: true, version: VERSION, sources: sourceStatus(deps.config).map((s) => ({ id: s.id, available: s.available })) }));

  const guard = createMiddleware<Vars>(async (c, next) => {
    const token = bearer(c.req.raw.headers);
    let client: string;
    try {
      if (signer && token?.startsWith('eoat_')) {
        const label = verifyAccessToken(config, signer, token, resourceUrl(baseUrl(config, c.req.url)));
        if (!label) throw new ToolError('unauthorized', 'That token is invalid or has expired.');
        client = label;
      } else {
        client = authenticate(config, token);
      }
    } catch (err) {
      // An MCP client finds the sign-in flow from this header (RFC 9728 §5.1).
      if (err instanceof ToolError && err.code === 'unauthorized' && signer) {
        const challenge = `Bearer resource_metadata="${resourceMetadataUrl(baseUrl(config, c.req.url))}", scope="${SCOPE}"${token ? ', error="invalid_token"' : ''}`;
        return c.json(err.toJSON(), 401, { 'www-authenticate': challenge });
      }
      throw err;
    }
    if (client === ANONYMOUS) {
      // The no-key tier is limited per address, not shared, so one heavy caller cannot exhaust it for everyone.
      const addr = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || (c.env as { incoming?: { socket?: { remoteAddress?: string } } } | undefined)?.incoming?.socket?.remoteAddress || 'unknown';
      client = `${ANONYMOUS}:${addr}`;
      limiter.take(client, config.anonRatePerMinute);
    } else {
      limiter.take(client);
    }
    c.set('client', client);
    await next();
  });
  app.use('/v1/*', guard);
  app.use('/mcp', guard);

  app.get('/v1/sources', (c) => c.json({ sources: sourceStatus(config) }));

  app.get('/v1/tools', (c) =>
    c.json({
      tools: TOOLS.map((t) => ({ name: t.name, title: t.title, description: t.description, input_schema: z.toJSONSchema(z.object(t.input)) })),
    }),
  );

  app.post('/v1/tools/:name', async (c) => {
    const body = await c.req.json().catch(() => {
      throw new ToolError('invalid_request', 'The body must be a JSON object of tool arguments.');
    });
    return c.json(await runTool(deps, c.req.param('name'), body));
  });

  app.post('/mcp', async (c) => {
    // Stateless: a fresh server and transport per request, so any instance can answer any call.
    const server = buildMcpServer(deps, (l) => log({ ...l, client: c.get('client') }));
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      void server.close();
    }
  });
  // A stateless server has no stream to resume and no session to end.
  app.on(['GET', 'DELETE'], '/mcp', (c) =>
    c.json({ jsonrpc: '2.0', error: { code: -32000, message: 'Method not allowed: this server is stateless' }, id: null }, 405),
  );

  app.notFound((c) => c.json(new ToolError('not_found', `No route ${c.req.method} ${c.req.path}`).toJSON(), 404));

  app.onError((err, c) => {
    if (err instanceof ToolError) return c.json(err.toJSON(), err.status as 400);
    log({ error: String(err), stack: err instanceof Error ? err.stack : undefined, path: c.req.path });
    return c.json({ error: { code: 'internal_error', message: 'Something went wrong on our side.' } }, 500);
  });

  return app;
}
