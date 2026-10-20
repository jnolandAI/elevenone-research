// Everything the service reads from its environment, read once. Upstream keys
// live here and nowhere else: no tool result, log line or citation carries one.

export interface Config {
  port: number;
  secUserAgent?: string;
  fredKey?: string;
  blsKey?: string;
  censusKey?: string;
  beaKey?: string;
  /** sha256 hex of a client key -> the label it was issued under */
  apiKeyHashes: Map<string, string>;
  /** The no-key tier: requests without a key are served, limited per client address */
  allowAnonymous: boolean;
  ratePerMinute: number;
  anonRatePerMinute: number;
  /** The public origin, e.g. https://data.elevenoneresearch.com. OAuth issuer and token audience derive from it. */
  publicUrl?: string;
  /** Signs OAuth codes and tokens. OAuth is off without it. */
  oauthSecret?: string;
  /** The token OpenAI's app submission asks to find at /.well-known/openai-apps-challenge */
  openaiAppsChallenge?: string;
  upstreamTimeoutMs: number;
  cacheMaxEntries: number;
}

type Env = Record<string, string | undefined>;

function nonEmpty(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

function int(v: string | undefined, fallback: number): number {
  const n = Number.parseInt(v ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseKeyHashes(raw: string | undefined): Map<string, string> {
  const out = new Map<string, string>();
  for (const pair of (raw ?? '').split(',')) {
    const t = pair.trim();
    if (!t) continue;
    const i = t.lastIndexOf(':');
    const label = i > 0 ? t.slice(0, i) : 'default';
    const hash = (i > 0 ? t.slice(i + 1) : t).toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(hash)) throw new Error(`EO_API_KEY_HASHES: "${label}" is not a sha256 hex digest`);
    out.set(hash, label);
  }
  return out;
}

// SEC's fair-access policy: "Company Name contact@domain". Without the email it answers 403.
function secUserAgent(v: string | undefined): string | undefined {
  const ua = nonEmpty(v);
  if (ua && !/\S+@\S+\.\S+/.test(ua)) throw new Error('SEC_USER_AGENT must include a contact email, e.g. "Eleven One Research ops@example.com"');
  return ua;
}

function publicUrl(v: string | undefined): string | undefined {
  const t = nonEmpty(v);
  if (!t) return undefined;
  const u = new URL(t);
  if (u.protocol !== 'https:' && u.hostname !== 'localhost' && u.hostname !== '127.0.0.1') throw new Error('EO_PUBLIC_URL must be https');
  return u.origin;
}

function oauthSecret(v: string | undefined): string | undefined {
  const t = nonEmpty(v);
  if (t && t.length < 32) throw new Error('EO_OAUTH_SECRET must be at least 32 characters (openssl rand -base64 48)');
  return t;
}

export function loadConfig(env: Env = process.env): Config {
  return {
    port: int(env.PORT, 8787),
    secUserAgent: secUserAgent(env.SEC_USER_AGENT),
    fredKey: nonEmpty(env.FRED_API_KEY),
    blsKey: nonEmpty(env.BLS_API_KEY),
    censusKey: nonEmpty(env.CENSUS_API_KEY),
    beaKey: nonEmpty(env.BEA_API_KEY),
    apiKeyHashes: parseKeyHashes(env.EO_API_KEY_HASHES),
    allowAnonymous: env.EO_ALLOW_ANONYMOUS === '1',
    ratePerMinute: int(env.EO_RATE_PER_MINUTE, 120),
    anonRatePerMinute: int(env.EO_ANON_RATE_PER_MINUTE, 10),
    publicUrl: publicUrl(env.EO_PUBLIC_URL),
    oauthSecret: oauthSecret(env.EO_OAUTH_SECRET),
    openaiAppsChallenge: nonEmpty(env.EO_OPENAI_APPS_CHALLENGE),
    upstreamTimeoutMs: int(env.EO_UPSTREAM_TIMEOUT_MS, 10_000),
    cacheMaxEntries: int(env.EO_CACHE_MAX_ENTRIES, 2_000),
  };
}
