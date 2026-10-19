// Keeps the catalog's series in cache, so the figures consultants ask for most
// are answered from memory rather than after a cold trip to the publisher. The
// World Bank, for one, can take ten seconds on a cold path that it serves in
// half a second warm.

import { CATALOG } from './catalog.js';
import { SOURCES, type SourceId } from './sources/registry.js';
import { runTool, type Deps } from './tools.js';

export function warmRefs(deps: Deps): string[] {
  // Keyless, BLS allows 25 requests a day; warming would spend them on the server's behalf, not the client's.
  const warmable = (s: SourceId) => SOURCES[s].configured(deps.config) && (s !== 'bls' || Boolean(deps.config.blsKey));
  return CATALOG.flatMap((e) => (e.tool === 'get_series' && e.ref && warmable(e.source) ? [e.ref] : []));
}

export async function warmOnce(deps: Deps): Promise<{ refs: number; failed: number; ms: number }> {
  const started = performance.now();
  const refs = warmRefs(deps);
  let failed = 0;
  // ten refs per call, the most get_series takes; the upstream gates bound concurrency per publisher
  const batches = [];
  for (let i = 0; i < refs.length; i += 10) batches.push(refs.slice(i, i + 10));
  await Promise.all(
    batches.map(async (batch) => {
      try {
        const r = await runTool(deps, 'get_series', { refs: batch }, { refresh: true });
        failed += (r.data as { errors: unknown[] }).errors.length;
      } catch {
        failed += batch.length;
      }
    }),
  );
  return { refs: refs.length, failed, ms: Math.round(performance.now() - started) };
}

/** Warms now, then again every `intervalMs`, which should be shorter than the shortest series TTL (one hour). */
export function startWarmer(deps: Deps, intervalMs: number, log: (l: Record<string, unknown>) => void): NodeJS.Timeout {
  const run = () => warmOnce(deps).then((r) => log({ msg: 'warmed', ...r }));
  void run();
  return setInterval(run, intervalMs).unref();
}
