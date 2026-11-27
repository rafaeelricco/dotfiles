#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["youtube-transcript-api>=1.2.3,<2", "requests>=2.32,<3"]
# ///
"""Collect a supplied list of YouTube videos into a resumable local corpus."""

import argparse
from contextlib import closing
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import tempfile
from urllib.parse import parse_qs, urlsplit
from xml.etree.ElementTree import ParseError

from requests import RequestException, Session
from youtube_transcript_api import (
    AgeRestricted, CouldNotRetrieveTranscript, NoTranscriptFound, RequestBlocked,
    TranscriptsDisabled, VideoUnavailable, VideoUnplayable, YouTubeTranscriptApi,
)

from fetch_transcript import format_timestamp


SCHEMA = """
CREATE TABLE IF NOT EXISTS videos (
    video_id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN
        ('pending','saved','blocked','unavailable','missing','retryable')),
    attempts INTEGER NOT NULL DEFAULT 0,
    reason TEXT,
    markdown TEXT,
    CHECK ((status = 'saved') = (markdown IS NOT NULL))
)
"""


class TimedSession(Session):
    def request(self, method, url, **kwargs):
        kwargs.setdefault("timeout", (10, 30))
        return super().request(method, url, **kwargs)


def parse_id(value):
    value = value.strip()
    pattern = r"[A-Za-z0-9_-]{11}"
    if re.fullmatch(pattern, value):
        return value
    url = urlsplit(value if "://" in value else "https://" + value)
    if url.scheme not in ("http", "https"):
        raise ValueError(value)
    parts = url.path.strip("/").split("/")
    candidate = ""
    if url.hostname == "youtu.be" and len(parts) == 1:
        candidate = parts[0]
    elif url.hostname in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
        if parts == ["watch"]:
            ids = parse_qs(url.query, keep_blank_values=True).get("v", [])
            candidate = ids[0] if len(ids) == 1 else ""
        elif len(parts) == 2 and parts[0] in {"shorts", "embed", "live"}:
            candidate = parts[1]
    if not re.fullmatch(pattern, candidate):
        raise ValueError(value)
    return candidate


def default_corpus(ids):
    identity = "\n".join(sorted(set(ids))).encode("ascii")
    return Path.cwd() / "youtube-transcripts" / hashlib.sha256(identity).hexdigest()[:16]


def fetch_one(api, video_id):
    try:
        track = next(iter(api.list(video_id)), None)
        if track is None:
            return "missing", "no_tracks", None
        result = track.fetch()
        if not any(segment.text.strip() for segment in result):
            return "missing", "empty_track", None
        lines = [
            f"# {video_id}", "",
            f"Video: https://www.youtube.com/watch?v={video_id}",
            "Source: youtube-transcript-api",
            f"Language: {result.language_code}", "",
        ]
        lines.extend(f"[{format_timestamp(s.start)}] {s.text}" for s in result)
        return "saved", None, "\n".join(lines) + "\n"
    except RequestBlocked as error:
        return "blocked", type(error).__name__, None
    except (VideoUnavailable, VideoUnplayable, AgeRestricted) as error:
        return "unavailable", type(error).__name__, None
    except (TranscriptsDisabled, NoTranscriptFound) as error:
        return "missing", type(error).__name__, None
    except (CouldNotRetrieveTranscript, RequestException, ParseError) as error:
        return "retryable", type(error).__name__, None


def collect(db, fetch, retry):
    candidates = db.execute("""
        SELECT video_id, attempts FROM videos
        WHERE status = 'pending' OR (? AND status IN ('blocked', 'retryable'))
        ORDER BY (status = 'blocked') DESC, rowid
    """, (retry,)).fetchall()
    for video_id, attempts in candidates:
        with db:
            # Claim and commit one result together. A killed writer releases its
            # lock and leaves the interrupted item eligible for the next pass.
            db.execute("BEGIN IMMEDIATE")
            blocked = db.execute(
                "SELECT video_id FROM videos WHERE status = 'blocked' LIMIT 1"
            ).fetchone()
            if blocked and not (retry and blocked[0] == video_id):
                break
            current = db.execute(
                "SELECT attempts FROM videos WHERE video_id = ?", (video_id,)
            ).fetchone()
            if current[0] != attempts:
                continue
            status, reason, markdown = fetch(video_id)
            db.execute("""
                UPDATE videos SET status = ?, reason = ?, markdown = ?, attempts = attempts + 1
                WHERE video_id = ?
            """, (status, reason, markdown, video_id))
        if status == "blocked":
            break


def export_file(path, markdown):
    data = markdown.encode("utf-8")
    if path.exists() and path.read_bytes() == data:
        return
    stream = tempfile.NamedTemporaryFile(dir=path.parent, delete=False)
    temporary = Path(stream.name)
    try:
        with stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def export_report(db, corpus, invalid):
    directory = corpus / "transcripts"
    directory.mkdir(exist_ok=True)
    videos = []
    saved = 0
    for row, video_id, status, reason, markdown in db.execute(
        "SELECT rowid, video_id, status, reason, markdown FROM videos ORDER BY rowid"
    ):
        path = None
        if status == "saved":
            path = directory / f"{row}-{video_id}.md"
            export_file(path, markdown)
            saved += 1
        videos.append(dict(id=video_id, status=status, reason=reason, path=str(path) if path else None))
    return dict(corpus=str(corpus), unique=len(videos), saved=saved, invalid_inputs=invalid, videos=videos)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("videos", nargs="*", help="YouTube URLs or video IDs")
    parser.add_argument("--output", type=Path, help="Corpus directory to create or resume")
    parser.add_argument("--retry", action="store_true", help="Also retry blocked or retryable items once")
    args = parser.parse_args(argv)
    ids, invalid = [], []
    for value in args.videos:
        try:
            ids.append(parse_id(value))
        except ValueError:
            invalid.append(value)
    if args.videos and not ids:
        print(json.dumps(dict(corpus=None, unique=0, saved=0, invalid_inputs=invalid, videos=[])))
        return 2
    if not ids and not (args.output and (args.output / "queue.sqlite3").is_file()):
        parser.error("supply videos or --output with an existing corpus")
    corpus = (args.output or default_corpus(ids)).resolve()
    try:
        corpus.mkdir(parents=True, exist_ok=True)
        with closing(sqlite3.connect(corpus / "queue.sqlite3", timeout=0)) as db, TimedSession() as session:
            with db:
                db.execute(SCHEMA)
                db.executemany("INSERT INTO videos(video_id) VALUES (?) ON CONFLICT DO NOTHING",
                               ((video_id,) for video_id in ids))
            export_report(db, corpus, invalid)
            api = YouTubeTranscriptApi(http_client=session)
            collect(db, lambda video_id: fetch_one(api, video_id), args.retry)
            report = export_report(db, corpus, invalid)
    except (OSError, sqlite3.Error) as error:
        print(json.dumps(dict(corpus=str(corpus), error=str(error))), file=sys.stderr)
        return 1
    print(json.dumps(report, indent=2))
    return 2 if invalid or report["unique"] != report["saved"] else 0


if __name__ == "__main__":
    sys.exit(main())
