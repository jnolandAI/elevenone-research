import { dotRamp } from '../lib/charts/halftone';

/**
 * The drawn depth on a large panel, sized to the panel's real pixel box.
 *
 * This cannot be done at build: the ramp is drawn at the panel's dimensions so
 * the lattice pitch is right, and preserveAspectRatio="none" on a build-time
 * SVG would stretch round dots into ellipses. Without this script the panel
 * still has its gradient and its elevation.
 */
const panel = document.getElementById('path');
const target = document.getElementById('pathScreen');

function render(): void {
  if (!panel || !target) return;
  const r = panel.getBoundingClientRect();
  if (r.width < 2) return;
  target.innerHTML = dotRamp(Math.round(r.width), Math.round(r.height), {
    pitch: 13,
    rmax: 2.15,
    alpha: 0.44,
  });
}

render();
if ('ResizeObserver' in window && panel) new ResizeObserver(render).observe(panel);
