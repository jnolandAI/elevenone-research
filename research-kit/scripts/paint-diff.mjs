import { readFileSync } from 'node:fs';

const [pathA, pathB] = process.argv.slice(2);
const [a, b] = [pathA, pathB].map((p) => JSON.parse(readFileSync(p, 'utf8')));
const keysA = Object.keys(a);
const keysB = Object.keys(b);

// A capture with nothing in it is not evidence of anything. Reporting
// "identical" for two empty objects is how the Base.astro regression slipped
// through: both /  and /memo captured zero .slide elements, so the diff had
// nothing to compare and called that a pass.
if (keysA.length === 0 || keysB.length === 0) {
  console.error(
    `refusing to diff: ${pathA} has ${keysA.length} keys, ${pathB} has ${keysB.length} keys. ` +
    `An empty capture proves nothing either way.`
  );
  process.exitCode = 1;
  process.exit();
}

if (keysA.length !== keysB.length) {
  console.error(
    `refusing to call this identical: ${pathA} has ${keysA.length} keys, ${pathB} has ` +
    `${keysB.length} keys. Element counts differ before a single property is compared.`
  );
  process.exitCode = 1;
  process.exit();
}

const keys = new Set([...keysA, ...keysB]);
let changed = 0;
for (const k of keys) {
  if (!a[k]) { console.log(`ADDED   ${k}`); changed++; continue; }
  if (!b[k]) { console.log(`REMOVED ${k}`); changed++; continue; }
  for (const p of Object.keys(a[k])) {
    if (a[k][p] !== b[k][p]) {
      console.log(`${k}  ${p}: ${a[k][p]} -> ${b[k][p]}`);
      changed++;
    }
  }
}
console.log(changed === 0 ? 'identical' : `${changed} difference(s)`);
process.exitCode = 0; // reporting tool, not a gate; the plan's step is the gate
