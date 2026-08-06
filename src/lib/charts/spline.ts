/**
 * Catmull-Rom through the points, emitted as cubic Beziers. Ported unchanged
 * from prototypes/brief.html so the curve is the same curve.
 */
export function spline(p: [number, number][]): string {
  if (p.length === 0) return '';
  let d = 'M' + p[0]![0].toFixed(1) + ',' + p[0]![1].toFixed(1);
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i]!;
    const b = p[i]!;
    const c = p[i + 1]!;
    const e = p[i + 2] ?? c;
    d +=
      'C' + (b[0] + (c[0] - a[0]) / 6).toFixed(1) + ',' + (b[1] + (c[1] - a[1]) / 6).toFixed(1) +
      ' ' + (c[0] - (e[0] - b[0]) / 6).toFixed(1) + ',' + (c[1] - (e[1] - b[1]) / 6).toFixed(1) +
      ' ' + c[0].toFixed(1) + ',' + c[1].toFixed(1);
  }
  return d;
}
