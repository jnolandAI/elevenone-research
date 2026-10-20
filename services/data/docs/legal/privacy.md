# Privacy policy: Eleven One Data (draft)

> **Draft for review, not legal advice.** Written from what the code in `services/data` does on
> 2026-10-20, so every factual statement can be checked against it. Items marked **[Decision]**
> are the owner's to settle; `docs/legal/decisions.md` lists them in one place. A lawyer should
> read the final text before it is published. It is written in the third person so it can become
> a page on elevenoneresearch.com without rewording.

**Effective date:** [Decision D11]

This policy describes the information Eleven One Data collects, what it is used for, who receives
it, and how long it is kept. Eleven One Data is a service of Eleven One Research, part of
[Decision D1: legal entity name, state of formation, and postal address] ("Eleven One Research").
It applies to the service at data.elevenoneresearch.com, to its sign-in page, and to requests for
a key. The website elevenoneresearch.com is covered in the last section.

## In brief

- The service records which key made a request, which tool it called, when, and how long the
  answer took. It does not record what was asked or what was returned.
- Keys are stored only as a one-way digest.
- The publishers that supply the data see requests from the service's server, never from a user.
- Nothing is sold, nothing is used for advertising, and nothing a user asks is used to train a
  model.

## What is collected

**When a key is requested.** A request for a key is made by email, and it carries whatever the
sender includes: usually a name, an email address and an organization. That correspondence is
kept as ordinary business email. [Decision D2: the address keys are requested from, and the email
provider that holds it.]

**The key itself.** A key is shown once, when it is issued. The service stores a SHA-256 digest
of it and a label chosen when it was issued, usually the organization's name. The key cannot be
recovered from the digest.

**Each request.** For every request the service logs the time, the HTTP method and path, the
response status, how long the response took, and the label of the key that made it. For a call
through the Model Context Protocol it also logs the tool's name, how many requests the service
made to publishers to answer it, and how many were answered from its cache. It does not log a
tool's arguments (the company, series, place or phrase asked about) or its results.

**Requests made without a key.** [Decision D5: whether the no-key tier is offered.] If it is,
a request without a key is identified in the log by the internet address it came from, because
that address is what its rate limit is counted against.

**Errors.** When the service fails in a way it did not anticipate, it logs the error and the
internal location where it happened, to diagnose the fault. Expected errors, such as an unknown
company or a missing value, are returned to the user and not logged.

**Signing in.** When a person connects an assistant by signing in, the sign-in page asks for
their Eleven One key. The key is compared against the stored digests and is not stored or passed
to the assistant. The assistant receives a signed token that expires after an hour and can be
renewed for up to thirty days. Tokens are not stored by the service: each one carries its own
expiry and the digest of the key it was issued for, which is how retiring a key ends every token
issued for it. The sign-in page sets no cookies.

**Information about the assistant.** When an assistant registers to use the sign-in, the service
receives the assistant's name and the address it should return the user to. That information is
written into the identifier the service gives back, and is not stored. Where an assistant
identifies itself by a published metadata document, the service fetches that document and keeps
it in memory for up to an hour.

## What the service does with arguments

To answer a question, the service sends the relevant part of it to the publisher that holds the
data: a ticker to the SEC, a series identifier to FRED, a county to the Census Bureau, a search
phrase to SEC full-text search. Answers are kept in an in-memory cache, keyed by the request sent
to the publisher, for between one hour and thirty days depending on the source, so that the same
question is answered faster the next time. The cache is not written to disk, does not record
which user asked, and is emptied whenever the service restarts.

## Who receives information

- **Publishers.** The SEC, the Federal Reserve Bank of St. Louis (FRED), the Bureau of Labor
  Statistics, the Census Bureau, the Bureau of Economic Analysis and the World Bank receive the
  requests described above. The requests come from the service's server, which identifies itself
  to the SEC as its fair-access rules require. No user's identity, key or internet address is
  sent to a publisher.
- **The assistant a user connects.** Results go into the user's conversation with Claude,
  ChatGPT, a coding tool or a script. What that provider does with a conversation is governed by
  the user's agreement with it.
- **Service providers.** The service runs on [Decision D4: hosting provider and region], which
  processes requests on the service's behalf and keeps its own access logs, including internet
  addresses, for [Decision D4: the host's log retention]. Email is handled by [Decision D2].
- **When the law requires it.** Information may be disclosed to comply with a legal obligation or
  a valid legal request, or to protect the service and its users from abuse.

Information is not sold or rented, and is not used for advertising.

## How long it is kept

Request and error logs are kept for [Decision D3: retention period, for example 30 days] and
then deleted. Key digests and labels are kept while the key is active and deleted
[Decision D3: period] after it is retired. Correspondence about keys is kept as business records
for [Decision D3: period].

## Security

The service is reached only over HTTPS. Keys are stored as digests, tokens are signed and expire,
the sign-in page cannot be embedded in another site, and every key and every internet address
using the no-key tier is rate limited. No method of transmission or storage is perfectly secure,
and Eleven One Research cannot guarantee that information will never be accessed without
authorization.

## Choices and rights

A key holder can ask to see the information held about their key, to have it corrected, or to
have the key retired and its records deleted, by writing to [Decision D2]. Retiring a key ends
every token issued for it immediately.

[Decision D10: whether the service is offered to people in the European Union, the United
Kingdom or California. If it is, this section needs the legal basis for each use (likely the
contract with the key holder, and legitimate interest for security logs), the rights those laws
give (access, correction, deletion, restriction, objection, portability, complaint to a
regulator), and how information crosses borders to the host's region. The text above is written
so that those additions do not contradict it.]

## Children

The service is offered to businesses and professionals. It is not directed to anyone under 18
and does not knowingly collect information from them. [Decision D9]

## The website

elevenoneresearch.com, including the page that explains how to connect an assistant, sets no
cookies, runs no analytics script and loads nothing from a third party; its fonts are served from
the site itself. The site is hosted on Netlify, which keeps access logs, including internet
addresses, under its own policy. [Decision D4: confirm Netlify Analytics is off in the Netlify
dashboard; it runs on the server and cannot be seen from the site's code.]

## Changes

If this policy changes in a way that affects how information is used, key holders will be told
by email at least [Decision D13: notice period] before the change takes effect, and the effective
date above will change.

## Contact

Questions about this policy can be sent to [Decision D2].
