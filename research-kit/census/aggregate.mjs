import {
  titleBlock, titleLineCount, pageWords, hasNumber,
  multiColumnProseLines, isFurniture,
} from './measure.mjs';

const stats = (values) => {
  const s = [...values].sort((a, b) => a - b);
  const at = (p) => (s.length ? s[Math.floor((s.length - 1) * p)] : 0);
  return { median: at(0.5), p25: at(0.25), p75: at(0.75), p90: at(0.9) };
};

const share = (counts, total) => {
  const out = {};
  for (const [k, v] of Object.entries(counts)) out[k] = Math.round((v / total) * 100);
  return out;
};

export function aggregate(pages) {
  const working = pages.filter((p) => !isFurniture(p.roles));
  const words = [], titleWords = [];
  let wrapped = 0, numbered = 0, multiCol = 0;
  const visual = {}, role = {};

  for (const p of working) {
    words.push(pageWords(p.raw));
    const title = titleBlock(p.raw);
    titleWords.push(title.split(/\s+/).filter(Boolean).length);
    if (titleLineCount(p.raw) >= 2) wrapped++;
    if (hasNumber(title)) numbered++;
    if (multiColumnProseLines(p.raw) >= 3) multiCol++;
    for (const v of p.visual) visual[v] = (visual[v] || 0) + 1;
    for (const r of p.roles) role[r] = (role[r] || 0) + 1;
  }

  const n = working.length || 1;
  const visualTotal = Object.values(visual).reduce((a, b) => a + b, 0) || 1;
  const roleTotal = Object.values(role).reduce((a, b) => a + b, 0) || 1;

  return {
    n: working.length,
    words: stats(words),
    titleWords: stats(titleWords),
    titleWrapPct: Math.round((wrapped / n) * 100),
    titleNumberPct: Math.round((numbered / n) * 100),
    multiColumnPct: Math.round((multiCol / n) * 100),
    visualMix: share(visual, visualTotal),
    roleMix: share(role, roleTotal),
  };
}
