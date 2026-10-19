// Client keys. The server stores only their sha256 digests, so a leaked
// environment does not leak a usable key.

import { createHash, randomBytes } from 'node:crypto';
import { ToolError } from './core/errors.js';
import type { Config } from './config.js';

export const KEY_PREFIX = 'eo_';

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function newKey(): string {
  return `${KEY_PREFIX}${randomBytes(24).toString('base64url')}`;
}

export function bearer(headers: Headers): string | undefined {
  const auth = headers.get('authorization');
  const m = auth?.match(/^Bearer\s+(\S+)$/i);
  return m?.[1] ?? headers.get('x-api-key') ?? undefined;
}

/** The label a key was issued under, or a ToolError saying why the request is refused. */
export function authenticate(config: Config, token: string | undefined): string {
  if (!token) {
    if (config.allowAnonymous) return 'anonymous';
    throw new ToolError('unauthorized', 'Send your Eleven One key as "Authorization: Bearer <key>".');
  }
  const label = config.apiKeyHashes.get(hashKey(token));
  if (!label) throw new ToolError('unauthorized', 'That key is not recognised.');
  return label;
}

/** A fixed one-minute window per client. Enough for one process; a shared store replaces it when there is more than one. */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly perMinute: number,
    private readonly now: () => number = Date.now,
  ) {}

  take(client: string): void {
    const t = this.now();
    const w = this.windows.get(client);
    if (!w || t - w.start >= 60_000) {
      this.windows.set(client, { start: t, count: 1 });
      return;
    }
    if (w.count >= this.perMinute) {
      throw new ToolError('rate_limited', `More than ${this.perMinute} requests this minute; retry in ${Math.ceil((w.start + 60_000 - t) / 1000)}s.`);
    }
    w.count++;
  }
}
