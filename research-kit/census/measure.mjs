const FURNITURE = /Cover|Divider|Agenda|Disclaimer|Closing|Thank/;

/** The leading run of non-empty lines before the first blank line, capped at 3. */
function titleLines(raw) {
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) {
      if (out.length) break;
      continue;
    }
    out.push(line.trim());
    if (out.length >= 3) break;
  }
  return out;
}

export function titleBlock(raw) {
  return titleLines(raw).join(' ');
}

export function titleLineCount(raw) {
  return titleLines(raw).length;
}

export function pageWords(raw) {
  return raw.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export function hasNumber(text) {
  return /\d/.test(text);
}

/* A prose chunk: long enough to be running text, mostly letters, almost no
   digits. The digit test is what separates a sentence from a table cell, and
   it is the whole reason the naive gap test overcounted. */
function isProseChunk(s) {
  if (s.length <= 35) return false;
  const letters = (s.match(/[A-Za-z]/g) || []).length;
  if (letters <= 25) return false;
  const digits = (s.match(/\d/g) || []).length;
  return digits / s.length < 0.05;
}

export function multiColumnProseLines(raw) {
  return raw.split('\n').filter((line) => {
    const parts = line.split(/ {4,}/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 2) return false;
    return parts.filter(isProseChunk).length >= 2;
  }).length;
}

export function isFurniture(roles) {
  return roles.some((r) => FURNITURE.test(r));
}
