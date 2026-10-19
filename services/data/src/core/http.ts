// The one door to every upstream. It is what makes the service fast (a shared
// cache, in-flight coalescing, bounded concurrency per publisher) and what keeps
// credentials out of results (every URL it hands back has them stripped).

import { TtlCache } from './cache.js';
import { ToolError } from './errors.js';
import type { SourceId } from '../sources/registry.js';

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface UpstreamRequest {
  source: SourceId;
  /** The full URL, credentials included */
  url: string;
  /** Query parameters that carry credentials, removed from the URL a caller sees */
  secretParams?: string[];
  method?: 'GET' | 'POST';
  /** A JSON body, for the one publisher (BLS) whose richer API is POST-only */
  body?: unknown;
  /** The URL a caller sees, where `url` cannot be shown as is */
  publicUrl?: string;
  headers?: Record<string, string>;
  ttlMs: number;
  /** Fetch even if cached, and cache the answer: how the warmer keeps entries from expiring */
  refresh?: boolean;
}

export interface UpstreamResponse<T> {
  data: T;
  apiUrl: string;
  /** When the publisher actually served this, which is earlier than now on a cache hit */
  retrievedAt: string;
  cached: boolean;
}

interface Stored {
  data: unknown;
  retrievedAt: string;
}

const CONCURRENCY: Partial<Record<SourceId, number>> = { sec: 8 };
const DEFAULT_CONCURRENCY = 6;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

export function stripParams(url: string, params: readonly string[] = []): string {
  if (!params.length) return url;
  const u = new URL(url);
  for (const p of params) u.searchParams.delete(p);
  return u.toString();
}

class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];
  constructor(private readonly limit: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((r) => this.queue.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.queue.shift()?.();
    }
  }
}

export interface UpstreamOptions {
  fetch?: FetchLike;
  timeoutMs?: number;
  cacheMaxEntries?: number;
  retries?: number;
  retryBaseMs?: number;
  now?: () => number;
}

export class Upstream {
  private readonly cache: TtlCache<Stored>;
  private readonly inflight = new Map<string, Promise<Stored>>();
  private readonly gates = new Map<SourceId, Semaphore>();
  private readonly fetchImpl: FetchLike;
  private readonly timeoutMs: number;
  private readonly retries: number;
  private readonly retryBaseMs: number;
  private readonly now: () => number;

  constructor(opts: UpstreamOptions = {}) {
    this.fetchImpl = opts.fetch ?? ((input, init) => fetch(input, init));
    this.timeoutMs = opts.timeoutMs ?? 10_000;
    this.retries = opts.retries ?? 2;
    this.retryBaseMs = opts.retryBaseMs ?? 300;
    this.now = opts.now ?? Date.now;
    this.cache = new TtlCache(opts.cacheMaxEntries ?? 2_000, this.now);
  }

  async json<T>(req: UpstreamRequest): Promise<UpstreamResponse<T>> {
    const apiUrl = req.publicUrl ?? stripParams(req.url, req.secretParams);
    // The key includes the secret-bearing URL and body, so two credentials never share an entry.
    const key = `${req.method ?? 'GET'} ${req.url} ${req.body === undefined ? '' : JSON.stringify(req.body)}`;

    const hit = req.refresh ? undefined : this.cache.get(key);
    if (hit) return { data: hit.data as T, apiUrl, retrievedAt: hit.retrievedAt, cached: true };

    let pending = this.inflight.get(key);
    const joined = pending !== undefined;
    if (!pending) {
      pending = this.gate(req.source)
        .run(() => this.fetchWithRetry(req, apiUrl))
        .then((stored) => {
          this.cache.set(key, stored, req.ttlMs);
          return stored;
        })
        .finally(() => this.inflight.delete(key));
      this.inflight.set(key, pending);
    }
    const stored = await pending;
    return { data: stored.data as T, apiUrl, retrievedAt: stored.retrievedAt, cached: joined };
  }

  private gate(source: SourceId): Semaphore {
    let g = this.gates.get(source);
    if (!g) {
      g = new Semaphore(CONCURRENCY[source] ?? DEFAULT_CONCURRENCY);
      this.gates.set(source, g);
    }
    return g;
  }

  private async fetchWithRetry(req: UpstreamRequest, apiUrl: string): Promise<Stored> {
    let lastError: ToolError | undefined;
    for (let attempt = 0; attempt <= this.retries; attempt++) {
      if (attempt > 0) await sleep(this.retryBaseMs * 2 ** (attempt - 1));
      let res: Response;
      try {
        res = await this.fetchImpl(req.url, {
          method: req.method ?? 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: {
            accept: 'application/json',
            ...(req.body === undefined ? {} : { 'content-type': 'application/json' }),
            ...req.headers,
          },
          ...(req.body === undefined ? {} : { body: JSON.stringify(req.body) }),
        });
      } catch (err) {
        const reason = err instanceof Error && err.name === 'TimeoutError' ? `timed out after ${this.timeoutMs}ms` : 'could not be reached';
        lastError = new ToolError('upstream_error', `${req.source} ${reason} (${apiUrl})`, req.source);
        continue;
      }

      if (res.status >= 300 && res.status < 400) {
        // Census answers a missing or bad key with a redirect to an HTML page.
        throw new ToolError(
          'upstream_error',
          `${req.source} redirected the request, which usually means a missing or rejected key (${apiUrl})`,
          req.source,
        );
      }
      if (RETRYABLE.has(res.status)) {
        lastError = new ToolError(
          res.status === 429 ? 'rate_limited' : 'upstream_error',
          `${req.source} answered ${res.status} (${apiUrl})`,
          req.source,
        );
        continue;
      }
      if (res.status === 404) throw new ToolError('not_found', `${req.source} has no such resource (${apiUrl})`, req.source);
      const text = await res.text();
      if (!res.ok) {
        throw new ToolError('upstream_error', `${req.source} answered ${res.status}: ${scrub(text, req).slice(0, 300)}`, req.source);
      }
      try {
        return { data: JSON.parse(text), retrievedAt: new Date(this.now()).toISOString() };
      } catch {
        throw new ToolError('upstream_error', `${req.source} returned something other than JSON (${apiUrl})`, req.source);
      }
    }
    throw lastError ?? new ToolError('upstream_error', `${req.source} failed`, req.source);
  }
}

/** Upstream error bodies sometimes echo the request back. Remove any credential they echo, and reduce an HTML page to its title. */
function scrub(text: string, req: UpstreamRequest): string {
  let out = text.trimStart().startsWith('<') ? (text.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? 'an HTML error page') : text;
  const u = new URL(req.url);
  for (const p of req.secretParams ?? []) {
    const v = u.searchParams.get(p);
    if (v) out = out.split(v).join('[redacted]');
  }
  if (req.body && typeof req.body === 'object') {
    for (const v of Object.values(req.body as Record<string, unknown>)) {
      if (typeof v === 'string' && v.length >= 16) out = out.split(v).join('[redacted]');
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
