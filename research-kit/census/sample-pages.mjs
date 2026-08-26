import { isFurniture } from './measure.mjs';

/* Round-robin over decks inside each visual stratum, so a sample of 8 charts
   comes from 8 different decks where the corpus allows it. Deterministic: no
   randomness, so a rerun produces the same sheet and a finding stays citable. */
export function stratify(entries, perStratum) {
  const byStratum = new Map();
  for (const entry of entries) {
    if (isFurniture(entry.roles)) continue;
    const stratum = entry.visual[0] || 'Untagged';
    if (!byStratum.has(stratum)) byStratum.set(stratum, new Map());
    const byDeck = byStratum.get(stratum);
    if (!byDeck.has(entry.deck)) byDeck.set(entry.deck, []);
    byDeck.get(entry.deck).push(entry);
  }

  const out = [];
  for (const stratum of [...byStratum.keys()].sort()) {
    const decks = [...byStratum.get(stratum).keys()].sort();
    for (const list of decks.map((d) => byStratum.get(stratum).get(d))) {
      list.sort((a, b) => a.page - b.page);
    }
    let taken = 0, round = 0;
    while (taken < perStratum) {
      let progressed = false;
      for (const deck of decks) {
        if (taken >= perStratum) break;
        const list = byStratum.get(stratum).get(deck);
        if (round < list.length) {
          out.push({ deck, page: list[round].page, stratum });
          taken++;
          progressed = true;
        }
      }
      if (!progressed) break;
      round++;
    }
  }
  return out;
}
