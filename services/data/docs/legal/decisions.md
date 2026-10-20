# Decisions the privacy policy and terms need

Each is marked in `privacy.md` and `terms.md` as **[Decision Dn]**. Where there is an obvious
default, it is given; none is settled until the owner settles it.

| | Decision | Where | A default to consider |
|---|---|---|---|
| D1 | The legal entity offering the service: name, state of formation, postal address | both | The repository's README says Eleven One Research is part of Eleven Hundred LLC |
| D2 | The contact address for keys, privacy and support, and the email provider behind it | both | info@elevenoneresearch.com, which the site already uses, or a data@ alias |
| D3 | How long request logs, retired-key records and key correspondence are kept | privacy | 30 days for logs; 90 days after a key is retired |
| D4 | The service's host and region, the host's own log retention, and whether Netlify Analytics is on for the site | privacy | Set when the host is chosen; check Netlify's dashboard |
| D5 | Whether the no-key tier is offered. If it is, internet addresses are logged for it | privacy | Off, as the code ships |
| D6 | Free during a preview, or paid; if paid, where price, invoicing, taxes and refunds are stated | terms | Free preview, with these terms saying fees will be set in writing before any charge |
| D7 | Governing law and courts | terms | The state of formation in D1 |
| D8 | The liability cap | terms | Fees paid in the prior twelve months; for a free service, a fixed sum. The site's tests bar a price on any page, so a sum would need the test's agreement or wording without a figure |
| D9 | Business and professional use only, 18 and over | both | Yes |
| D10 | Whether users in the EU, UK or California are served. If so, the privacy policy needs the sections its note describes | privacy | U.S. business users at first, with the policy written so additions do not contradict it |
| D11 | Effective date | both | The launch date |
| D12 | Whether a key may be shared within an organization | terms | One key per organization, shareable within it, with a label per organization |
| D13 | Notice before a change to the terms or policy, or before access ends | both | 30 days by email |
| D14 | Preview with no availability commitment, or a stated target | terms | Preview |
| D15 | Whether results may be redistributed in bulk, and confirming no resale of access | terms | No resale; results may go into client work, not into a competing data feed |

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
