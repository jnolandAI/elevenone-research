/**
 * Minutes, from the MDX body. Computed at build rather than from innerText on
 * load, so the figure is in the HTML and is the same for every reader.
 */
export function readTime(body: string, wordsPerMinute = 220): number {
  const prose = body
    .replace(/^import .*$/gm, '')
    .replace(/<\/?[A-Z][\w.]*(\s[^>]*)?>/g, ' ')
    .replace(/[#*_`>|-]/g, ' ');
  const words = prose.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / wordsPerMinute));
}
