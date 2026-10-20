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

## 4. Pages the directories ask for (you)

Both directories want public URLs for these. The privacy policy and terms are legal documents
and need the owner's decisions; the rest can be drafted from this repository.

- [ ] A documentation page, e.g. `elevenoneresearch.com/data`: what it is, the tools, how to
      connect each client
- [ ] Privacy policy: what is logged (time, path, status, latency, client label, tool name; not
      a tool's arguments or results), retention, third parties (the publishers queried), contact
- [ ] Terms of use, including that figures carry their publishers' licences
- [ ] Support contact
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
