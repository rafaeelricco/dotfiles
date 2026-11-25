"""Turn yt-dlp captions in OUT/subs into one Markdown file per video in OUT/txt.

Usage: parse_captions.py OUT LANGS [--pending]
LANGS is the comma-separated preference order given to yt-dlp, e.g. en-orig,en.
--pending prints the watch URL of each listed video still to fetch: no metadata yet,
or metadata offering a requested track that was not saved.
Captions are grouped into ~10 s lines stamped [mm:ss].
"""
import json
import re
import sys
from pathlib import Path

BLOCK_S = 10
TABS = {"videos", "shorts", "streams"}
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")


def caption_lines(path: Path) -> list[str]:
    lines, cur, buf = [], -1, []
    for e in json.loads(path.read_text(encoding="utf-8")).get("events", []):
        if "segs" not in e:
            continue
        t = e.get("tStartMs", 0) // 1000
        txt = "".join(s.get("utf8", "") for s in e["segs"]).replace("\n", " ").strip()
        if not txt:
            continue
        if cur < 0 or t - cur >= BLOCK_S:
            if buf:
                lines.append(f"[{cur // 60:02d}:{cur % 60:02d}] " + " ".join(buf))
            cur, buf = t, []
        buf.append(txt)
    if buf:
        lines.append(f"[{cur // 60:02d}:{cur % 60:02d}] " + " ".join(buf))
    return lines


def main() -> None:
    out, langs = Path(sys.argv[1]), sys.argv[2].split(",")
    subs, txt = out / "subs", out / "txt"
    listed, seen = [], set()
    # Split on "\n" only: titles come from the channel, and splitlines() also breaks on
    # characters like U+2028, which would let a title forge a record.
    for line in (out / "list.txt").read_text(encoding="utf-8").split("\n"):
        if not line:
            continue
        tab, vid, rest = (line.split("|", 2) + ["", ""])[:3]
        if tab not in TABS or not VIDEO_ID.fullmatch(vid):  # vid becomes a file name
            print(f"skipping malformed list line: {line[:80]!r}", file=sys.stderr)
            continue
        if vid not in seen:  # a video can show up in two tabs
            seen.add(vid)
            listed.append((tab, vid, rest.rsplit("|", 1)[0]))  # titles may contain "|"

    def info(vid: str) -> dict | None:
        try:  # a run killed mid-write leaves a truncated file: treat it as not fetched
            return json.loads((subs / f"{vid}.info.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def caption(vid: str) -> tuple[Path | None, list[str]]:
        for p in (subs / f"{vid}.{l}.json3" for l in langs):
            try:
                return p, caption_lines(p)
            except (OSError, ValueError):
                continue
        return None, []

    def pending(meta: dict | None, src: Path | None) -> bool:
        # yt-dlp writes info.json last, and with --ignore-errors a failed caption download
        # still writes it: a requested track that is offered but not saved is unfinished.
        if meta is None:
            return True
        offered = {**meta.get("automatic_captions", {}), **meta.get("subtitles", {})}
        return src is None and any(l in offered for l in langs)

    if "--pending" in sys.argv[3:]:
        for _, vid, _ in listed:
            meta = info(vid)
            if pending(meta, caption(vid)[0]):
                print(f"https://www.youtube.com/watch?v={vid}")
        return

    txt.mkdir(parents=True, exist_ok=True)
    left, no_captions, with_captions = [], [], 0
    for tab, vid, title in listed:
        meta = info(vid)
        src, body = caption(vid)
        if pending(meta, src):
            left.append(vid)
        elif body:
            with_captions += 1
        else:
            no_captions.append(vid)
        meta = meta or {}
        header = (f"# {title}\nid: {vid}\nurl: https://www.youtube.com/watch?v={vid}\nkind: {tab}\n"
                  f"upload_date: {meta.get('upload_date', '')}\nviews: {meta.get('view_count', '')}\n"
                  f"duration_s: {meta.get('duration', '')}\ncaption_source: {src.name if src else None}\n")
        empty = "(not fetched yet)" if vid in left else "(no captions available)"
        (txt / f"{vid}.md").write_text(
            f"{header}\n## Description\n{meta.get('description', '')}\n\n## Transcript\n"
            + ("\n".join(body) or empty) + "\n", encoding="utf-8")
    for label, ids in (("no captions", no_captions), ("pending", left)):
        if ids:
            print(f"{label} ({len(ids)}):", " ".join(ids))
    print(f"{len(listed)} videos, {with_captions} with captions, {len(no_captions)} without, "
          f"{len(left)} pending -> {txt}")
    sys.exit(1 if left or not listed else 0)


if __name__ == "__main__":
    main()
