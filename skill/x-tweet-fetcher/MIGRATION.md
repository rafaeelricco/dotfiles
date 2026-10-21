# Migrating from v1 to v2

## TL;DR

The `python3 scripts/fetch_tweet.py ...` command still accepts the same flags and exit codes.
It now calls the `xtf` package.
JSON fields are unchanged except for `--search`, which now uses the `--user` tweet schema.
If you read `--search` fields by name, review item 4 under Behavior changes before upgrading.

## What's new

- `pip install x-tweet-fetcher` installs the `xtf` command and an importable Python package (`from xtf import Router`).
- All backends produce the same `Tweet`/`Reply`/`Profile`/`Article` shapes.
- `XTF_NITTER=url1,url2` enables multiple Nitter instances with health checks and automatic failover.
- Every error result adds `error_code` and, when all backends fail, `error_causes`. The v1 `error` string stays unchanged.
- Transient 429/5xx/network failures are retried automatically with backoff.
- Parser fixture tests use `pytest` to catch upstream page changes before users report bugs.

## Behavior changes (intentional)

1. Browser mode no longer defaults to a hardcoded public Nitter instance.

   v1 defaulted `--nitter` to `nitter.tiekoetter.com`, which contradicted the README's advice.
   v2 uses your `XTF_NITTER` configuration, with `http://127.0.0.1:8788` as the default.

   If nothing is reachable, the router returns exit 1 rather than an empty result.
   It reports `error_code: "all_backends_failed"` and each attempted backend's reason under `error_causes`.
   Nitter reports `backend_unavailable` when no instance is reachable. The browser reports `backend_unavailable` when Camofox is not running.

   To restore v1 behavior exactly, use `--nitter nitter.tiekoetter.com`.

2. `--port` and `--nitter` inherit defaults from `XTF_BROWSER_PORT` / `XTF_NITTER`.

   The CLI no longer hardcodes those defaults. The effective defaults remain 9377 and localhost.

3. The optional `--browser-driver {camofox,playwright}` flag selects the browser driver.

   It replaces v1's "playwright silently overrides camofox if importable" behavior.
   The default is camofox. The driver is no longer swapped silently.

4. `--search` uses the same per-tweet schema as `--user`/timeline.

   v1 search returned the raw Nitter fields `username`, `display_name`, `time`, `url`, `has_media`, and `media_urls`.
   v2 normalizes every list-producing mode to the `Tweet` shape:

   | v1 field                         | v2 field                         |
   | -------------------------------- | -------------------------------- |
   | `username`                       | `author` (`@handle`)             |
   | `display_name`                   | `author_name`                    |
   | `time`                           | `time_ago`                       |
   | `url`, `has_media`, `media_urls` | No longer emitted by `--search`. |

   Shared fields remain `text`, `tweet_id`, `likes`, `retweets`, `replies`, and `views`.
   `media` is emitted only when non-empty.
   `--user` already used this schema in v1 and is unchanged.

   Every list-producing mode also adds a top-level `backend` field to record which backend served the request.
   `--user`/`--replies`/`--list` also carry `views_supplemented: true`.
   `--replies` adds `reply_count` as an alias of `count`.

## Where did the other scripts go?

v2 focuses on fetching tweets. These scripts were removed in v2 and remain available in the `v1-legacy` git tag:

| Script                                                                                   | Status                                                |
| ---------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `fetch_china.py`, `sogou_wechat.py`                                                      | Moving to a separate repo (Chinese-platform fetching) |
| `tweet_growth*.py`, `x-profile-analyzer.py`, `x_discover.py`                             | Analytics, out of scope; `v1-legacy` tag              |
| `arxiv_author_finder.py`, `paper_recommend.py`, `paper_to_obsidian.py`, `to_obsidian.py` | Unrelated to tweets; `v1-legacy` tag                  |
| `x_mentions_nitter.py`                                                                   | Merged into `--monitor --backend nitter`              |
| `nitter_client.py`, `camofox_client.py`, `playwright_client.py`, `common.py`             | Now live inside `src/xtf/`                            |

Use `git checkout v1-legacy` to return to the old version.

## Mentions cache

The v1 cache at `~/.x-tweet-fetcher/mentions-cache-*.json` is read without changes, including the old bare-list format.
No action is needed.
