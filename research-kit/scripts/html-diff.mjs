import { readFileSync } from 'node:fs';

/**
 * Compare two markup captures.
 *
 * Sibling to paint-diff.mjs and it exists because that script cannot see
 * markup. It compares computed style, so a changed alt, a dropped aria-label
 * or a reordered attribute passes it silently. Across a 97-page migration
 * that is the whole risk.
 */
export function compare(a, b) {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length === 0 || keysB.length === 0) {
    throw new Error(
      `refusing to diff: ${keysA.length} against ${keysB.length} slides. ` +
        'An empty capture proves nothing either way.',
    );
  }
  if (keysA.length !== keysB.length) {
    throw new Error(
      `refusing to call this identical: ${keysA.length} slide(s) against ` +
        `${keysB.length} slide(s). Counts differ before a byte is compared.`,
    );
  }
  const out = [];
  for (const k of new Set([...keysA, ...keysB])) {
    if (a[k] !== b[k]) out.push({ key: k, a: a[k] ?? '', b: b[k] ?? '' });
  }
  return out;
}

/** First index at which two strings diverge, for a readable report. */
function firstDivergence(x, y) {
  const n = Math.min(x.length, y.length);
  for (let i = 0; i < n; i++) if (x[i] !== y[i]) return i;
  return n;
}

if (process.argv[1] && process.argv[1].endsWith('html-diff.mjs')) {
  const [pathA, pathB] = process.argv.slice(2);
  const [a, b] = [pathA, pathB].map((p) => JSON.parse(readFileSync(p, 'utf8')));
  let diffs;
  try {
    diffs = compare(a, b);
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
    process.exit();
  }
  for (const d of diffs) {
    const i = firstDivergence(d.a, d.b);
    console.log(`slide ${d.key}, first difference at ${i}:`);
    console.log(`  before  ...${d.a.slice(Math.max(0, i - 60), i + 60)}...`);
    console.log(`  after   ...${d.b.slice(Math.max(0, i - 60), i + 60)}...`);
  }
  console.log(diffs.length === 0 ? 'identical' : `${diffs.length} slide(s) differ`);
}
