import type { Claim, Standing } from '../content.config';
import { TONES, INK } from './chart-tones';

/** Lower is firmer. */
export const STANDING_ORDER: Record<Standing, number> = {
  firm: 0,
  supported: 1,
  provisional: 2,
};

export function weakest(standings: Standing[]): Standing {
  if (standings.length === 0) throw new Error('weakest() needs at least one standing');
  return standings.reduce((a, b) => (STANDING_ORDER[b] > STANDING_ORDER[a] ? b : a));
}

/**
 * Rule 3 of docs/the-working.md, as arithmetic.
 *
 * A conclusion is never rendered firmer than the weakest claim it rests on.
 * The cap is mechanical and it is not overridden. Raising a conclusion means
 * testing the weak claim or dropping it from the path. Restyling the object
 * is not one of the options, which is why nothing here takes an override.
 *
 * Claims held but kept off the load path do not cap anything, because nothing
 * in the conclusion rests on them.
 */
export function capOf(
  claims: Claim[],
  memberIds: string[],
): { standing: Standing; cappedBy: string[] } {
  if (memberIds.length === 0) {
    throw new Error('a load path with no members carries no conclusion');
  }
  const byId = new Map(claims.map((c) => [c.id, c]));
  const members = memberIds.map((id) => {
    const found = byId.get(id);
    if (!found) throw new Error(`load path member ${id} does not resolve to a claim`);
    return found;
  });
  const standing = weakest(members.map((m) => m.standing));
  const cappedBy = members.filter((m) => m.standing === standing).map((m) => m.id);
  return { standing, cappedBy };
}

/**
 * Wire weights from docs/the-working.md. The thinnest line in the object is
 * always the one holding the least.
 */
export const WIRE: Record<Standing, { w: number; c: string; o: number }> = {
  firm: { w: 2.6, c: INK, o: 1 },
  supported: { w: 1.7, c: TONES[7]!, o: 0.85 },
  provisional: { w: 1.0, c: TONES[5]!, o: 0.85 },
};
