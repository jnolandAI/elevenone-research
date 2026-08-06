# The working

The brand's signature move. It occupies the slot where a research firm normally
puts a superscript, and it exists because the practice claims to show its
working and had, until now, no way to show it.

## The principle

**The apparatus of the argument is the visible object.**

Sources, assumptions and confidence conventionally live in an endnote, set
small, at the back. That placement is a decision about what the reader is
trusted with. We make the opposite one. A claim travels with what it rests on,
what it assumes and what would falsify it, and none of that is a footnote, a
hover or a modal.

This is the thing a competitor cannot copy without also doing the work. Anyone
can run a halftone screen. Nobody publishes their own falsifiers.

## Files

| Path                        | What it is                                    |
| --------------------------- | --------------------------------------------- |
| `prototypes/working.html`   | The device in full: block, stances, load path |
| `docs/the-working.md`       | This file                                     |

The prototype is the reference implementation. It uses the greyscale spine from
`prototypes/system-greyscale.html` unchanged.

## Where the apparatus lives

In a brief, the apparatus goes in a **sticky rail**, not inline. Four to six
claims, collapsed to one line each, expandable to the full working. The
load-bearing sentence in the prose is marked and carries a letter that ties it
to its rail entry, and hovering either one lights both.

Inline blocks were tried first and were wrong. A brief with four full apparatus
blocks in the reading flow reads as apologising for itself: it puts the
transparency so far forward that it interrupts the argument it is meant to
support. The rail keeps the apparatus permanently visible and one click away
without ever standing between two paragraphs.

The full inline block still has a place: a page whose subject *is* the method,
such as `prototypes/working.html`, where the block is the specimen rather than
the apparatus.

## Widths

A brief uses **two widths and no others**: the reading column, and the frame
that column sits inside. Figures take the reading column exactly. Only summary
objects, the load path and the method block, take the frame. Three or more
widths down a scroll reads as unfinished no matter how well each piece is made.

Text does not wrap around figures. At a 624px reading column, a wrapped figure
leaves roughly 300px for each, which is too narrow for the figure and below the
measure floor for the text.

## The claim block

Four rows, in the same order, every time.

| Row          | Carries                                                         |
| ------------ | --------------------------------------------------------------- |
| The claim    | One sentence that could be wrong                                  |
| Standing     | Firm, supported or provisional                                    |
| Rests on     | Source, n and date, named precisely enough to be checked          |
| Assumes      | The thing that has to hold, including where it does not hold well |
| Breaks if    | The falsifier, and whether we tested it                           |

## Standing

Standing is carried on three channels at once, and never on shadow alone.

| Standing      | Tone         | Elevation | Wire weight |
| ------------- | ------------ | --------- | ----------- |
| `firm`        | `--ink`      | `--e3`    | 2.6         |
| `supported`   | `--g80`      | `--e2`    | 1.7         |
| `provisional` | `--g70`, 400 | `--e1`    | 1.0         |

The glance channel is tone and depth: a page tells you how much weight each
claim can carry before you have read a word of it. The precise channel is the
written standing, which is always present, in the same slot. Anything that
matters and lives only in a shadow is unreadable to a screen reader and
unnameable by a reader, so nothing important is put there.

Standing attaches to the claim, not to the number underneath it. An exact figure
from a complete universe can still carry a provisional reading. When the
arithmetic and the interpretation have different standings they get separate
blocks.

## The load path

One object per brief. The conclusion sits on top and the claims that carry it
sit underneath, each wire drawn at the weight of its own claim. The thinnest
line in the object is always the one holding the least.

**A conclusion is never rendered firmer than the weakest claim it rests on.**
The cap is mechanical and it is not overridden. Raising a conclusion means
testing the weak claim or dropping it from the path, and dropping it usually
means the conclusion can only describe rather than prescribe. Nothing else
raises the ceiling, and restyling the object is not one of the options.

When the members stack on a narrow viewport the fan becomes a spine with
branches. A fan of curves passing behind the upper cards reads as a chain of A
to B to C, which is a different and false claim about the argument's structure.

## Rules of use

1. **Only load-bearing claims get a block.** If removing the sentence would not
   change the conclusion, it is prose. Three to six blocks in a brief. A brief
   where everything is a claim has no argument, only assertions.
2. **Standing attaches to the claim, not to the number.**
3. **A conclusion is never rendered firmer than its weakest input.**
4. **Breaks if is never blank and never softened.** If we did not test it, the
   row says so. A falsifier we cannot name means we do not understand our own
   claim well enough to publish it.
5. **Nothing important lives in shadow alone.**
6. **Never a hover, a tooltip or a modal.** Anything a reader has to go looking
   for has been hidden, whatever the interaction cost. It is on the page or it
   is not published.
7. **Greyscale absolutely.** No green, amber or red confidence chip, in any
   circumstance.
8. **Published work keeps the standing it shipped with.** A dated brief is a
   document of record. If a provisional claim is later tested, that is a new
   brief or a dated addendum, not a silent promotion of the old one.

## How it sits with the dot imagery

They do different jobs and neither is a substitute for the other. The dot
system says what a brief is about and is barred from carrying a number. The
working says what a brief is entitled to claim and carries nothing else. A
flagship brief has both: a rendered object at the top, blocks through the body,
a load path at the end.

## Numerals

Working on this surfaced a defect in the incumbent rule, which read "mono is
reserved for numerals and nothing else." Martian Mono is a wide face and its
punctuation advance breaks figures apart inside a sentence: `2,186` sets as
`2 , 186` and `29.2%` as `29 . 2%`.

The amended rule, now implemented in both `working.html` and
`system-greyscale.html`:

- **Numbers inside a sentence are prose.** Same face, `tabular-nums` on, so
  columns of them still align.
- **Martian Mono is for a value standing alone as a value**: chart axis labels,
  row counts, table cells.

In the greyscale system this moved the four large panel readouts and the chart
captions into the text face, and moved the axis tick labels and the per-cohort
median readouts into mono, which is where the fixed advance actually buys
something.
