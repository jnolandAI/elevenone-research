# Eleven One Data

One key, cited answers. A server that fronts tier-1 public data sources (SEC EDGAR, FRED, BLS,
the Census Bureau, BEA and the World Bank) behind a single Eleven One key, and serves them over
MCP and REST. The server holds the upstream credentials; a client holds one key.

Every figure comes back with a citation naming its publisher, the publisher's id for it, a page
a person can open, and the exact request that produced it. [`docs/citations.md`](docs/citations.md)
is the contract for that, and [`docs/roadmap.md`](docs/roadmap.md) says what comes next.

## Tools

The MCP server and the REST API serve the same nine tools.

| Tool | What it answers |
|---|---|
| `find_data` | Plain words in, ready-to-run tool calls out: a curated catalog of about 80 series plus live FRED search |
| `get_series` | Up to ten time series at once from FRED, BLS and the World Bank (`fred:UNRATE`, `bls:CES6054160001`, `worldbank:NY.GDP.MKTP.CD:USA;DEU`) |
| `company_lookup` | SEC registrants by ticker, CIK or name |
| `company_financials` | Reported revenue, income, balance sheet and cash flow by year or quarter, each value cited to its 10-K or 10-Q, with restatements flagged and margins computed and labelled |
| `company_filings` | A registrant's profile and recent filings, with document links |
| `search_filings` | Full-text search of SEC filings since 2001 |
| `census_acs` | American Community Survey estimates with margins of error, from the US down to county, place, metro and ZIP |
| `bea_query` | National accounts, state and county GDP and income, GDP by industry |
| `list_sources` | Each publisher, what it covers, its licence, and whether it is available on this server |

## Running it

```
npm install
cp .env.example .env        # then fill in what you have
npm run keygen -- acme      # issue a client key; put the hash in EO_API_KEY_HASHES
npm run dev                 # http://localhost:8787
npm test                    # unit and contract tests, no network
npm run check               # typecheck
npm run smoke               # live checks through a real MCP client: EO_URL, EO_KEY
npm run stdio               # MCP over stdio, for a local client
```

SEC needs `SEC_USER_AGENT` with a contact email and no key. The World Bank needs nothing. BLS
works without a key at 25 requests a day. FRED, Census and BEA need keys, which are free from
each agency; the links are in `.env.example`. A source without its credential reports itself
unavailable rather than failing upstream.

## Connecting a client

MCP, over streamable HTTP, at `/mcp`, with the key as a bearer token:

```json
{
  "mcpServers": {
    "eleven-one": {
      "type": "http",
      "url": "https://<host>/mcp",
      "headers": { "Authorization": "Bearer eo_..." }
    }
  }
}
```

REST, for code:

```
curl -X POST https://<host>/v1/tools/company_financials \
  -H "Authorization: Bearer eo_..." -H "content-type: application/json" \
  -d '{"company":"ACN","metrics":["revenue","operating_margin"]}'
```

`GET /v1/tools` lists every tool with its JSON Schema. `GET /health` is open.

## How it is fast

Upstreams are the slow part, so the server avoids them. One shared cache sits in front of every
publisher, with TTLs set per source. Identical requests in flight are coalesced into one. FRED
and World Bank histories are fetched whole, so every range and limit a client asks for is a slice
of one cached response. Concurrency is bounded per publisher. And a warmer re-fetches the
catalog's series every 50 minutes, so the figures asked for most are always answered from memory.
Measured against live publishers on 2026-10-19: 100 to 600 ms cold, 5 to 10 ms warm.

## Deploying

It needs a long-lived Node process: the cache and the warmer live in memory. That rules out
per-request functions (Netlify's included) for the service itself; a single small instance on
Fly.io, Render or Cloud Run with one minimum instance fits. `npm run build` then `npm start`.

The cache and the rate limiter are per process. Running more than one instance needs the shared
store in the roadmap.

## Known limits

- FRED, Census and BEA are tested against hand-written fixtures in the publishers' formats and
  have not yet been run against the live APIs, for want of keys. Run `npm run smoke` once the
  keys are set.
- `company_financials` reads US GAAP facts only, so IFRS filers (20-F) return nothing yet.
- Name lookup covers registrants with listed securities; others need their CIK.
- `bea_query` truncates at `limit` rows in BEA's own order, which is not newest first.
