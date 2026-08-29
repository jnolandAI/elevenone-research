/**
 * noland-repo.ts promises: "a NOLAND_REPO that IS set and does not resolve is
 * not a skip. It is a stale or mistyped path, which is a real failure." Until
 * 2026-08-29 nothing enforced that. resolve() returned the stale-env case in
 * the same { why } shape as an honest skip, every consumer's skipIf treated
 * the two identically, and assertUsable — the docblock's named enforcer —
 * returns early when no repo resolved, so it never saw the case at all. The
 * same shape as the audit.mjs defect the final review called Critical: a
 * guarantee stated in prose and delegated to callers who do not all call it.
 *
 * The enforcement now lives in the resolver itself, where no consumer can
 * forget it: a set env that is not a checkout throws at import time, which
 * fails every file that reaches across, loudly. These tests drive the pure
 * function; the module-scope NOLAND constant is the same function applied to
 * the real sibling path and the real environment.
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { resolveNoland, ELEVEN_ONE_ROOT } from './noland-repo';

// Any directory carrying src/pages passes isCheckout; this repository's own
// root is one, and unlike the real sibling it exists on every machine that
// can run this suite.
const checkout = ELEVEN_ONE_ROOT;
const notCheckout = join(ELEVEN_ONE_ROOT, 'no-such-dir');

describe('resolveNoland', () => {
  it('prefers the sibling checkout when it exists', () => {
    const r = resolveNoland(checkout, undefined);
    expect(r.repo).toBe(checkout);
  });

  it('falls back to a NOLAND_REPO that resolves', () => {
    const r = resolveNoland(notCheckout, checkout);
    expect(r.repo).toBe(checkout);
  });

  it('throws on a NOLAND_REPO that is set and does not resolve, because a stale path is a failure and not a skip', () => {
    expect(() => resolveNoland(notCheckout, notCheckout)).toThrow(/failure, not a skip/);
  });

  it('skips, with both paths named, only when nothing is set and nothing is on disk', () => {
    const r = resolveNoland(notCheckout, undefined);
    expect(r.repo).toBeUndefined();
    expect(r.why).toContain(notCheckout);
    expect(r.why).toContain('NOLAND_REPO is not set');
  });
});
