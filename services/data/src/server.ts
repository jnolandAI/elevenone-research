import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { Upstream } from './core/http.js';
import { sourceStatus } from './sources/registry.js';
import { startWarmer } from './warm.js';

const config = loadConfig();
const http = new Upstream({ timeoutMs: config.upstreamTimeoutMs, cacheMaxEntries: config.cacheMaxEntries });
const app = createApp({ config, http });
if (config.oauthSecret && !config.publicUrl) {
  // Without it, the OAuth issuer and token audience follow each request's Host header.
  console.warn(JSON.stringify({ msg: 'warning', detail: 'EO_OAUTH_SECRET is set without EO_PUBLIC_URL; set EO_PUBLIC_URL in production' }));
}
if (process.env.EO_WARM !== '0') startWarmer({ config, http }, 50 * 60_000, (l) => console.log(JSON.stringify(l)));

serve({ fetch: app.fetch, port: config.port }, (info) => {
  const sources = sourceStatus(config);
  console.log(
    JSON.stringify({
      msg: 'listening',
      port: info.port,
      client_keys: config.apiKeyHashes.size,
      anonymous: config.allowAnonymous,
      sources_available: sources.filter((s) => s.available).map((s) => s.id),
      sources_unavailable: sources.filter((s) => !s.available).map((s) => s.id),
    }),
  );
});
