# Roadmap

What the service covers now, what comes next, and the platform work under it. Sources are grouped
by the question a consultant is answering, because that is how they will be asked for.

## Now: six tier-1 sources

| Question | Source | Tool |
|---|---|---|
| How is a public company, competitor or peer set performing? | SEC EDGAR XBRL | `company_financials` |
| What has a company filed, and what does it say? | SEC EDGAR | `company_filings`, `search_filings` |
| Where is the economy, prices, rates, credit? | FRED | `get_series` |
| How are employment, wages and prices moving, by industry? | BLS | `get_series` |
| What does a local market look like? | Census ACS | `census_acs` |
| How big is a state's or an industry's economy? | BEA | `bea_query` |
| How do countries compare? | World Bank WDI | `get_series` |

## Next: public sources, by question

**Market sizing and industry structure.** Census County Business Patterns and Nonemployer
Statistics (establishments, employment and payroll by NAICS and county), the Economic Census,
the Annual Business Survey. BLS QCEW (county by industry employment and wages, quarterly).

**Talent and pricing.** BLS OEWS (wages by occupation and metro), the Employment Cost Index by
industry, JOLTS by industry.

**Public sector as a market.** USAspending.gov (federal contracts and grants by agency, NAICS
and recipient) and SAM.gov opportunities.

**Trade.** Census international trade by HS code and partner, UN Comtrade.

**International macro.** IMF World Economic Outlook and IFS, OECD, Eurostat, ECB, all over SDMX,
which one adapter can serve.

**Sector depth.** EIA (energy), CMS provider and Medicare data, openFDA, ClinicalTrials.gov, NIH
RePORTER, FDIC BankFind and call reports, Treasury Fiscal Data, FHFA house prices, USDA NASS.

**Regulation.** Federal Register, eCFR, Regulations.gov dockets.

**Company coverage.** IFRS filers (20-F, 40-F) through the `ifrs-full` taxonomy; registrants
without tickers by name through EDGAR company search; segment and geographic revenue.

## Later: proprietary datasets

Licensed datasets sit behind the same tools, entitled per client key. The citation's `license`
field already carries terms per figure; licensed data adds enforcement on output (what a client
may display, store or redistribute) and attribution the licensor requires.

## Platform

- **Accounts.** Client keys, labels and entitlements move from an environment variable to a
  database, with rotation, revocation and per-key usage by tool and source.
- **Shared cache.** The in-process cache and rate limiter become a shared store when there is
  more than one instance. Size-aware eviction, since an EDGAR company-facts file runs to
  megabytes.
- **Release-aware freshness.** BLS, BEA and Census publish on calendars. Refresh just after a
  release instead of on a fixed TTL, so a figure is never an hour stale on release morning.
- **Point-in-time answers.** ALFRED vintages and filing dates make "what was known on date X"
  answerable, which reproducible analysis needs.
- **Citation formats.** Export a result's citations as Chicago, APA or BibTeX.
- **Signed results.** A signature over each envelope, so a client can show a figure came from
  the service unaltered.
- **MCP OAuth.** The remote-MCP authorization flow, so a client connects from Claude or another
  host without pasting a key.
- **Status per source.** Latency and error rate per publisher, on a public status page.
