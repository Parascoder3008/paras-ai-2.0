---
name: firecrawl
description: >
  Default web research and scraping tool for this workspace. Use for web search, competitor research,
  pricing pages, articles, documentation, PDFs, JS-heavy pages, site maps and small crawls. Not for
  social video transcripts, use Supadata. Not for walled-platform comments or profile data, use Apify.
user-invocable: false
effort: low
---

# Firecrawl

This workspace ships its own small Firecrawl v2 client at `scripts/firecrawl_tool.py`. It runs through the isolated Python environment created by `/install`, so it does not depend on Node, npm or a global CLI.

## Before using it

```bash
uv run python scripts/firecrawl_tool.py status
```

If that reports a missing `FIRECRAWL_API_KEY`, follow `reference/getting-keys.md`. The founder pastes the key directly into `.env`, never into chat.

## Commands

```bash
# One page to Markdown
uv run python scripts/firecrawl_tool.py scrape "https://example.com" -o .firecrawl/example.md

# Search and scrape the top results
uv run python scripts/firecrawl_tool.py search "AI agency pricing models" --limit 5 -o .firecrawl/search-pricing.json

# Find URLs on a domain
uv run python scripts/firecrawl_tool.py map "https://docs.example.com" --limit 100 -o .firecrawl/docs-map.json

# Pull a small site section
uv run python scripts/firecrawl_tool.py crawl "https://docs.example.com" --limit 20 -o .firecrawl/docs.json
```

## Escalation order

1. No URL yet: `search`.
2. One known URL: `scrape`.
3. Large site, uncertain page: `map`, then `scrape` the match.
4. Several pages from one section: `crawl` with a conservative limit.
5. A page needs login, clicks or scrolling: say the local client cannot handle that path. Use an approved interactive browser tool if one is available, or stop and ask the founder to provide the exported content.

## Output rules

- Write temporary results to `.firecrawl/`; it is git-ignored.
- Search output already includes scraped Markdown. Do not scrape the same results again.
- Inspect large files incrementally before loading them into context.
- Move durable findings into `reference/research/` or the relevant output folder.
- Never print, quote or log the API key.

## Source routing

| Need | Tool |
| --- | --- |
| Webpage, article, docs or PDF URL | Firecrawl |
| Web search | Firecrawl |
| YouTube, TikTok or social video transcript | Supadata |
| Social comments, profiles or walled-platform data | Apify |

The client uses Firecrawl API v2 endpoints verified against the official API reference on 2026-08-26.
