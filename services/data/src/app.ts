// The HTTP surface: REST under /v1 and MCP (streamable HTTP, stateless) at /mcp.
// Both run the same tools behind the same key.

import { Hono } from 'hono';
import { createMiddleware } from 'hono/factory';
import { z } from 'zod';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { RateLimiter, authenticate, bearer } from './auth.js';
import { ToolError } from './core/errors.js';
import { buildMcpServer } from './mcp.js';
import { sourceStatus } from './sources/registry.js';
import { TOOLS, runTool, type Deps } from './tools.js';
import { VERSION } from './version.js';

type Vars = { Variables: { client: string } };

export type Logger = (line: Record<string, unknown>) => void;

export function createApp(deps: Deps, log: Logger = (l) => console.log(JSON.stringify(l))) {
  const app = new Hono<Vars>();
  const limiter = new RateLimiter(deps.config.ratePerMinute);

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
      auth: 'Authorization: Bearer <your Eleven One key>',
    }),
  );

  app.get('/health', (c) => c.json({ ok: true, version: VERSION, sources: sourceStatus(deps.config).map((s) => ({ id: s.id, available: s.available })) }));

  const guard = createMiddleware<Vars>(async (c, next) => {
    const client = authenticate(deps.config, bearer(c.req.raw.headers));
    limiter.take(client);
    c.set('client', client);
    await next();
  });
  app.use('/v1/*', guard);
  app.use('/mcp', guard);

  app.get('/v1/sources', (c) => c.json({ sources: sourceStatus(deps.config) }));

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
