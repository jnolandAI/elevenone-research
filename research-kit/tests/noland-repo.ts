import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Where the Noland Advisory checkout is, resolved rather than remembered.
 *
 * Four test files in this repository reach across into the sibling repo: this
 * kit's coverage guard (`raw-markup`), the two stale-copy checks
 * (`scripts-home`, `geometry-home`) and the adapter check
 * (`tests/adapter-noland`). Every one of them used to be gated on
 * `process.env.NOLAND_REPO`, and that variable was set in exactly one place:
 * a gate block a human copies out of a task brief and pastes into a shell.
 * Not in either `package.json`, not in a `.env`, not in a README, and there is
 * no CI. `npm test` here is a bare `vitest run`, so 15 tests — including the
 * whole real surface of the coverage guard, 10 needles and 16 pinned
 * exemptions over the migrated corpus — skipped on every default run and said
 * nothing about it. A guard that runs only when you remember it is a guard
 * that does not run.
 *
 * So the checkout is resolved from this file's own location, which is the one
 * thing that is always true: `research-kit/tests/` is two levels below the
 * Eleven One root, and Noland sits beside it. `NOLAND_REPO` still works, as a
 * fallback for a checkout somewhere else.
 *
 * Skipping survives for exactly one case — the sibling genuinely not being on
 * disk, which is what someone cloning only this repo will hit — and it is
 * never silent: `describeSkip` returns the reason, which callers print and
 * carry in the test's own name.
 *
 * A `NOLAND_REPO` that IS set and does not resolve is not a skip. It is a
 * stale or mistyped path, which is a real failure every one of these files
 * exists to catch, and `assertUsable` below is how the callers that already
 * made that distinction keep making it.
 */
const E1_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SIBLING = join(E1_ROOT, '..', 'Noland Advisory2', 'noland-advisory');

const isCheckout = (p: string) => existsSync(join(p, 'src', 'pages'));

function resolve(): { repo?: string; why: string } {
  if (isCheckout(SIBLING)) return { repo: SIBLING, why: `sibling checkout at ${SIBLING}` };
  const env = process.env.NOLAND_REPO;
  if (env && isCheckout(env)) return { repo: env, why: `NOLAND_REPO=${env}` };
  if (env) {
    return {
      why:
        `NOLAND_REPO is set to "${env}", which has no src/pages, and there is no sibling ` +
        `checkout at ${SIBLING}`,
    };
  }
  return { why: `no sibling checkout at ${SIBLING}, and NOLAND_REPO is not set` };
}

export const NOLAND = resolve();

/** The Eleven One repository root, resolved the same way. */
export const ELEVEN_ONE_ROOT = E1_ROOT;

/**
 * Print the reason for a skip, once, at import time. A skip nobody is told
 * about is the failure mode this module exists to end, so no caller is
 * allowed to skip quietly.
 */
export function announceSkip(file: string, whatIsLost: string): void {
  if (NOLAND.repo) return;
  console.warn(`${file}: skipping ${whatIsLost} — ${NOLAND.why}.`);
}

/**
 * For a caller that has resolved a repo: fail loudly if a file it expects
 * inside that repo is missing. A resolved path that has gone stale is a
 * finding, not a reason to skip.
 */
export function assertUsable(paths: string[]): void {
  if (!NOLAND.repo) return;
  const missing = paths.filter((p) => !existsSync(p));
  if (missing.length) {
    throw new Error(
      `The Noland checkout resolved to "${NOLAND.repo}" (${NOLAND.why}) but these expected ` +
        `file(s) are missing: ${missing.join(', ')}. Fix the path, or the rename on the other ` +
        'side; a resolved repo must not silently skip.',
    );
  }
}
