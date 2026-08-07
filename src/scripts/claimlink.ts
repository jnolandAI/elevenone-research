/**
 * The marked sentence and its rail entry light together, from either end.
 *
 * Not a tooltip and not a modal: rule 6 of docs/the-working.md. Everything is
 * already on the page and visible. This only makes the correspondence between
 * a sentence and its apparatus easy to see.
 */
function link(key: string, on: boolean): void {
  document.getElementById(`t-${key}`)?.classList.toggle('lit', on);
  document.getElementById(`c-${key}`)?.classList.toggle('lit', on);
}

for (const el of document.querySelectorAll<HTMLElement>('[data-for]')) {
  const key = el.dataset.for;
  if (!key) continue;
  el.addEventListener('pointerenter', () => link(key, true));
  el.addEventListener('pointerleave', () => link(key, false));
  el.addEventListener('focusin', () => link(key, true));
  el.addEventListener('focusout', () => link(key, false));
}

/**
 * Every claim prints open, in every browser.
 *
 * print.css opens them with ::details-content, which Chromium supports and
 * other engines do not yet. This is the fallback: force every rail claim open
 * before the dialog and restore the reader's own state afterwards, so what
 * they had expanded on screen is still expanded when they come back.
 *
 * Without it, a reader printing from a browser without ::details-content gets
 * the claims and none of their working, which is the one thing a printed brief
 * exists to carry.
 */
const railClaims = () => document.querySelectorAll<HTMLDetailsElement>('.rail details');
let wasOpen: boolean[] = [];

addEventListener('beforeprint', () => {
  const claims = [...railClaims()];
  wasOpen = claims.map((d) => d.open);
  for (const d of claims) d.open = true;
});

addEventListener('afterprint', () => {
  [...railClaims()].forEach((d, i) => { d.open = wasOpen[i] ?? false; });
});

// following a marker opens the claim it points at
for (const a of document.querySelectorAll<HTMLAnchorElement>('a.cm')) {
  a.addEventListener('click', () => {
    const key = a.dataset.for;
    if (!key) return;
    const details = document.getElementById(`c-${key}`);
    if (details instanceof HTMLDetailsElement) details.open = true;
  });
}
