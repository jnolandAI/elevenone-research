import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

// Any test that renders a component calling getCollection/getEntry (see
// tests/home.test.ts) needs Astro's content layer cache to exist first.
//
// Vitest's own Vite invocation always resolves as command "serve", and
// Astro's content-layer plugin only reads the dev-mode cache
// (.astro/data-store.json) in that mode: `astro build` and `astro sync`
// write to node_modules/.astro/data-store.json instead, which a plain
// `vitest run` never looks at, so the collection resolves to "does not
// exist" with no build or sync step run first. This primes it: run `astro
// sync` (fast, no client build) to produce the build-mode cache, then copy
// it into the dev-mode path Vitest actually reads. Both are the same file
// format; only the directory differs.
function newestMtimeUnder(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtimeUnder(full) : statSync(full).mtimeMs);
  }
  return newest;
}

export default async function setup() {
  const root = process.cwd();
  const devStoreFile = path.join(root, '.astro', 'data-store.json');
  const buildStoreFile = path.join(root, 'node_modules', '.astro', 'data-store.json');
  const contentDir = path.join(root, 'src', 'content');
  const configFile = path.join(root, 'src', 'content.config.ts');

  const newestSource = Math.max(
    existsSync(contentDir) ? newestMtimeUnder(contentDir) : 0,
    existsSync(configFile) ? statSync(configFile).mtimeMs : 0,
  );
  const devStoreIsFresh = existsSync(devStoreFile) && statSync(devStoreFile).mtimeMs >= newestSource;
  if (devStoreIsFresh) return;

  // node_modules/.bin/astro is a shell shim (a .cmd file on Windows), which
  // needs a real shell to exec and a shell mis-splits a path containing a
  // space (this repo's root does). Running the CLI's actual JS entry point
  // through the same node binary already running this script sidesteps both.
  const astroCli = path.join(root, 'node_modules', 'astro', 'astro.js');
  execFileSync(process.execPath, [astroCli, 'sync'], { cwd: root, stdio: 'inherit' });

  mkdirSync(path.dirname(devStoreFile), { recursive: true });
  copyFileSync(buildStoreFile, devStoreFile);
}
