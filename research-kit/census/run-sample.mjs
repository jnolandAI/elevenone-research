import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPatterns, makeClassifier, deckOf, pageOf } from './corpus.mjs';
import { stratify } from './sample-pages.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = process.argv[2] || 'C:/Projects/ExampleSlides';
const PER = Number(process.argv[3] || 12);
const { population } = makeClassifier(loadPatterns(CORPUS));

const tags = JSON.parse(readFileSync(join(CORPUS, 'logs/slide-tags.json'), 'utf8'));
const entries = Object.keys(tags)
  .filter((k) => population(deckOf(k), 'strict'))
  .map((k) => ({
    deck: deckOf(k),
    page: pageOf(k),
    roles: tags[k].role || [],
    visual: tags[k].visual || [],
  }));

const sample = stratify(entries, PER);
const sheet = sample
  .map((s) => `- [ ] ${s.stratum} :: ${s.deck} :: page_${String(s.page).padStart(3, '0')}.png`)
  .join('\n');

mkdirSync(join(HERE, 'out'), { recursive: true });
writeFileSync(
  join(HERE, 'out/visual-sample.md'),
  `# Visual read sample\n\n${sample.length} pages, ${PER} per visual stratum.\n\n${sheet}\n`
);
console.log(`${sample.length} pages written to out/visual-sample.md`);
