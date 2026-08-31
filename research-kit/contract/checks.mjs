import { parseHex, contrastRatio, deltaEOK, toOklab } from './color.mjs';

/* Primary sort key for the measures the CLI prints. Every check name that can
   push a row into `measures` below must have an entry here: a name missing
   from this map yields `undefined` and puts a NaN into the CLI's comparator,
   silently corrupting the sort order and any labels derived from it. This
   hazard has already been hand-fixed twice (once when the map was written,
   once when `perceptible` was added) and tests/tokencheck.test.ts now checks
   that every check name the fixture actually produces appears as a key here,
   so a new check that forgets to register itself fails a test instead of
   recurring a third time. */
export const MEASURE_ORDER = {
  contrast: 0, perceptible: 1, monotonic: 2, series: 3, mark: 4,
  // The brand-expression checks, added 2026-08-31 with the line and shape
  // groups. `length` produces findings only (an unparseable value), never a
  // measure, but it is registered anyway: the cost of an unused entry is
  // nothing and the cost of a missing one is a NaN in the CLI's comparator.
  ordered: 5, bounded: 6, length: 7,
};

/* The spec asks tokencheck to make five checks: presence, contrast,
   monotonic, series, mark. `perceptible` is not one of them: it was added
   later, by the recessive-axis plan, to hold a rule that recedes to being
   perceptible against its ground rather than to the graphical contrast floor
   the other non-text objects carry.

   The sections numbered below run 1 to 6 (1 presence, 2 colour, 3 contrast,
   4 monotonic, 5 series, 6 mark) and are a different list from the one above:
   `colour` is a prerequisite the spec's five checks all depend on, not a
   sixth thing the spec asked for, and `perceptible` carries no section
   number of its own because it lives inside section 3, run immediately after
   the graphicalOn contrast loop rather than as a numbered section of its own.

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

  //    A recessive mark is the exception, and it is an exception with its own
  //    bar rather than an exemption. A rule that only says where zero is does
  //    not have to be findable, but it does have to be there: measured as
  //    perceptual distance from its own ground, not as contrast against it.
  for (const { token, ground } of roles.perceptibleOn) {
    if (!have(token, ground)) continue;
    const value = deltaEOK(rgb.get(token), rgb.get(ground));
    const floor = th('recessiveDeltaEOK');
    measures.push({ check: 'perceptible', pair: [token, ground], value, floor });
    if (value < floor) {
      fail('perceptible', token, `${value.toFixed(3)} in OKLab from ${ground}, needs ${floor}. A recessive mark may be quiet; it may not be invisible.`);
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

  // 7. Lengths. The brand-expression half of the contract: weights and radii
  //    are the brand's to choose and the kit's to place. Two things are
  //    checked, and neither is a matter of taste.
  //
  //    Ordering, because the kit reads hierarchy out of it. deck.css draws a
  //    row divider at hair, an emphatic division at bold and the loudest
  //    division a page carries at heavy. Those names ARE the structure; the
  //    numbers behind them are identity. A brand that sets bold lighter than
  //    hair has not restyled anything, it has inverted what the page says
  //    about which division matters, which is the one thing brand expression
  //    is not allowed to do.
  //
  //    Bounds, because a division that cannot be seen is not a division and a
  //    division heavy enough to be a shape is a third element between two
  //    others. Both change what the page argues rather than how it looks.
  const lengths = roles.lengths;
  if (lengths) {
    // "1px" | "1" | "0.5px" -> number. A length that is not a plain px value
    // (a calc(), a var() that resolved to another var(), an em) is reported
    // rather than guessed at: the whole point is that these are comparable.
    //
    //    Memoised, so one unmeasurable token is one finding. Each name is
    //    read by up to three checks (twice by the ordering pass, which sees
    //    it as both the heavier and the lighter side of a pair, and once by
    //    the bounds pass), and an uncached version reported the same defect
    //    three times. A validator that says a thing three times reads as
    //    three problems.
    const seen = new Map();
    const px = (name) => {
      if (seen.has(name)) return seen.get(name);
      const raw = tokens.get(name);
      let out = null;
      if (raw !== undefined && raw.trim() !== '') {
        const m = raw.trim().match(/^(-?[0-9]*\.?[0-9]+)(px)?$/);
        if (m) out = parseFloat(m[1]);
        else fail('length', name, `resolves to "${raw.trim()}", which is not a plain px length. Weights and radii are compared against each other and against floors, so they have to be measurable.`);
      }
      seen.set(name, out);
      return out;
    };

    for (const { names, why, blame } of lengths.ordered ?? []) {
      for (let i = 1; i < names.length; i++) {
        const lo = px(names[i - 1]);
        const hi = px(names[i]);
        if (lo === null || hi === null) continue;
        measures.push({ check: 'ordered', pair: [names[i], names[i - 1]], value: hi - lo, floor: 0 });
        if (hi < lo) {
          // Which token to report against. The constraint is symmetric but
          // the mistake is not: on the weight ladder the brand set the
          // heavier step too light (blame the upper name, the default), and
          // on the tick-against-lane pair it drew the tick too long rather
          // than the lane too narrow (blame the lower). Reporting the wrong
          // side sends someone to change the token that was already right.
          const at = blame === 'lower' ? names[i - 1] : names[i];
          fail(
            'ordered',
            at,
            `${names[i]} is ${hi}px and ${names[i - 1]} is ${lo}px, so ${names[i]} is the smaller of the two. ${why}`,
          );
        }
      }
    }

    for (const { name, floor, ceiling, allowZero } of lengths.bounded ?? []) {
      const v = px(name);
      if (v === null) continue;
      // Zero is a decision, not a small number. A brand may say "no frame" or
      // "no rule under the title" and mean it, and that is a different claim
      // from a rule drawn too faintly to survive an export. Absent is allowed
      // where the kit's own default is absent; drawn-but-invisible never is.
      if (allowZero && v === 0) continue;
      if (floor) {
        const f = th(floor);
        measures.push({ check: 'bounded', pair: [name, `floor ${floor}`], value: v, floor: f });
        if (v < f) fail('bounded', name, `${v}px is under the ${f}px floor. ${contract.thresholds[floor].why}`);
      }
      if (ceiling) {
        const c = th(ceiling);
        // Recorded as headroom so the printed row reads the same direction as
        // every other measure: a positive number passes.
        measures.push({ check: 'bounded', pair: [name, `ceiling ${ceiling}`], value: c - v, floor: 0 });
        if (v > c) fail('bounded', name, `${v}px is over the ${c}px ceiling. ${contract.thresholds[ceiling].why}`);
      }
    }
  }

  return { ok: findings.length === 0, findings, measures };
}
