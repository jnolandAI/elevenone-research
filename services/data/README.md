# Eleven One Data

One key, cited answers. A server that fronts tier-1 public data sources (SEC EDGAR, FRED, BLS,
the Census Bureau, BEA and the World Bank) and serves them over MCP and REST. The server holds
the upstream credentials. A client holds one Eleven One key, or signs in with it once through
OAuth.

Every figure comes back with a citation naming its publisher, the publisher's id for it, a page
a person can open, and the exact request that produced it. [`docs/citations.md`](docs/citations.md)
is the contract for that, [`docs/launch.md`](docs/launch.md) is the checklist for going live, and
[`docs/roadmap.md`](docs/roadmap.md) says what comes next.

## Tools

The MCP server and the REST API serve the same nine tools, all read-only.

| Tool | What it answers |
|---|---|
| `find_data` | Plain words in, ready-to-run tool calls out: a curated catalog of 73 series and tables plus live FRED search |
| `get_series` | Up to ten time series at once from FRED, BLS and the World Bank (`fred:UNRATE`, `bls:CES6054160001`, `worldbank:NY.GDP.MKTP.CD:USA;DEU`) |
| `company_lookup` | SEC registrants by ticker, CIK or name |
| `company_financials` | Reported revenue, income, balance sheet and cash flow by year or quarter, each value cited to its 10-K or 10-Q, with restatements flagged and margins computed and labelled |
| `company_filings` | A registrant's profile and recent filings, with document links |
| `search_filings` | Full-text search of SEC filings since 2001 |
| `census_acs` | American Community Survey estimates with margins of error, from the US down to county, place, metro and ZIP |
| `bea_query` | National accounts, state and county GDP and income, GDP by industry |
| `list_sources` | Each publisher, what it covers, its licence, and whether it is available on this server |

## Connecting a client

There is one address, `https://data.elevenoneresearch.com/mcp`, and two ways in.

**Chat apps sign in.** Claude (web, desktop and mobile) and ChatGPT connect by URL and run an
OAuth sign-in: the person enters their Eleven One key once, on this server's own page, and the
app receives an expiring token. The key never passes through the app.

- Claude: Customize > Connectors > Add custom connector, paste the URL, then Connect.
- ChatGPT: Settings > Apps > Advanced settings > Developer mode, then create an app with the URL.

**Coding tools and code send the key.** Anything that takes a URL and a header:

```
claude mcp add --transport http eleven-one https://data.elevenoneresearch.com/mcp \
  --header "Authorization: Bearer eo_..."
```

```json
{
  "mcpServers": {
    "eleven-one": {
      "type": "http",
      "url": "https://data.elevenoneresearch.com/mcp",
      "headers": { "Authorization": "Bearer eo_..." }
    }
  }
}
```

That block is the shape Cursor, Windsurf and VS Code take. Claude Code also signs in through
OAuth if the header is left out.

**The Claude plugin** bundles the connector with a skill that teaches the model to research with
these tools and cite every figure:

```
/plugin install eleven-one-data --marketplace jnolandAI/elevenone-research
```

**REST**, for scripts:

```
curl -X POST https://data.elevenoneresearch.com/v1/tools/company_financials \
  -H "Authorization: Bearer eo_..." -H "content-type: application/json" \
  -d '{"company":"ACN","metrics":["revenue","operating_margin"]}'
```

`GET /v1/tools` lists every tool with its JSON Schema. `GET /health` is open.

## Running it

```
npm install
cp .env.example .env        # then fill in what you have
npm run keygen -- acme      # issue a client key; put the hash in EO_API_KEY_HASHES
npm run dev                 # http://localhost:8787
npm test                    # unit, contract and OAuth tests, no network
npm run check               # typecheck
npm run smoke               # live checks through a real MCP client: EO_URL, EO_KEY
npm run stdio               # MCP over stdio, for a local client
```

SEC needs `SEC_USER_AGENT` with a contact email and no key. The World Bank needs nothing. BLS
works without a key at 25 requests a day, which a shared server spends quickly; set
`BLS_API_KEY`. FRED, Census and BEA need keys, free from each agency, linked in `.env.example`.
A source without its credential reports itself unavailable rather than failing upstream.

## Sign-in

`EO_OAUTH_SECRET` turns on OAuth 2.1. The server is its own authorization server: it publishes
protected-resource and authorization-server metadata, answers an unauthenticated MCP request with
a `WWW-Authenticate` challenge that points at them, accepts clients by Client ID Metadata Document
(Claude's recommended route) or by dynamic registration, requires PKCE with S256, and binds tokens
to this server's `/mcp`. The sign-in page asks for the person's Eleven One key.

Nothing is stored. Registrations, codes and tokens are signed and carry their own expiry, and a
token names the digest of the key it was issued against, so removing a key from
`EO_API_KEY_HASHES` revokes every token issued for it. Access tokens last an hour, refresh tokens
thirty days. `test/oauth.test.ts` runs the MCP SDK's own client through the whole flow.

`EO_ALLOW_ANONYMOUS=1` opens a no-key tier, limited per address by `EO_ANON_RATE_PER_MINUTE`.
It is off by default.

## How it is fast

Upstreams are the slow part, so the server avoids them. One shared cache sits in front of every
publisher, with TTLs set per source. Identical requests in flight are coalesced into one. FRED
and World Bank histories are fetched whole, so every range and limit a client asks for is a slice
of one cached response. Concurrency is bounded per publisher. And a warmer re-fetches the
catalog's series every 50 minutes, so the figures asked for most are always answered from memory.
Measured against live publishers on 2026-10-19: 100 to 600 ms cold, 5 to 10 ms warm. The World
Bank's cold path has taken as long as eleven seconds, which is what the warmer is for.

## Deploying

It needs a long-lived process: the cache and the warmer live in memory, which rules out
per-request functions (Netlify's included). The `Dockerfile` builds a container that runs on
Fly.io, Render, Railway or Cloud Run. Run one instance and keep it running; the cache and rate
limits are per process until the shared store in the roadmap exists.

```
docker build -t elevenone-data .
docker run -p 8787:8787 --env-file .env elevenone-data
```

## Publishing

- `server.json` is the entry for the official MCP Registry, under the `com.elevenoneresearch`
  namespace, which DNS verification of the domain proves.
- `plugin/` is the Claude plugin; `/.claude-plugin/marketplace.json` at the repository root lists
  it, which is what makes the install line above work.
- Every tool carries a title and `readOnlyHint`, which both the Claude and ChatGPT directories
  require.

## Known limits

- FRED, Census and BEA are tested against hand-written fixtures in the publishers' formats and
  have not yet been run against the live APIs, for want of keys. Run `npm run smoke` once the
  keys are set.
- `company_financials` reads US GAAP facts only, so IFRS filers (20-F) return nothing yet.
- Name lookup covers registrants with listed securities; others need their CIK.
- `bea_query` truncates at `limit` rows in BEA's own order, which is not newest first.
- A client metadata document is fetched only from a public hostname over HTTPS, but a hostname
  that resolves to a private address is not caught. The fetch sends no credentials and reads one
  JSON document.
- Redeemed authorization codes are remembered per process, so with more than one instance a code
  could be replayed within its sixty seconds on another instance. Run one instance.
