# The citation contract, version 1.0

Every tool result is one envelope: `data`, `citations`, `notes` and `meta`. This document says
what each promises. `test/tools.test.ts` and `test/core.test.ts` hold the code to it, and a rule
here that no test checks says so.

## A figure always points at its source

Every value a tool returns that came from a publisher carries a citation id (`"c1"`), either on
the value itself or on the series or row that holds it. The id resolves to one entry in
`citations`. A result with figures and no citations is a bug, and the credential test fails on
one (`every figure-bearing result is cited`).

## What a citation holds

| Field | Meaning |
|---|---|
| `publisher` | The body that produced the figure. For FRED this is the original agency (BLS, BEA, the Fed), not FRED |
| `via` | The service it was retrieved through, where that is not the publisher. FRED's own citation guidance asks for both |
| `dataset` | The programme or product: Current Employment Statistics, ACS 5-Year Estimates 2024, EDGAR XBRL financial data |
| `title` | What the publisher calls the cited thing, in the publisher's words |
| `identifier` | The publisher's own id: series id, table id, or filing accession number |
| `url` | A page a person can open to see the same figure: the FRED series page, the filing index, the data.census.gov table |
| `api_url` | The exact request that produced the figure, with credentials removed. Add your own key and it reproduces the answer |
| `retrieved_at` | When this service fetched it from the publisher. On a cache hit it is the original fetch time, not the time of the call |
| `as_of` | The publisher's own date: last update, release, filing date, or vintage. Absent where the publisher gives none (BLS) |
| `license` | The terms the figure carries. FRED series with third-party copyright say so here, and in `notes` |
| `text` | One line, ready to paste as a footnote |

## Values are as published

A value is the publisher's number, parsed and not rescaled. A missing value is `null`, never
interpolated or carried forward. A suppressed cell (BEA `(D)`, Census sentinels) is `null` with
a note saying why. BEA values keep the unit and the power-of-ten multiplier BEA states.

Where this service computes a figure (the three margins in `company_financials`), the value is
marked `derived: true`, carries the formula it used, and cites every input. Gross margin falls
back to revenue less cost of revenue for companies that report no gross profit line, and its
formula says which was used.

## Notes carry what a reader must know

`notes` is where caveats go: preliminary values (BLS footnote P), restated periods, 90% margins
of error, five-year ACS pooling, fourth quarters that are not filed on their own, third-party
copyright. A client presenting a figure should pass its notes on.

## Credentials never leave the server

No result, citation, error message or log line carries an upstream key. `api_url` has them
stripped; upstream error bodies that echo a key are scrubbed; a test runs every tool with
distinctive keys and fails if any reaches the output (`credentials never leave the server`).

## What is not yet checked

Restatement handling is tested on a synthetic filing, not a real one. The FRED, BLS, Census and
BEA parsers are tested against hand-written fixtures in each publisher's format; SEC and World
Bank against captured responses. See `test/fixtures/README.md`.
