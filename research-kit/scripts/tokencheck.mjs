import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveTokens } from '../contract/resolve.mjs';
import { checkAdapter } from '../contract/checks.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const [adapterPath, ...basePaths] = process.argv.slice(2);

if (!adapterPath) {
  console.error('usage: node research-kit/scripts/tokencheck.mjs <adapter.css> <base.css> [more-base.css...]');
  console.error('the base stylesheets are the design system the adapter maps onto, in precedence order');
  process.exit(2);
}

const contract = JSON.parse(readFileSync(join(HERE, '../contract/tokens.contract.json'), 'utf8'));
/* Base first, adapter last: the adapter is allowed to override the system it
   maps onto, and never the other way round. */
const texts = [...basePaths, adapterPath].map((p) => readFileSync(p, 'utf8'));
const { ok, findings, measures } = checkAdapter({ contract, tokens: resolveTokens(texts) });

const order = { contrast: 0, monotonic: 1, series: 2, mark: 3 };
for (const m of [...measures].sort((a, b) => (order[a.check] - order[b.check]) || (a.value - b.value))) {
  const unit = m.check === 'contrast' || (m.check === 'series' && m.pair[1] === '--ct-ground') ? ':1'
    : m.check === 'monotonic' ? ' ΔL' // OKLab lightness only, not full ΔE
    : ' dE';
  const mark = m.value >= m.floor ? 'ok  ' : 'FAIL';
  console.log(`${mark} ${m.check.padEnd(9)} ${m.pair[0]} / ${m.pair[1]}  ${m.value.toFixed(3)}${unit} (floor ${m.floor})`);
}

console.log('');
if (ok) {
  console.log(`${adapterPath}: passes, ${measures.length} comparisons made`);
} else {
  for (const f of findings) console.log(`FAIL [${f.check}] ${f.token}: ${f.message}`);
  console.log('');
  console.log(`${adapterPath}: ${findings.length} finding(s)`);
}
process.exitCode = ok ? 0 : 1;
