---
name: ic-signal
description: Read THE SIGNAL — Immersive Commons' weekly AI intelligence dispatch — over MCP, markdown, or feeds. Use when the human says "what's in the latest SIGNAL", "show me this week's IC newsletter", "search the SIGNAL for X", "what did IC publish about Anthropic / OpenAI / xAI / robotics", "get me issue NN", or any flavor of "Immersive Commons newsletter / dispatch / The Signal". No agent token required — the entire publication is public. Companion path — agents that want a one-fetch ingest can hit /newsletter/{slug}.md directly; agents that want JSON trees use the 5 MCP tools below. Official immersivecommons.com skill.
---

You help an agent's human read and search THE SIGNAL, Immersive Commons' weekly AI intelligence dispatch. The publication ships every Saturday from Frontier Tower SF and covers six beats per issue: arms race, security, embodiment, capital, capability curves, frontier drift. Each issue contains 13–14 stories; each story has a feature card (prompt / ticker / receipt / lexicon / wager / watchlist / reckoning).

Five **public** (no-token) MCP tools at `https://www.immersivecommons.com/api/mcp`:

- `ic_signal_list_issues({ limit? })` — issue summaries, newest first.
- `ic_signal_get_latest()` — the most-recent issue summary (convenience).
- `ic_signal_get_issue({ slug })` — full issue tree (beats + stories + meta + sources).
- `ic_signal_get_story({ slug, story_id })` — single story.
- `ic_signal_search({ q, limit? })` — ranked substring hits across every issue.

No `Authorization: Bearer` header needed. The five `ic_signal_*` tools are explicitly registered as anonymous in the MCP discovery doc (`/.well-known/mcp.json` `public_tools` field).

## Pre-flight (every session)

Smoke probe — anonymous tools/call, no bearer:

```bash
curl -sS -X POST https://www.immersivecommons.com/api/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"ic_signal_get_latest","arguments":{}}}'
```

200 + a JSON result with a `slug` field = good. A 4xx means the deploy hasn't shipped this slice yet — fall back to the markdown variant at `/newsletter/{slug}.md`.

## The four common flows

### A. "What's in the latest SIGNAL?"

1. **Get the summary.**
   ```jsonc
   { "name": "ic_signal_get_latest", "arguments": {} }
   ```
   Returns `{ slug, number, title, dek, datespan, published, story_count, beat_count, html_url, markdown_url }`. Surface the title + dek + datespan to the human; ask if they want the full thing.

2. **If yes, fetch the tree.**
   ```jsonc
   { "name": "ic_signal_get_issue", "arguments": { "slug": "<slug from step 1>" } }
   ```
   Returns the full issue tree. For LLM ingest, prefer the markdown URL — `GET https://www.immersivecommons.com/newsletter/{slug}.md` — which is ~70% smaller than the JSON tree.

### B. "Search the SIGNAL for {topic}"

```jsonc
{ "name": "ic_signal_search", "arguments": { "q": "Anthropic", "limit": 10 } }
```

Returns ranked hits with `{ slug, issue_number, issue_title, story_id?, story_headline?, snippet, score, url }`. The score weights headline > dek > body, and an issue-level hit (title + dek) scores 3× a body match. Surface the top 3 to the human as headline + snippet + URL.

### C. "Get me issue {N}"

If the human says "issue 5" or "the May 16 dispatch", first list issues to find the slug:

```jsonc
{ "name": "ic_signal_list_issues", "arguments": { "limit": 20 } }
```

Then call `ic_signal_get_issue({ slug })` with the matched slug.

### D. "What did issue {slug} say about {story_id}?"

If the human references a specific story (the kebab-case id is in URLs like `/newsletter/issue-05#grok-build`), fetch the story directly:

```jsonc
{ "name": "ic_signal_get_story", "arguments": { "slug": "issue-05", "story_id": "grok-build" } }
```

Returns the full story tree including body paragraphs, feature card, image, and source citations.

## Alternative surfaces (no MCP needed)

- **Per-issue markdown**: `GET https://www.immersivecommons.com/newsletter/{slug}.md` — clean markdown, no JSON wrapping. Best for one-shot RAG ingest. ~70% token savings vs the JSON tree.
- **Atom feed**: `https://www.immersivecommons.com/newsletter/feed.xml` — standard Atom 1.0 for any feed reader.
- **JSON Feed**: `https://www.immersivecommons.com/newsletter/feed.json` — JSON Feed 1.1.
- **Discovery**: `https://www.immersivecommons.com/.well-known/signal.llmfeed.json` — metadata + access policy.

## Hard rules

- **Quote with attribution.** The publication is licensed under Content-Signal `search=yes, ai-input=yes, ai-train=no`. Agents can quote with a link back to `/newsletter/{slug}`; agents should NOT use the content as training data.
- **Do not invent.** Stories cite real sources (linked in `meta.sources[]`). If the human asks for verification, point them at the source URLs — don't invent a new attribution.
- **The slug list is finite.** The newsletter ships weekly; `ic_signal_list_issues` always returns the current set. Do not invent slugs like `issue-99` — the tool returns `404`-style errors with the actual list of valid slugs.

## Quickstart for fresh agents

1. No token. The five `ic_signal_*` tools are anonymous.
2. Smoke probe: `ic_signal_get_latest()` over MCP. 200 = good.
3. Loop the four flows above on demand. For long-form ingest, prefer the `/newsletter/{slug}.md` URL over the JSON tree.

## Related skills

- `ic-events` — Upcoming events (auth-required; same MCP endpoint).
- `floor10-submit` — Submit a highlight to the floor's moderation queue (auth-required).
- `ic-onboarding` — RFC 8628 device-code signup for getting an authenticated token (only needed if you want the other 32 tools).

## Discovery surfaces

- Agent card: https://www.immersivecommons.com/.well-known/agent-card.json
- Aiia manifest: https://www.immersivecommons.com/.well-known/ai-agent.json
- MCP discovery: https://www.immersivecommons.com/.well-known/mcp.json
- Signal feed metadata: https://www.immersivecommons.com/.well-known/signal.llmfeed.json
- llms.txt URL map: https://www.immersivecommons.com/llms.txt
- Human-facing archive: https://www.immersivecommons.com/signal
- Newsletter feed (Atom): https://www.immersivecommons.com/newsletter/feed.xml
- Newsletter feed (JSON Feed 1.1): https://www.immersivecommons.com/newsletter/feed.json
