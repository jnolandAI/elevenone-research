import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadPatterns, makeClassifier, deckOf } from './corpus.mjs';
import { aggregate } from './aggregate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const CORPUS = process.argv[2] || 'C:/Projects/ExampleSlides';
const { classifyDeck, population } = makeClassifier(loadPatterns(CORPUS));

const text = JSON.parse(readFileSync(join(CORPUS, 'logs/slide-text.json'), 'utf8'));
const tags = JSON.parse(readFileSync(join(CORPUS, 'logs/slide-tags.json'), 'utf8'));

const pagesFor = (which) => {
  const out = [];
  for (const deck of Object.keys(text)) {
    if (!population(deck, which)) continue;
    for (const [page, raw] of Object.entries(text[deck])) {
      const meta = tags[`${deck}::${page}`] || {};
      out.push({ deck, page: Number(page), roles: meta.role || [], visual: meta.visual || [], raw });
    }
  }
  return out;
};

const deckLengths = (which) => {
  const counts = {};
  for (const key of Object.keys(tags)) {
    const deck = deckOf(key);
    if (!population(deck, which)) continue;
    counts[deck] = (counts[deck] || 0) + 1;
  }
  const lengths = Object.values(counts).sort((a, b) => a - b);
  const at = (p) => lengths[Math.floor((lengths.length - 1) * p)];
  return {
    decks: lengths.length,
    median: at(0.5), p25: at(0.25), p75: at(0.75), p90: at(0.9),
    bands: {
      to20: lengths.filter((c) => c <= 20).length,
      from21to40: lengths.filter((c) => c >= 21 && c <= 40).length,
      from41to70: lengths.filter((c) => c >= 41 && c <= 70).length,
      over70: lengths.filter((c) => c > 70).length,
    },
  };
};

const decks = Object.keys(text);
const result = {
  corpus: {
    decks: decks.length,
    pages: Object.keys(tags).length,
    client: decks.filter((d) => classifyDeck(d) === 'client').length,
    published: decks.filter((d) => classifyDeck(d) === 'published').length,
    unplaced: decks.filter((d) => classifyDeck(d) === 'unplaced').length,
  },
  strict: aggregate(pagesFor('strict')),
  broadLengths: deckLengths('broad'),
};

mkdirSync(join(HERE, 'out'), { recursive: true });
mkdirSync(join(HERE, 'data'), { recursive: true });
writeFileSync(join(HERE, 'data/text-census.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
