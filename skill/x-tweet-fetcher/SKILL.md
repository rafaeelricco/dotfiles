---
name: x-tweet-fetcher
description: >
  Fetch tweets, replies, timelines, search results, X Lists, and X Articles
  from X/Twitter without login or API keys. Single tweets: zero dependencies
  (FxTwitter). Timelines/search/replies: a Nitter instance (XTF_NITTER).
  Lists/Articles: a browser driver (Camofox or Playwright). Unified JSON
  schema across all backends; machine-readable error_code for agent branching.
disable-model-invocation: true
---

# X Tweet Fetcher

Fetch tweets from X/Twitter without authentication.

## Feature Overview

| Feature          | Command                            | Dependencies                 |
| ---------------- | ---------------------------------- | ---------------------------- |
| Single tweet     | `xtf --url <tweet_url>`            | None (zero deps)             |
| Reply threads    | `xtf --url <tweet_url> --replies`  | Nitter or browser            |
| User timeline    | `xtf --user <username> --limit 50` | Nitter or browser            |
| Search           | `xtf --search "<query>"`           | Nitter                       |
| User profile     | `xtf --user-info <username>`       | None (zero deps)             |
| X List           | `xtf --list <list_url_or_id>`      | Browser (Camofox/Playwright) |
| X Article        | `xtf --article <url_or_id>`        | Browser (Camofox/Playwright) |
| Mentions monitor | `xtf --monitor @<username>`        | Nitter or browser            |

`python3 scripts/fetch_tweet.py` accepts the same flags (v1-compatible entry point).

## Basic Usage (Zero Dependencies)

```bash
# JSON output (default)
xtf --url https://x.com/user/status/1234567890

# Human-readable
xtf --url https://x.com/user/status/1234567890 --text-only

# Output covers: text, author, stats (likes/retweets/views), media URLs,
# quoted tweets, and full article text for tweet-embedded articles.
```

## Timeline / Search / Replies (Nitter)

```bash
export XTF_NITTER=http://127.0.0.1:8788   # your instance; comma-separate for failover
xtf --user elonmusk --limit 20
xtf --search "openclaw" --limit 10
xtf --url https://x.com/user/status/123 --replies
```

Backend selection: `--backend auto` (default, Nitter first then browser), `--backend nitter`, `--backend browser`.

## Lists & Articles (Browser)

```bash
# Camofox running on localhost:9377 (default), or:
export XTF_BROWSER=playwright

xtf --list https://x.com/i/lists/1455045069516357634 --limit 30
xtf --article https://x.com/i/article/2011779830157557760
```

Note: full X Article text requires X login; without it you get title + public preview (`is_partial: true`).

## Mentions Monitor (cron-friendly)

```bash
xtf --monitor @yourhandle
# exit 0 = no new mentions, 1 = new mentions found, 2 = setup error
# First run builds a baseline silently; later runs report only new URLs.
```

## Error Handling for Agents

Branch on **CLI JSON** from `xtf` / `python3 scripts/fetch_tweet.py` only (this skill is the agent surface; do not load README/CHANGELOG/MIGRATION for branching).

Keys on failure:

- `error` — human message
- `error_code` — stable machine code (below)
- `error_causes` — optional per-backend map; present when `error_code` is `all_backends_failed`

`error_code` values:
`invalid_input` · `not_found` · `rate_limited` · `upstream_down` · `backend_unavailable` · `not_supported` · `all_backends_failed`

Python library `XtfError.to_dict()` uses different keys (`code` / `message` / `causes`). Agents calling the library API must not assume CLI key names.
