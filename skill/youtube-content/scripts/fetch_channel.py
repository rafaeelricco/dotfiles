#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["youtube-transcript-api>=1.0", "yt-dlp"]
# ///
"""Save each video of a YouTube channel as a timestamped Markdown transcript.

Usage: uv run fetch_channel.py <channel-url> --out DIR [--limit N] [--sleep 30] [--refresh-list]
A paced queue: one video at a time, a jittered pause after each request, and a wait-and-retry
when YouTube blocks the IP. Saved videos are skipped, so rerunning resumes.
The video list is cached in DIR/videos.json; failures go to DIR/failures.json.
"""
import argparse
import json
import os
import random
import re
import sys
import time
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

import yt_dlp
from fetch_transcript import fetch_transcript, format_timestamp  # same folder

BLOCK_WAITS = (30 * 60, 60 * 60, 120 * 60)  # seconds; still blocked after these ends the run
BLOCK_ERRORS = ("RequestBlocked", "IpBlocked")


def videos_tab_url(channel_url: str) -> str:
    """Point any channel link (a tab, a trailing slash, `?si=` tracking) at its Videos tab."""
    parts = urlsplit(channel_url.strip())
    path = re.sub(r"/(videos|shorts|streams|featured|playlists|community|about)$", "",
                  parts.path.rstrip("/"))
    return urlunsplit((parts.scheme or "https", parts.netloc, path + "/videos", "", ""))


def list_videos(channel_url: str, limit: int | None) -> list[dict]:
    opts = {"extract_flat": True, "quiet": True, "playlistend": limit,
            "extractor_args": {"youtubetab": {"approximate_date": [""]}}}
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(videos_tab_url(channel_url), download=False)
    # Flat listings fill only an approximate `timestamp`, not `upload_date`.
    return [{"id": e["id"], "title": e.get("title", ""),
             "date": time.strftime("%Y-%m-%d", time.gmtime(e["timestamp"])) if e.get("timestamp") else ""}
            for e in info.get("entries", []) if e.get("id")]


def load_queue(out: Path, channel_url: str, limit: int | None, refresh: bool) -> list[dict]:
    """List the channel once and reuse it, so a resume costs no listing requests."""
    cache = out / "videos.json"
    if cache.exists() and not refresh:
        return json.loads(cache.read_text(encoding="utf-8"))
    try:
        videos = list_videos(channel_url, limit)
    except yt_dlp.utils.DownloadError as e:
        sys.exit(f"Could not list the channel ({e}). If YouTube is blocking this IP, rerun later.")
    write_atomic(cache, json.dumps(videos, ensure_ascii=False, indent=2) + "\n")
    return videos


def write_atomic(path: Path, text: str) -> None:
    """A killed run must not leave a partial file that later counts as done."""
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(text, encoding="utf-8")
    os.replace(tmp, path)


def write_markdown(path: Path, video: dict, segments: list[dict]) -> None:
    head = (f"---\ntitle: {json.dumps(video['title'], ensure_ascii=False)}\n"
            f"url: https://www.youtube.com/watch?v={video['id']}\n"
            f"date: {video['date']}  # approximate\n---\n")
    # One line per segment: every line must start with its timestamp for citations.
    body = "\n".join(f"{format_timestamp(s['start'])} {' '.join(s['text'].split())}" for s in segments)
    write_atomic(path, head + body + "\n")


def fetch_with_backoff(video_id: str) -> list[dict]:
    for wait in (*BLOCK_WAITS, None):
        try:
            return fetch_transcript(video_id)
        except Exception as e:
            if type(e).__name__ not in BLOCK_ERRORS or wait is None:
                raise
            print(f"  blocked by YouTube; waiting {wait // 60} min, then retrying", flush=True)
            time.sleep(wait)


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("channel_url")
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=None, help="Newest N videos only")
    parser.add_argument("--sleep", type=float, default=30.0,
                        help="Average seconds between videos (jittered x0.5-1.5)")
    parser.add_argument("--refresh-list", action="store_true", help="List the channel again")
    args = parser.parse_args()

    args.out.mkdir(parents=True, exist_ok=True)
    failures_path = args.out / "failures.json"
    failures = json.loads(failures_path.read_text(encoding="utf-8")) if failures_path.exists() else {}
    videos = load_queue(args.out, args.channel_url, args.limit, args.refresh_list)
    saved = skipped = 0
    for i, video in enumerate(videos, 1):
        path = args.out / f"{video['id']}.md"
        tag = f"[{i}/{len(videos)}] {video['id']} {video['title']}"
        if path.exists():
            skipped += 1
            continue
        try:
            segments = fetch_with_backoff(video["id"])
        except Exception as e:  # one bad video must not stop the channel
            if type(e).__name__ in BLOCK_ERRORS:
                sys.exit(f"{tag}: still blocked after {sum(BLOCK_WAITS) // 60} min; rerun later to resume.")
            failures[video["id"]] = f"{video['title']}: {e}"
            write_atomic(failures_path, json.dumps(failures, ensure_ascii=False, indent=2) + "\n")
            print(f"{tag}: failed", flush=True)
        else:
            write_markdown(path, video, segments)
            failures.pop(video["id"], None)
            saved += 1
            print(f"{tag}: saved", flush=True)
        time.sleep(args.sleep * random.uniform(0.5, 1.5))

    write_atomic(failures_path, json.dumps(failures, ensure_ascii=False, indent=2) + "\n")
    print(f"saved {saved}, skipped {skipped}, failed {len(failures)}")


if __name__ == "__main__":
    main()
