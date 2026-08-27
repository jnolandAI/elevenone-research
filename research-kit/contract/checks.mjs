import { parseHex, contrastRatio, deltaEOK, toOklab } from './color.mjs';

/* The five checks the spec asks tokencheck to make (presence, contrast,
   monotonic, series, mark), plus the one that has to run before any of the
   other four mean anything: is it a colour.

   Every numeric comparison is pushed to `measures` whether it passes or fails.
   A validator that only prints failures tells you nothing about how close the
   passes were, and these thresholds sit close enough to the real ramps that
   the margins are the interesting part. */

export function checkAdapter({ contract, tokens }) {
  const findings = [];
  const measures = [];
  const fail = (check, token, message) => findings.push({ check, token, message });

  const groups = contract.groups;
  const roles = contract.roles;
  const th = (k) => contract.thresholds[k].value;
  const allNames = Object.values(groups).flatMap((g) => g.names);

  // 1. Presence. Declared, and not resolved away to nothing.
  for (const name of allNames) {
    const v = tokens.get(name);
    if (v === undefined) fail('presence', name, 'not declared by the adapter');
    else if (v.trim() === '') fail('presence', name, 'declared but resolves to nothing, so a var() points at a name the base stylesheet does not declare');
  }

  // 2. Colour. Every name with a colour job resolves to a parseable colour.
  const rgb = new Map();
  for (const name of roles.colourNames) {
    const v = tokens.get(name);
    if (v === undefined || v.trim() === '') continue; // already reported
    const c = parseHex(v);
    if (!c) fail('colour', name, `resolves to "${v}", which is not a hex colour`);
    else rgb.set(name, c);
  }

  const have = (...names) => names.every((n) => rgb.has(n));

  // 3. Contrast. Text against every ground it is declared to sit on, and
  //    non-text objects against theirs. Body floor for type, because both
  //    systems set body under 18px and the small end is what binds.
  for (const [token, grounds] of Object.entries(roles.textOn)) {
    for (const ground of grounds) {
      if (!have(token, ground)) continue;
      const value = contrastRatio(rgb.get(token), rgb.get(ground));
      const floor = th('bodyContrast');
      measures.push({ check: 'contrast', pair: [token, ground], value, floor });
      if (value < floor) {
        fail('contrast', token, `${value.toFixed(2)}:1 on ${ground}, needs ${floor}:1`);
      }
    }
  }
  for (const { token, ground } of roles.graphicalOn) {
    if (!have(token, ground)) continue;
    const value = contrastRatio(rgb.get(token), rgb.get(ground));
    const floor = th('graphicalContrast');
    measures.push({ check: 'contrast', pair: [token, ground], value, floor });
    if (value < floor) {
      fail('contrast', token, `${value.toFixed(2)}:1 on ${ground}, needs ${floor}:1 as a non-text object`);
    }
  }

  // 4. Monotonic. An ordinal or sequential scale has to ramp in one direction
  //    in perceptual lightness, and each step has to be separable from the one
  //    beside it. Direction is taken from the first step, not assumed. The
  //    step-size floor is measured in OKLab L alone, not full OKLab distance:
  //    a ramp is read AS lightness, so letting chroma substitute for it here
  //    would hold a chromatic system to a weaker bar than a neutral one, on
  //    the one scale where that would matter. seriesDeltaEOK and markDeltaEOK
  //    stay full ΔE below, because those are categorical distinctions where
  //    hue is a legitimate separator.
  const checkRamp = (label, names) => {
    if (!names.every((n) => rgb.has(n))) return;
    const ls = names.map((n) => toOklab(rgb.get(n)).L);
    const rising = ls[1] > ls[0];
    for (let i = 1; i < names.length; i++) {
      const step = ls[i] - ls[i - 1];
      const stepOk = rising ? step > 0 : step < 0;
      if (!stepOk) {
        fail('monotonic', names[i], `${label} reverses direction at ${names[i]}: L goes ${ls[i - 1].toFixed(3)} to ${ls[i].toFixed(3)}`);
      }
      const value = Math.abs(ls[i] - ls[i - 1]);
      const floor = th('scaleStepDeltaL');
      measures.push({ check: 'monotonic', pair: [names[i - 1], names[i]], value, floor });
      if (value < floor) {
        fail('monotonic', names[i], `${label} step from ${names[i - 1]} is ${value.toFixed(3)} in OKLab L, needs ${floor}`);
      }
    }
  };
  checkRamp('ordinal scale', roles.ordinal);
  checkRamp('sequential scale', roles.sequential);

  // 5. Series. Mutually distinguishable, and each one visible on the ground.
  //    Distance in OKLab, not luminance contrast: one system separates series
  //    by hue and the other by value, and a luminance test would reject the
  //    chromatic pair while passing a neutral pair nobody can read.
  const series = roles.series.filter((n) => rgb.has(n));
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const value = deltaEOK(rgb.get(series[i]), rgb.get(series[j]));
      const floor = th('seriesDeltaEOK');
      measures.push({ check: 'series', pair: [series[i], series[j]], value, floor });
      if (value < floor) {
        fail('series', series[j], `${value.toFixed(3)} in OKLab from ${series[i]}, needs ${floor}`);
      }
    }
    if (have(series[i], '--ct-ground')) {
      const value = contrastRatio(rgb.get(series[i]), rgb.get('--ct-ground'));
      const floor = th('graphicalContrast');
      measures.push({ check: 'series', pair: [series[i], '--ct-ground'], value, floor });
      if (value < floor) {
        fail('series', series[i], `${value.toFixed(2)}:1 on the ground, needs ${floor}:1 to be visible at all`);
      }
    }
  }

  // 6. Mark. Perceptibly distinct from every neighbour it sits among, by any
  //    means: the fill it stands out from and the field it sits on.
  const { token: markToken, distinctFrom } = roles.mark;
  for (const neighbour of distinctFrom) {
    if (!have(markToken, neighbour)) continue;
    const value = deltaEOK(rgb.get(markToken), rgb.get(neighbour));
    const floor = th('markDeltaEOK');
    measures.push({ check: 'mark', pair: [markToken, neighbour], value, floor });
    if (value < floor) {
      fail('mark', markToken, `${value.toFixed(3)} in OKLab from ${neighbour}, needs ${floor}. The mark can differ by hue or by value; it cannot differ by neither.`);
    }
  }

  return { ok: findings.length === 0, findings, measures };
}
