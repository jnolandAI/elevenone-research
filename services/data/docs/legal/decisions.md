# Decisions behind the privacy policy and terms

The text lives in the site, at `src/pages/privacy.astro` and `src/pages/terms.astro`, and goes
live with `/data` (see `src/lib/connect.ts`). This records the choice behind each part of it.
The defaults below were applied on 2026-10-23; where the text departs from a default, the last
column says how and why. None of it has had a lawyer's reading yet.

| | Decision | Default applied | As written, where it differs |
|---|---|---|---|
| D1 | The legal entity offering the service | Eleven Hundred LLC | Named without a state of formation or postal address, which are not recorded in this repository. Add both when known |
| D2 | Contact for keys, privacy and support | info@elevenoneresearch.com | The email provider is described, not named |
| D3 | Retention | Logs 30 days; key records 90 days after a key is retired | Correspondence about a key follows the key record |
| D4 | Host, region and host log retention; Netlify Analytics | Set when the host is chosen | Described as "a cloud hosting provider" until it is chosen. Whether Netlify Analytics is on could not be checked from here: elevenoneresearch.com is not in the Netlify team this session can see. The policy claims only what the code proves (no cookies, no analytics script) |
| D5 | The no-key tier | Off | The policy says nothing about it. Turning it on logs internet addresses, so the policy must change first |
| D6 | Fees | Free preview; fees agreed in writing before any charge | |
| D7 | Governing law and courts | The state of formation in D1 | "The state in which Eleven Hundred LLC is organized", since that state is not recorded here |
| D8 | Liability cap | Fees paid in the prior twelve months; a fixed sum for a free service | Fees paid in the prior twelve months only. A fixed sum would need a figure, which the site's tests bar on every page; while access is free this cap is nil, which a lawyer may want to replace with a sum and a test exemption |
| D9 | Business and professional use, 18 and over | Yes | |
| D10 | Who is served | U.S. business users | The policy carries no EU, UK or California sections. Serving those users needs them added first |
| D11 | Effective date | The launch date | `EFFECTIVE` in `src/lib/connect.ts`, which a test requires once `LAUNCHED` is true. Until then the pages say they are drafts |
| D12 | Key sharing | One key per organization, shareable within it | |
| D13 | Notice of changes, or of access ending | 30 days by email | Not for a breach, or where a publisher requires otherwise |
| D14 | Availability | Preview, no commitment | |
| D15 | Redistribution | No resale; results may go into client work, not a competing feed | |

## Not a decision, but needs a lawyer's eye

- **FRED's "replicates or replaces" clause.** FRED's API terms bar an application that replicates
  or replaces the FRED or ALFRED experience. Eleven One Data returns individual series inside a
  wider research service, credits FRED and links each series' FRED page, which reads as the use
  the API is for. It is still the clause most worth a lawyer's reading.
- **FRED's third-party series.** The catalog and warmer leave them out, and the service flags
  them when asked for by id. Whether to refuse them outright is a product decision that follows
  from the lawyer's reading.
- **Non-dataset World Bank material.** The World Bank's general terms bar commercial use of its
  non-dataset materials without consent. The service uses only the Indicators API, whose datasets
  are CC BY 4.0, which allows commercial use with attribution. Nothing else from the World Bank
  should be added without checking which terms apply.
