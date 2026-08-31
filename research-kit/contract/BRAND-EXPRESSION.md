# What the kit decides, and what the brand decides

The kit renders decks that have to pass as MBB-quality work and also have to
look like a particular firm made them. Those two requirements pull in
opposite directions unless the boundary between them is explicit, so this is
the boundary.

**The rule.** The kit owns the semantics: what kind of element this is, what
it argues, and how it relates to the elements around it. The brand owns the
formatting: what that element looks like once its job is settled. Where the
two collide, the semantics win, and the contract enforces that rather than
trusting it.

The test for which side something belongs on is not "is it visual". Almost
everything here is visual. The test is: **if you changed it, would the page
say something different?** A commentary rail with 8px corners says the same
thing as one with square corners. A commentary rail drawn heavier than the
booktabs boundary above it says something different, because a reader reads
weight as importance. The first is expression. The second is structure
wearing a formatting costume, and it is refused.

## The invariants

Never brand-configurable. A house that wants these changed does not want this
kit.

| Invariant | Why it is not expression |
|---|---|
| One marked value per exhibit | The mark means "this is the value the title is about". Two marks mean nothing and spend a page's single accent twice. Enforced by `assertOneMark` at render. |
| Which division is a boundary, which is a divider, which is a hairline | The kit reads hierarchy out of this. A brand chooses what each weighs, not which is which. |
| A boundary reads at least as heavy as a divider | A *relational* invariant, even though every value in it is the brand's. Enforced by the `ordered` check. |
| Value lanes right-align on tabular figures | The one thing a table is for. Enforced by `assertValueLanes`. |
| Contrast floors, series and mark separation | Accessibility and legibility. Enforced by `tokencheck`. |
| Chart form follows the analytical question | A bridge answers "how did X become Y", a buildup "what composes X". Choosing by taste is choosing wrong. |
| Action title carries the claim; furniture pages take flat labels | Editorial, and the difference between a deck that argues and a deck that lists. |
| Exhibit numbering, source lines, footnotes | Provenance. A research deck without them is a brochure. |
| The page forms themselves | Cover, divider, working page, split, matrix, ledger. These are argument shapes, not layout preferences. |

## The expression layer

The brand's, within the floors named beside each. All of it lives in the
adapter, mapped from the brand's own token sheet: **an adapter names no value
of its own** — every mapping is a `var()` into the design system it adapts, so
the brand's stylesheet stays the single source of truth and the adapter stays a
translation.

| Dimension | Tokens | Constraint |
|---|---|---|
| Colour, every role | the `surface`, `text`, `exhibit`, `scales`, `mark`, `field` groups | contrast floors; series/mark/scale separation |
| Type: faces, sizes, weights, tracking, leading | the `type` group | the kit places display vs body; the brand supplies both |
| Line weight, three steps | `--ct-rule-w-hair`, `-bold`, `-heavy` | `hair <= bold <= heavy`; each within 0.5px–6px |
| Panel corners | `--ct-radius-panel` | at most 24px, so a zone of the page does not become a card on it |
| Space scale | the `space` group | the kit chooses steps |
| Master furniture | `--ct-frame-w`, `--ct-title-rule-w`, `--ct-title-rule-pad`, `--ct-way-tick`, `--ct-way-tick-here` | the here-tick is at least as long as a plain tick, and no longer than the lane; rules are 0 or within the weight bounds |
| Panel separation | `--ct-sep-border`, `--ct-sep-shadow` | *declared, not yet consumed — see below* |
| Slide profile | the `geometry` group | |
| Art direction, firm mark | `--ct-art-direction`, `--ct-firm-mark` | strings the kit prints and must not know |

## Why the floors are part of the offer

A cap is not a restriction on the brand, it is what makes the brand's freedom
safe to use. Without the ordering check, a house that rules heavily has to
hand-verify that it has not accidentally inverted a table's hierarchy on every
page. With it, that house sets three numbers and the deck stays correct. The
constraint is what lets the expression be applied blind.

This is also why the caps carry their reasoning in `tokens.contract.json`
rather than living as bare numbers: a brand that hits one deserves to know
what it would break, and sometimes the right answer is to move the cap.

## What is not expressible yet, and deliberately

- **Data-mark radius.** A rounded bar end shortens the bar a reader measures.
  That is a legibility question wearing a styling question's clothes, and it
  needs its own decision rather than a token.
- **Fill treatment** (solid vs outline vs tint on a data mark). Same
  reasoning: it changes how the mark is read, not just how it looks.
- **Furniture *placement*, as opposed to furniture treatment.** Which side the
  lane sits on, where the page number and firm mark sit, what order the
  furniture band runs in. The `master` group above covers how the furniture is
  drawn, not where it goes, and the distinction is deliberate: a value can be
  bounded and a coordinate cannot. Two specific blockers, both worth knowing
  before anyone tries:
  - **Lane side** cannot be done with a value token alone. `flex-direction:
    row-reverse` moves the lane but not the divider it draws, because logical
    border properties follow writing mode rather than flex direction. Doing it
    properly means the divider becomes its own element, which shifts every
    index path after it and turns `paint-diff` from a proof into noise.
  - **Page-number format** (`05` vs `5` vs `5/32`) is computed in Astro
    frontmatter, and frontmatter cannot read a CSS custom property at build
    time. Anything computed in JS needs a different channel from the token
    contract — a deck config the site exports and the layout threads down.
    That channel does not exist yet, and inventing it for one string is the
    wrong trade.
- **`--ct-sep-border` / `--ct-sep-shadow`.** Declared by the contract, mapped
  by all three adapters, read by no component. The separation group's own
  description claims "components set both, always", which is currently false.
  Recorded in `tests/contract-coverage.test.ts` as an exemption with this
  reason.

## How to add a consumer

1. Write the brand's token sheet: its own names, its own values.
2. Write `contract-adapter.css` mapping every `--ct-*` name to a `var()` into
   that sheet. Nothing literal except the two strings and `--ct-sep-border`.
3. `node research-kit/scripts/tokencheck.mjs <adapter> <tokens>` until it
   passes. Every failure names the floor it missed and why the floor exists.
4. Build a deck and run the gates: `slidecheck` (geometry), `audit` (form and
   title census), `density`, `portability`.

The third consumer, built at arm's length as a probe, is
`C:\Projects\Noland Advisory2\kit-probe`, with its findings in
`kit-probe/FINDINGS.md`. It is the regression fixture for this split: it is
the only consumer that exercises two type families, a chromatic mark against a
hue-adjacent neutral ramp, heavier rules and rounded panels at once.
