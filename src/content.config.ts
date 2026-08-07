import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

export type Standing = 'firm' | 'supported' | 'provisional';

const standing = z.enum(['firm', 'supported', 'provisional']);

/**
 * A claim block. Four rows, in the same order, every time.
 * See docs/the-working.md.
 */
const claimSchema = z.object({
  /** Single uppercase letter. It is the label in the prose and the rail. */
  id: z.string().regex(/^[A-Z]$/, 'a claim id is one uppercase letter'),
  standing,
  /** One sentence that could be wrong. */
  text: z.string().min(20),
  /** The short qualifier beside the standing, e.g. "n=2,186". */
  qualifier: z.string().min(1),
  /** Source, n and date, named precisely enough to be checked. */
  restsOn: z.string().min(20),
  /** The thing that has to hold, including where it does not hold well. */
  assumes: z.string().min(20),
  /**
   * The falsifier, and whether we tested it. Rule 4: never blank and never
   * softened. A falsifier we cannot name means we do not understand our own
   * claim well enough to publish it.
   */
  breaksIf: z.string().min(20, 'breaksIf must name a falsifier, not gesture at one'),
  /** Optional note, e.g. "held but deliberately excluded from the conclusion". */
  note: z.string().nullable().default(null),
});

const loadPathSchema = z
  .object({
    conclusion: z.string().min(20),
    members: z.array(z.string().regex(/^[A-Z]$/)).min(1),
    offPath: z
      .object({ id: z.string().regex(/^[A-Z]$/), text: z.string().min(20) })
      .nullable()
      .default(null),
  })
  // Rule 3: the conclusion's standing is derived from its members and is not
  // authorable. There is deliberately no field for it, and strict() makes
  // adding one a build failure rather than a silent no-op.
  .strict();

const methodSchema = z.object({
  /**
   * The sourcing policy sentence rendered above the method table. Per brief,
   * not shared: a claim about how many sources were used or whether any were
   * paid is only true of the brief that states it, and was previously
   * hardcoded into Method.astro where it silently applied to every future
   * brief regardless of what that brief actually drew on.
   */
  sourcing: z.string().min(10),
  source: z.string().min(10),
  universe: z.string().min(10),
  computation: z.string().min(10),
  notDone: z.string().min(10),
  data: z.string().min(10),
});

export const briefSchema = z
  .object({
    number: z.string().regex(/^\d{3}$/),
    title: z.string().min(10),
    subtitle: z.string().min(10),
    kind: z.string().min(3),
    standfirst: z.string().min(40),
    /**
     * null means draft. A draft renders at its URL for review, carries a
     * noindex robots meta, and does not appear in the index. Setting a real
     * date is the act of publishing, which is why a build date can never be
     * mistaken for a publication date.
     */
    published: z.coerce.date().nullable().default(null),
    dataset: z.string().startsWith('/assets/data/'),
    axisKey: z.string().min(20),
    /** Rule 1: three to six. A brief where everything is a claim has no argument. */
    claims: z.array(claimSchema).min(3).max(6),
    loadPath: loadPathSchema,
    method: methodSchema,
  })
  .superRefine((brief, ctx) => {
    const ids = brief.claims.map((c) => c.id);
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `duplicate claim id ${id}` });
      }
      seen.add(id);
    }
    for (const m of brief.loadPath.members) {
      if (!seen.has(m)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `load path member ${m} does not resolve to a claim`,
        });
      }
    }
    const off = brief.loadPath.offPath;
    if (off) {
      if (!seen.has(off.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `off-path claim ${off.id} does not resolve to a claim`,
        });
      }
      if (brief.loadPath.members.includes(off.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `claim ${off.id} is both on the load path and off it`,
        });
      }
    }
  });

export type Claim = z.infer<typeof claimSchema>;
export type LoadPathSpec = z.infer<typeof loadPathSchema>;
export type MethodSpec = z.infer<typeof methodSchema>;

const briefs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/briefs' }),
  schema: briefSchema,
});

export const collections = { briefs };
