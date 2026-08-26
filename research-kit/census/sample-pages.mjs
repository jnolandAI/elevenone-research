import { isFurniture } from './measure.mjs';

/* When a stratum holds more decks than sample slots, taking the first `slots`
   decks in sort order samples only the alphabetically early ones, which is the
   clustering this sampler exists to avoid. Walking the sorted list at an even
   stride spans it end to end instead, including the last deck, and stays
   deterministic. Below the cap every deck is kept. */
export function spreadDecks(decks, slots) {
  if (decks.length <= slots) return decks;
  if (slots === 1) return [decks[0]];
  const last = decks.length - 1;
  return Array.from({ length: slots }, (_, i) => decks[Math.round((i * last) / (slots - 1))]);
}

/* Round-robin over the spread decks, so a sample of 12 charts comes from 12
   different decks where the corpus allows it. Deterministic: no randomness, so
   a rerun produces the same sheet and a finding stays citable. */
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
    const byDeck = byStratum.get(stratum);
    const allDecks = [...byDeck.keys()].sort();
    for (const deck of allDecks) byDeck.get(deck).sort((a, b) => a.page - b.page);
    const decks = spreadDecks(allDecks, perStratum);

    let taken = 0, round = 0;
    while (taken < perStratum) {
      let progressed = false;
      for (const deck of decks) {
        if (taken >= perStratum) break;
        const list = byDeck.get(deck);
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
