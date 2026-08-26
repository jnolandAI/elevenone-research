# Corpus census

Measures a corpus of published research decks and turns them into constants a
skill can build 16:9 research pages against: how many words sit on a page, how
long a title runs, how often a title carries a number, how a piece is shaped
page-count-wise, and what a page actually looks like when someone opens the
image instead of trusting the text extraction. Everything downstream that
builds a research-piece skill reads the two files in `data/`, not the corpus
itself.

## The corpus

The corpus is external and third-party. It lives outside this repository, at
a local path supplied as an argument to each script. Every script below
defaults to `C:/Projects/ExampleSlides`, which is the author's own local
corpus location; anyone else running these scripts needs to pass their own
path as the first argument. It holds 90 decks and 3,895 pages of copyrighted
material that this repository does not, and must not, reproduce.

Three inputs live with the corpus and are read by these scripts but never
copied in:

- `logs/slide-text.json`: extracted text per deck per page.
- `logs/slide-tags.json`: per-page metadata keyed `deckSlug::pageNumber`, with
  a `role` array (page function, e.g. Content, Section Divider) and a `visual`
  array (page's dominant visual type, e.g. Chart, Table, Map) attached by an
  earlier, separate tagging pass. Task 5's visual read found this tagging pass
  substantially wrong; see "What is not reliable" below.
- `census-classification.json`: two arrays of regular-expression fragments,
  `client` and `published`, used to split decks by population. This file
  names real client engagements by pattern, which is exactly why it stays
  with the corpus and never enters this repository. `corpus.mjs` reads it
  through `loadPatterns(corpusPath)`; nothing here hardcodes a pattern.

No deck identifier and no extracted source text may enter this repository.
Everything committed under `research-kit/census/` is either a pure function,
a test against synthetic fixtures, or aggregate output that has been checked
to contain no source text (`tests/census-aggregate.test.ts` asserts this
directly). Anything keyed on deck identity, meaning anything that names which
page of which deck produced a finding, goes in `research-kit/census/out/`,
which is gitignored, never in `data/`, which is committed.

## The two populations

A deck is classified `client`, `published`, or `unplaced` by testing its slug
against the `client` patterns first and the `published` patterns second
(`corpus.mjs`, `classifyDeck`). Client is tested first on purpose: a client
market study can match a `published` pattern on the word "study", and the
client signal is the more specific one, so it has to win the tie.

Two named populations are built from that split, and they exist because they
answer different questions:

- **strict**: decks classified `published` only. Used for every page-level
  measure (words per page, title length, visual mix, and so on) in
  `data/text-census.json`. Page-level measures need confidence that a page
  actually came from a published piece, not from a client deliverable that
  merely failed to match a client pattern.
- **broad**: every deck not classified `client`, meaning `published` plus
  `unplaced`. Used only for piece length (`broadLengths` in
  `data/text-census.json`). An unplaced deck is not confidently a published
  research piece, but its page count is still informative about how long a
  deck in this corpus tends to run, and excluding it would shrink an already
  small population for no real gain in precision.

`strict` is the smaller, higher-confidence population; `broad` is the larger
population used only where the question tolerates the extra noise. In the
committed run, `strict` is 51 decks and `broad` is 80.

## Rerunning the scripts

Both scripts take the corpus path as their first positional argument and fall
back to a placeholder path if omitted; point them at wherever the corpus
actually sits on disk. Run from the repository root.

**Text census:**

```bash
node research-kit/census/run-text-census.mjs "C:/path/to/corpus"
```

Reads `logs/slide-text.json` and `logs/slide-tags.json` from the corpus path,
classifies every deck, aggregates the `strict` population's pages with
`aggregate()` and the `broad` population's deck lengths with `deckLengths()`,
and writes `research-kit/census/data/text-census.json`. Also prints the same
JSON to stdout.

**Stratified sampler:**

```bash
node research-kit/census/run-sample.mjs "C:/path/to/corpus" 12
```

The second argument is pages per visual stratum and defaults to 12 if
omitted. Reads `logs/slide-tags.json`, keeps only pages from the `strict`
population, groups them by their tagged visual type (untagged pages fall
under `Untagged`), and calls `stratify()` to pick up to that many pages per
stratum, spread across decks by `spreadDecks()` rather than clustered in
whichever deck sorts first. Writes
`research-kit/census/out/visual-sample.md` as a checklist of
`stratum :: deck :: page_NNN.png` lines. Deterministic: no randomness, so a
rerun against the same corpus produces the same sheet.

The sampler's output is a to-do list for a human, not a finished artifact. A
person then opens each listed page image and records what it actually shows
in `research-kit/census/out/visual-read.md`, one section per page, checking
each line off in `visual-sample.md` while doing it. That step has no script;
it is Task 5's visual read, and it is the only source for
`data/form-inventory.md`.

`run-text-census.mjs` creates `research-kit/census/data/` if it does not
already exist; `run-sample.mjs` creates `research-kit/census/out/`. Neither
needs the directory created by hand on a fresh checkout.

## What each output file holds

- **`data/text-census.json`** (committed): the corpus split (deck and page
  counts by population), the `strict` page-level aggregate (word count,
  title length, title wrap rate, title number rate, multi-column prose rate,
  visual mix, role mix, all as counts or percentages), and the `broad`
  piece-length distribution (median and quartiles of pages per deck, plus a
  band count). Contains no deck names and no source text; every leaf value is
  a number, and the only strings are the tag categories the corpus itself
  supplied (Chart, Table, and so on).
- **`data/form-inventory.md`** (committed): the generalised findings from the
  visual read; 16 named page forms, how many of the 72 sampled pages used
  each one, and the rules that govern each form. Names forms, never decks.
  This is the file a future skill should encode against.
- **`out/visual-sample.md`** (gitignored): the sampler's checklist, one line
  per sampled page as `stratum :: deck :: page_NNN.png`, checked off as each
  page is read. Keyed on deck identity, which is why it is gitignored.
- **`out/visual-read.md`** (gitignored): one section per sampled page,
  recording its actual form, layout, title treatment, footer contents and
  free notes, keyed on deck slug and page number. This is the working
  document `form-inventory.md` was generalised from. Gitignored for the same
  reason as the sample sheet.

## What is reliable

These measures come from mechanical extraction over the full `strict`
population (2,082 pages after furniture is excluded) and hold up:

- **Deck and page counts.** Corpus size and the population split are exact
  counts, not estimates.
- **Title length.** `titleBlock()` joins a title's wrapped lines before
  counting, so a two-line title is not truncated to its first line. The
  median, quartile and wrap-rate figures reflect the whole title, not a
  fragment of it. `titleLines()` caps the leading run at three lines, though,
  and on 202 of the 2,082 strict-population pages (9.7%) that cap truncates a
  run of four or more lines, so the measured "title block" on those pages is
  really the first three lines of body text. Excluding those pages moves the
  title-word p90 from 20 to 17 and p75 from 14 to 12, and the longest measured
  title drops from 67 words to 37; read the committed p90 as 17, not 20.
- **Share of titles carrying a number.** `hasNumber()` is a straightforward
  digit test against the joined title block.
- **Piece-length distribution.** The `broad` population's pages-per-deck
  median, quartiles and length bands are a plain count of tagged pages per
  deck.

## What is not reliable

Three measures need a caveat attached every time they get cited, and two of
them were only discovered because Task 5 checked the corpus's own tags
against the actual page images.

**1. The visual-type mix in `data/text-census.json` is directional at best.**
`visualMix` is built entirely from the `visual` tags in `logs/slide-tags.json`,
a separate tagging pass this census did not perform and did not audit until
the visual read. The audit found the tags substantially wrong. Checking the
72-page stratified sample against the actual images: of 12 pages tagged
Map, all 12 had no map. Of 12 tagged Table, 7 were actually charts, 1 was a
table, and 4 were neither a chart nor a table. Of 12 tagged Chart, 5 carried
no chart. Of 10 tagged Quote, 7 carried no quote. A tag is a single
dominant-category label attached by a different process for a different
purpose; it is not a verified classification. Anyone treating `visualMix` as
a measured fact about what these pages contain will be wrong. Use
`data/form-inventory.md` for what the pages actually show; treat `visualMix`
as, at best, a rough directional signal of what the corpus's own indexing
process called a page, not of what the page is.

**2. The multi-column prose figure cannot separate a two-column text matrix
from two-column running prose.** `multiColumnProseLines()` counts a line as
multi-column prose when it splits into two or more chunks on a wide gap and
at least two of those chunks are long, letter-rich and nearly digit-free. A
two-column comparison table, two labelled lists set side by side rather than
two paragraphs, passes every one of those gates exactly as running prose
does: at the granularity of one line, the two are not distinguishable.
`tests/census-measure.test.ts` asserts this directly against a
`TWO_COLUMN_TEXT_MATRIX` fixture in `tests/fixtures/census-pages.mjs`, whose
own comment calls it "a genuine limitation rather than a bug" and states
that this README would record the figure as provisional. It does:
`multiColumnPct` in `data/text-census.json` should be read as an upper bound
on two-column running prose, inflated by an unknown share of two-column
matrices, not as a clean count of either.

**3. Words per page is bimodal, and a single median describes neither peak
well.** The visual read found summary and insight pages reaching roughly 250
words of body copy with no exhibit at all, while dividers and quote pages
pull the low end of the distribution down. `words.median` in
`data/text-census.json` sits between those two populations without
describing either. A builder handed one number and told to design "the"
research page to that word count will build a page that is too dense for a
divider and too sparse for a summary page. Treat the quartiles as a spread to
design across, not the median as a target to hit.

## Reproducing this document's numbers

Every number cited above under "What is not reliable" comes from
`data/form-inventory.md`, the committed, deck-free record of the visual read.
The tag-audit numbers come from its "Correction to the input" section; the
250-words figure comes from elsewhere in the same document.
The `multiColumnPct` caveat is pinned by a test, not just a note:
`npx vitest run tests/census-measure.test.ts` exercises the
`TWO_COLUMN_TEXT_MATRIX` fixture and will keep passing as long as the
limitation holds. Running `npx vitest run` from the repository root runs the
full suite, including all five census test files
(`tests/census-corpus.test.ts`, `tests/census-measure.test.ts`,
`tests/census-aggregate.test.ts`, `tests/census-sample.test.ts`,
`tests/census-visual-read.test.ts`).
