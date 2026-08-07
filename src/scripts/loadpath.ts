import { WIRE } from '../lib/standing';
import type { Standing } from '../content.config';

/**
 * The wires from the conclusion down to the claims that carry it.
 *
 * Drawn in the browser because the geometry is real: the members are an
 * auto-fit grid and their positions are only known once laid out. Each wire is
 * drawn at the weight of its own claim, so the thinnest line in the object is
 * always the one holding the least.
 */
const panel = document.getElementById('path');
const wires = document.getElementById('wires');
const concl = document.getElementById('concl');

const wire = (d: string, st: { w: number; c: string; o: number }) =>
  `<path d="${d}" fill="none" stroke="${st.c}" stroke-width="${st.w}" ` +
  `stroke-linecap="round" stroke-linejoin="round" opacity="${st.o}"/>`;

const stanceOf = (el: HTMLElement) =>
  WIRE[(el.dataset.stance as Standing) ?? 'supported'] ?? WIRE.supported;

function draw(): void {
  if (!panel || !wires || !concl) return;
  const box = panel.getBoundingClientRect();
  const f = concl.getBoundingClientRect();
  const members = [...document.querySelectorAll<HTMLElement>('#members .member')];
  if (!members.length) return;
  const rects = members.map((m) => m.getBoundingClientRect());

  const fx = f.left - box.left + f.width / 2;
  const fy = f.bottom - box.top;

  // When the members stack on a narrow viewport the fan becomes a spine with
  // branches. A fan of curves passing behind the upper cards reads as a chain
  // of A to B to C, which is a different and false claim about the argument.
  const stacked = rects.length > 1 && Math.abs(rects[0]!.left - rects[1]!.left) < 4;

  let out = '';
  if (stacked) {
    const gx = Math.min(...rects.map((r) => r.left)) - box.left - 16;
    const enter = 34;
    const lastY = rects[rects.length - 1]!.top - box.top + enter;
    out += wire(
      `M ${fx.toFixed(1)} ${fy.toFixed(1)} C ${fx.toFixed(1)} ${(fy + 30).toFixed(1)}, ` +
      `${gx.toFixed(1)} ${(fy + 16).toFixed(1)}, ${gx.toFixed(1)} ${(fy + 52).toFixed(1)} ` +
      `L ${gx.toFixed(1)} ${lastY.toFixed(1)}`,
      { w: 1.3, c: '#7D7D7D', o: 0.9 },
    );
    members.forEach((m, i) => {
      const r = rects[i]!;
      const ty = r.top - box.top + enter;
      const tx = r.left - box.left;
      out += wire(
        `M ${gx.toFixed(1)} ${(ty - 30).toFixed(1)} C ${gx.toFixed(1)} ${(ty - 8).toFixed(1)}, ` +
        `${(gx + 2).toFixed(1)} ${ty.toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`,
        stanceOf(m),
      );
    });
  } else {
    members.forEach((m, i) => {
      const r = rects[i]!;
      const tx = r.left - box.left + r.width / 2;
      const ty = r.top - box.top;
      const dy = Math.max(28, (ty - fy) * 0.55);
      out += wire(
        `M ${fx.toFixed(1)} ${fy.toFixed(1)} C ${fx.toFixed(1)} ${(fy + dy).toFixed(1)}, ` +
        `${tx.toFixed(1)} ${(ty - dy).toFixed(1)}, ${tx.toFixed(1)} ${ty.toFixed(1)}`,
        stanceOf(m),
      );
    });
  }

  wires.innerHTML = out;
  for (const p of wires.querySelectorAll('path')) {
    p.style.setProperty('--len', p.getTotalLength().toFixed(0));
  }
}

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (panel) {
  if (reduced) {
    panel.classList.add('on');
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(panel);
  }

  draw();
  window.addEventListener('load', draw);
  if ('ResizeObserver' in window) new ResizeObserver(draw).observe(panel);
  // the wires are measured against laid-out text, so they are redrawn once the
  // real faces have replaced the fallbacks
  document.fonts?.ready.then(draw);
}
