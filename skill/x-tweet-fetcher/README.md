# x-tweet-fetcher

Fetch X/Twitter tweets, replies, timelines, lists, and articles without logging in or using API keys.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-green.svg)](https://www.python.org)
[![GitHub stars](https://img.shields.io/github/stars/ythx-101/x-tweet-fetcher?style=social)](https://github.com/ythx-101/x-tweet-fetcher)

It uses three backends with automatic fallback and a shared JSON schema for AI agents.

[Quick Start](#-quick-start) · [Backends](#-three-backends) · [Capabilities](#-capabilities) · [Python API](#-python-api) · [Self-hosted Nitter](#-self-hosted-nitter) · [Migrating from v1](#-migrating-from-v1)

<a id="-quick-start"></a>

## Quick start

```bash
git clone https://github.com/ythx-101/x-tweet-fetcher
cd x-tweet-fetcher && pip install .

# Single tweet — works instantly, zero configuration
xtf --url https://x.com/user/status/1234567890

# User timeline (needs a Nitter instance, see below)
export XTF_NITTER=http://127.0.0.1:8788
xtf --user elonmusk --limit 20

# Search
xtf --search "openclaw" --limit 10

# Human-readable output instead of JSON
xtf --user elonmusk --text-only
```

To run without installing, use `python3 scripts/fetch_tweet.py --url ...` from the clone. It accepts the same flags.

<a id="-three-backends"></a>

## Backends

| Backend        | Deps                    | Speed | Covers                                |
| -------------- | ----------------------- | ----- | ------------------------------------- |
| fxtwitter      | None (stdlib)           | ⚡⚡  | Single tweets, user profiles          |
| nitter         | A Nitter instance       | ⚡    | Timeline, search, replies, mentions   |
| browser        | Camofox _or_ Playwright | 🐢    | Everything above + Lists + X Articles |
| auto (default) | Best available          | ⚡→🐢 | Nitter first, browser fallback        |

```bash
xtf --user elonmusk                    # auto (default)
xtf --user elonmusk --backend nitter   # direct HTTP only
xtf --list 1455045069516357634         # lists always use the browser
```

The browser driver defaults to Camofox (`localhost:9377`). To use Playwright:

```bash
pip install ".[playwright]"            # from the clone
export XTF_BROWSER=playwright          # or: --browser-driver playwright
```

<a id="-capabilities"></a>

## Capabilities

| Feature                                       | Flag              | Backend            |
| --------------------------------------------- | ----------------- | ------------------ |
| Single tweet (text, stats, media, quotes)     | `--url`           | fxtwitter          |
| Reply comments (threaded)                     | `--url --replies` | nitter / browser   |
| User timeline (paginated)                     | `--user`          | nitter / browser   |
| Search                                        | `--search`        | nitter             |
| User profile                                  | `--user-info`     | fxtwitter → nitter |
| X List tweets                                 | `--list`          | browser            |
| X Article full text                           | `--article`       | browser            |
| Mentions monitor (incremental, cron-friendly) | `--monitor`       | nitter / browser   |

Exit codes for cron jobs:

| Code | Meaning                     |
| ---- | --------------------------- |
| `0`  | Success / no new mentions.  |
| `1`  | Error / new mentions found. |
| `2`  | Monitor setup error.        |

Every failure includes `error` with a human-readable message and an `error_code` that agents can branch on:

- `invalid_input`
- `not_found`
- `rate_limited`
- `upstream_down`
- `backend_unavailable`
- `all_backends_failed`

`all_backends_failed` also includes per-backend `error_causes`.

<a id="-python-api"></a>

## Python API

```python
from xtf import Router, NotFound, RateLimited

router = Router()                                  # backend="auto"
tweet   = router.fetch_tweet("user", "1234567890") # dict, v1-compatible shape
tweets  = router.fetch_timeline("user", limit=20)  # list[Tweet]
replies = router.fetch_replies("user", "1234567890")
results = router.search("openclaw", limit=10)

for tw in tweets:
    print(tw.author, tw.likes, tw.text)
    print(tw.to_dict())                            # JSON-ready
```

All backends use one `Tweet` / `Reply` / `Profile` / `Article` schema.
A downstream prompt only needs to describe one data shape.

<a id="-configuration"></a>

## Configuration

Use environment variables to configure the tool. CLI flags override them:

| Variable           | Default                 | Meaning                                                        |
| ------------------ | ----------------------- | -------------------------------------------------------------- |
| `XTF_NITTER`       | `http://127.0.0.1:8788` | Comma-separated Nitter instances, tried in order with failover |
| `XTF_BROWSER`      | `camofox`               | Browser driver: `camofox` or `playwright`                      |
| `XTF_BROWSER_PORT` | `9377`                  | Camofox HTTP port                                              |
| `XTF_LANG`         | `zh`                    | Message language: `zh` or `en`                                 |
| `XTF_CACHE_DIR`    | `~/.x-tweet-fetcher`    | Mentions-monitor cache                                         |

`NITTER_URL`, the v1 name, still works as a fallback for `XTF_NITTER`.

<a id="-self-hosted-nitter"></a>

## Self-hosted Nitter

Use a self-hosted Nitter instance for timelines, search, and replies.
Public instances are unreliable and often go offline:

```bash
# See https://github.com/zedeus/nitter for full setup
docker run -d -p 8788:8080 --name nitter zedeus/nitter:latest
export XTF_NITTER=http://127.0.0.1:8788
```

Configure multiple instances for automatic failover:

```bash
export XTF_NITTER=http://127.0.0.1:8788,https://your-backup-instance.example
```

If no instance is reachable, the request fails rather than returning an empty result.
The response includes `error_code: "all_backends_failed"` and each backend's reason, such as `backend_unavailable`, under `error_causes`.
The error tells you what to configure.

<a id="-project-structure"></a>

## Project structure

```
src/xtf/
├── models.py        # Tweet / Reply / Profile / Article dataclasses
├── backends/
│   ├── fxtwitter.py # single tweets + profiles
│   ├── nitter.py    # direct HTTP, multi-instance failover
│   └── browser.py   # Camofox / Playwright snapshot fetching
├── parsers/         # pure functions, locked by fixture tests
├── router.py        # auto-fallback chain
├── monitor.py       # incremental mentions monitor
└── cli.py           # the `xtf` command
scripts/fetch_tweet.py   # v1-compatible entry point (thin shim)
tests/fixtures/          # captured page structures — regression protection
```

<a id="-migrating-from-v1"></a>

## Migrating from v1

`python3 scripts/fetch_tweet.py` still accepts all v1 flags and exit codes.
JSON fields are unchanged except for `--search`, which now uses the `--user` tweet schema.
Some fields were renamed; `url`/`has_media`/`media_urls` were removed.

See [MIGRATION.md](MIGRATION.md) for the full changes and where the analytics/China/Obsidian scripts moved.
Those scripts have their own repositories. This project now focuses on fetching tweets.
The old version remains at the `v1-legacy` tag.

<a id="-development"></a>

## Development

```bash
pip install -e ".[dev]"
pytest          # all parsers locked by fixture tests
ruff check src tests
```

When Nitter or X change their page structure, capture a fresh snapshot in `tests/fixtures/`.
The failing test identifies which parser and field broke.

<a id="-problem"></a>

## Background

```
You: fetch that tweet / list / article for me
AI:  I can't access X/Twitter. Please copy-paste the content manually.

You: ...seriously?
```

X has no free API. Scraping gets you blocked. Browser automation is fragile in headless environments.

FxTwitter handles single tweets without dependencies.
Nitter uses direct HTTP for timelines and search.
A browser driver handles other requests. The router falls back automatically between backends.

<a id="-acknowledgments"></a>

## Acknowledgments

- [Nitter](https://github.com/zedeus/nitter) by [zedeus](https://github.com/zedeus): self-hosted Twitter frontend
- [FxTwitter](https://github.com/FxEmbed/FxEmbed): public API for single tweet data
- [Camofox](https://github.com/openclaw/camofox): anti-fingerprint browser, default browser driver
- [Playwright](https://github.com/microsoft/playwright): alternative browser automation driver
- [OpenClaw](https://github.com/openclaw/openclaw): AI agent framework this tool grew up in

<a id="-license"></a>

## License

[MIT](https://opensource.org/licenses/MIT) © 2026 ythx-101

[GitHub](https://github.com/ythx-101/x-tweet-fetcher) · [Issues](https://github.com/ythx-101/x-tweet-fetcher/issues) · [#22 Teahouse](https://github.com/ythx-101/openclaw-qa/discussions/22) · [Agent Waystation](https://github.com/ythx-101/openclaw-qa)
