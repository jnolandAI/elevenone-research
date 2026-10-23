# Launch checklist

What it takes to go from this repository to a connector people can find and use, in order.
Steps marked **(you)** need an account, a payment method, a domain, or a legal decision, so they
are the owner's to take.

## 1. Credentials (you)

- [ ] FRED key: https://fred.stlouisfed.org/docs/api/api_key.html
- [ ] BLS key: https://data.bls.gov/registrationEngine/ (without one, the whole server shares 25
      requests a day)
- [ ] Census key: https://api.census.gov/data/key_signup.html
- [ ] BEA key: https://apps.bea.gov/API/signup/
- [ ] `SEC_USER_AGENT`: "Eleven One Research" and an address that is read, such as a data@ alias
- [ ] `EO_OAUTH_SECRET`: `openssl rand -base64 48`, kept in the host's secret store
- [ ] First client keys: `npm run keygen -- <label>`, one per client, hashes into
      `EO_API_KEY_HASHES`

Then run `npm run smoke` locally with the keys set. It is the first live run of the FRED, Census
and BEA adapters.

## 2. Host (you)

- [ ] One always-on container from the `Dockerfile` (Fly.io, Render, Railway or Cloud Run with a
      minimum of one instance)
- [ ] `data.elevenoneresearch.com` pointed at it, with TLS
- [ ] `EO_PUBLIC_URL=https://data.elevenoneresearch.com`
- [ ] `EO_URL=https://data.elevenoneresearch.com EO_KEY=... npm run smoke` passes against it

## 3. Try it as a client would

- [ ] Claude: add it as a custom connector by URL, connect, sign in with a key, ask a question
      that needs three sources
- [ ] ChatGPT: the same, in Developer Mode
- [ ] Claude Code: `/plugin install eleven-one-data --marketplace jnolandAI/elevenone-research`
- [ ] The Add to Cursor and add to VS Code links on `/data`. Both follow each editor's documented
      link format, but neither editor's documentation shows a remote server in one, so click them

## 4. Pages the directories ask for (you)

Both directories want public URLs for these. The privacy policy and terms are legal documents
and need the owner's decisions; the rest can be drafted from this repository.

- [x] `/data`, `/privacy` and `/terms` are built and kept out of search. The choices behind the
      privacy policy and terms are in `docs/legal/decisions.md`
- [ ] A lawyer reads `/privacy` and `/terms`, and the notes at the foot of `decisions.md`
- [ ] Add Eleven Hundred LLC's state of formation and postal address to both (D1, D7)
- [ ] Name the host in the privacy policy once it is chosen (D4), and confirm Netlify Analytics
      is off for elevenoneresearch.com
- [ ] At launch: set `LAUNCHED` and `EFFECTIVE` in `src/lib/connect.ts`, empty `UNLAUNCHED` in
      `astro.config.mjs` (`tests/data-page.test.ts` fails until both are done), and link
      `/privacy` and `/terms` from the footer. Whether `/data` joins the nav is a separate
      decision, and `tests/pages.test.ts` pins the nav as it stands
- [x] Support contact: info@elevenoneresearch.com
- [ ] Icon, light and dark
- [ ] A reviewer key with a label such as `anthropic-review`, retired after review

## 5. Listings

- [ ] **MCP Registry.** Publish a TXT record for `elevenoneresearch.com` with `mcp-publisher`'s
      key, `mcp-publisher login dns --domain elevenoneresearch.com`, then
      `mcp-publisher publish services/data/server.json`. Bump `version` for each release.
- [ ] **Claude Connectors Directory.** claude.ai/directory/manage, Submit new, MCP connector.
      Authentication: OAuth with client ID metadata documents, and dynamic registration.
- [ ] **Claude plugin directory.** Submit `services/data/plugin` alongside the connector, so the
      two listings are paired.
- [ ] **ChatGPT Apps Directory.** Put the token from OpenAI's submission form in
      `EO_OPENAI_APPS_CHALLENGE`, which the server answers at `/.well-known/openai-apps-challenge`.
      Test cases and screenshots.
- [ ] **Community directories.** Smithery, Glama, PulseMCP, mcp.so.

## 6. Show it working

- [ ] Publish brief 001 with a note that its figures came through Eleven One Data, and a prompt a
      reader can run to reproduce one of them
