---
name: cited-research
description: Research with Eleven One Data and cite every figure to its publisher. Use when a question needs public data a client will rely on - market size, industry employment and wages, a company's or a peer set's financials, a local market's demographics, macro context, international comparisons, or what companies say in their SEC filings - and whenever the user asks for sources, citations, or numbers they can defend.
---

# Cited research with Eleven One Data

The Eleven One tools return figures from tier-1 publishers (SEC EDGAR, FRED, BLS, the Census
Bureau, BEA, the World Bank) and attach a citation to every one. Your job is to keep that chain
intact from the tool result to the sentence the reader sees.

## Find, then fetch

1. If you do not already know the exact series or table, call `find_data` with the question in
   plain words. It returns ready-to-run calls: the tool name and its arguments. Run the best one.
2. Fetch in parallel. `get_series` takes up to ten refs in one call; ask for every series the
   answer needs at once rather than one at a time.
3. For companies, use `company_lookup` only when the name is ambiguous; `company_financials`,
   `company_filings` and `search_filings` accept a ticker, CIK or name directly.

## Which tool answers which question

| The question | The call |
|---|---|
| How is a public company or peer set performing? | `company_financials` with the tickers, one call per company, in parallel |
| What did a company disclose, and when? | `company_filings`, then open `document_url` |
| Which companies discuss a risk, customer, technology or competitor? | `search_filings` with the phrase in double quotes |
| How is an industry's employment or pay moving? | `find_data`, then `get_series` with the BLS refs it suggests |
| Prices, rates, credit, output | `get_series` with FRED refs (`fred:CPIAUCSL`, `fred:DGS10`, `fred:GDPC1`) |
| What does a local market look like? | `census_acs` at county, metro, place or ZIP level |
| How big is a state's economy, or an industry's? | `bea_query` (the tool description lists the common tables) |
| How do countries compare? | `get_series` with `worldbank:<indicator>:<ISO codes>` |

## Cite every figure

- Every value in a result points at a citation by id (`"citation": "c2"`, or `"citations": [...]`
  on a derived value). Look it up in the result's `citations` array.
- Cite each figure where it appears, then list the sources at the end using each citation's
  `text`, which is ready to paste. Link the citation's `url`, the page a reader can open.
- Name the publisher, not the relay. A FRED series is the agency's figure retrieved from FRED;
  the citation already says so.
- Give the period the figure describes and the citation's `as_of` date when it has one. "Revenue
  was $69.7bn in fiscal 2025 (10-K filed 2025-10-10)" is checkable; "revenue is about $70bn" is not.

## Report values as published

- Do not fill a `null`. A missing month or a suppressed cell is a gap, and you say so.
- Do not round away precision without saying you rounded, and never round a value before
  computing with it.
- A value marked `"derived": true` was computed by the service; say so, and from what (its
  `formula` names the inputs). Anything you compute yourself, label the same way.
- Pass on what `notes` says. Preliminary BLS values, restated SEC figures, ACS margins of error,
  five-year ACS pooling, and third-party copyright on a FRED series all change what a reader may
  conclude, or may republish.
- Show the result's `notices` beneath the sources. They are the publishers' own words, which
  their terms require a product using their data to show; quote them as given.
- For ACS estimates, report the margin of error alongside the estimate when comparing two areas:
  two estimates whose margins overlap are not shown to differ.

## When a call fails

An error's `code` says what to do. `not_configured` means the source is not available on this
server; say so and use another source if one fits. `not_found` usually means a wrong id: run
`find_data`. `invalid_request` carries a message naming the bad argument. `rate_limited` means
wait and retry once. A `get_series` call returns the series it could fetch and lists the rest
under `errors`; use what came back and name what did not.

## A sources section

End any answer that uses these figures with the sources, one line each, in the order first cited:

```
Sources
[1] U.S. Bureau of Labor Statistics, "All employees, management, scientific, and technical
    consulting services" (CES6054160001), Current Employment Statistics, retrieved 2026-10-19,
    https://data.bls.gov/timeseries/CES6054160001.
```
