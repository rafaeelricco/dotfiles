"""Turn yt-dlp captions in OUT/subs, or Whisper results in OUT/asr, into one Markdown
file per video in OUT/txt, listing the frames saved in OUT/frames.

Usage: parse_captions.py OUT LANGS [--asr off|gate|all] [--visual on|off]
                         [--pending | --asr-todo | --visual-todo]
LANGS is the comma-separated preference order given to yt-dlp, e.g. en-orig,en.
--pending prints the watch URL of each listed video still to fetch: no metadata yet,
or metadata offering a requested track that was not saved.
--asr picks the videos read from audio instead of captions: none (off, the default),
those whose captions fail asr_reason (gate), or every fetched video (all).
--asr-todo prints the ID of each of those videos without a Whisper result yet.
--visual-todo prints the ID of each fetched video without frames yet; --visual on
counts such a video as pending.
Captions are grouped into ~10 s lines stamped [mm:ss].
"""
import json
import re
import sys
from pathlib import Path

BLOCK_S = 10
MIN_WPM = 40  # captions with fewer spoken words per minute go to Whisper; see references/media.md
ASR_MODES = ("off", "gate", "all")
TABS = {"videos", "shorts", "streams"}
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")
NOISE = re.compile(r"\[[^\]]*\]|♪")  # [Music], [Applause] and music notes are not speech
# Thai, kana and CJK ideographs: these scripts put no spaces between words.
UNSPACED = re.compile(r"[\u0e00-\u0e7f\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")


def stamp(seconds: float) -> str:
    s = int(seconds)
    return f"[{s // 60:02d}:{s % 60:02d}]"


def spoken_words(text: str) -> float:
    """Words in a caption, counting about two unspaced-script characters as one word."""
    text = NOISE.sub(" ", text)
    return len(UNSPACED.sub(" ", text).split()) + len(UNSPACED.findall(text)) / 2


def caption_events(path: Path) -> list[tuple[float, str]]:
    events = json.loads(path.read_text(encoding="utf-8")).get("events", [])
    return [(e.get("tStartMs", 0) / 1000, "".join(s.get("utf8", "") for s in e["segs"]))
            for e in events if "segs" in e]


def group(events: list[tuple[float, str]]) -> list[str]:
    lines, cur, buf = [], -1, []
    for start, raw in events:
        t, txt = int(start), raw.replace("\n", " ").strip()
        if not txt:
            continue
        if cur < 0 or t - cur >= BLOCK_S:
            if buf:
                lines.append(f"{stamp(cur)} " + " ".join(buf))
            cur, buf = t, []
        buf.append(txt)
    if buf:
        lines.append(f"{stamp(cur)} " + " ".join(buf))
    return lines


def asr_reason(meta: dict, src: Path | None, events: list[tuple[float, str]]) -> str | None:
    """Why the captions cannot stand in for the speech, or None when they can."""
    if src is None:
        return "no captions"
    track = src.name.split(".")[-2]  # <id>.<track>.json3
    spoken = (meta.get("language") or "").split("-")[0]
    if (spoken and not track.endswith("-orig") and track not in meta.get("subtitles", {})
            and track.split("-")[0] != spoken):
        return f"translated from {spoken}"
    words = sum(spoken_words(txt) for _, txt in events)
    minutes = (meta.get("duration") or 0) / 60
    if minutes and words / minutes < MIN_WPM:
        return "sparse"
    return None


def main() -> None:
    out, langs, flags = Path(sys.argv[1]), sys.argv[2].split(","), sys.argv[3:]
    mode = flags[flags.index("--asr") + 1] if "--asr" in flags else "off"
    visual = flags[flags.index("--visual") + 1] if "--visual" in flags else "off"
    if mode not in ASR_MODES or visual not in ("on", "off"):
        sys.exit("usage: parse_captions.py OUT LANGS [--asr off|gate|all] [--visual on|off] "
                 "[--pending | --asr-todo | --visual-todo]")
    subs, txt, asr_dir, frames_dir = out / "subs", out / "txt", out / "asr", out / "frames"
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

    def caption(vid: str) -> tuple[Path | None, list[tuple[float, str]]]:
        for p in (subs / f"{vid}.{l}.json3" for l in langs):
            try:
                return p, caption_events(p)
            except (OSError, ValueError):
                continue
        return None, []

    def asr_result(vid: str) -> dict | None:
        try:  # transcribe.py writes this file only after the last chunk
            return json.loads((asr_dir / f"{vid}.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return None

    def frame_list(vid: str) -> list[dict] | None:
        try:  # extract_frames.py writes index.json only after the last frame
            return json.loads((frames_dir / vid / "index.json").read_text(encoding="utf-8"))["frames"]
        except (OSError, ValueError, KeyError):
            return None

    def wants_asr(meta: dict | None, src: Path | None, events: list) -> str | None:
        if mode == "off":
            return None
        return "all" if mode == "all" else asr_reason(meta or {}, src, events)

    def pending(meta: dict | None, src: Path | None) -> bool:
        # yt-dlp writes info.json last, and with --ignore-errors a failed caption download
        # still writes it: a requested track that is offered but not saved is unfinished.
        if meta is None:
            return True
        offered = {**meta.get("automatic_captions", {}), **meta.get("subtitles", {})}
        return src is None and any(l in offered for l in langs)

    if "--pending" in flags:
        for _, vid, _ in listed:
            meta = info(vid)
            if pending(meta, caption(vid)[0]):
                print(f"https://www.youtube.com/watch?v={vid}")
        return

    if "--asr-todo" in flags:
        for _, vid, _ in listed:
            meta, (src, events) = info(vid), caption(vid)
            if not pending(meta, src) and wants_asr(meta, src, events) and asr_result(vid) is None:
                print(vid)
        return

    if "--visual-todo" in flags:
        for _, vid, _ in listed:
            if not pending(info(vid), caption(vid)[0]) and frame_list(vid) is None:
                print(vid)
        return

    txt.mkdir(parents=True, exist_ok=True)
    left, no_captions, no_speech, transcribed, from_captions = [], [], [], [], 0
    for tab, vid, title in listed:
        meta = info(vid)
        src, events = caption(vid)
        reason = None if pending(meta, src) else wants_asr(meta, src, events)
        result = asr_result(vid) if reason else None
        shots = frame_list(vid)
        unheard = pending(meta, src) or bool(reason and result is None)
        if unheard:
            body, source = [], None
        elif reason and result:
            body = group([(s["start"], s["text"]) for s in result["segments"]])
            source = (f"asr {result['model']} ({result['language']} "
                      f"{result['language_probability']:.2f}); captions: {reason}")
        else:
            body, source = group(events), src.name if src else None
        if unheard or (visual == "on" and shots is None):
            left.append(vid)
        elif reason:
            (transcribed if body else no_speech).append(vid)
        elif body:
            from_captions += 1
        else:
            no_captions.append(vid)
        meta = meta or {}
        header = (f"# {title}\nid: {vid}\nurl: https://www.youtube.com/watch?v={vid}\nkind: {tab}\n"
                  f"upload_date: {meta.get('upload_date', '')}\nviews: {meta.get('view_count', '')}\n"
                  f"duration_s: {meta.get('duration', '')}\ntranscript_source: {source}\n")
        empty = ("(not fetched yet)" if vid in left else
                 "(no speech detected)" if vid in no_speech else "(no captions available)")
        frames = "".join(f"{stamp(f['t'])} frames/{vid}/{f['file']}\n" for f in shots or [])
        (txt / f"{vid}.md").write_text(
            f"{header}\n## Description\n{meta.get('description', '')}\n\n## Transcript\n"
            + ("\n".join(body) or empty) + "\n"
            + (f"\n## Frames\n{frames}" if frames else ""), encoding="utf-8")
    for label, ids in (("no speech", no_speech), ("no captions", no_captions), ("pending", left)):
        if ids:
            print(f"{label} ({len(ids)}):", " ".join(ids))
    print(f"{len(listed)} videos, {from_captions} from captions, {len(transcribed)} transcribed, "
          f"{len(no_speech)} no speech, {len(no_captions)} without, {len(left)} pending -> {txt}")
    sys.exit(1 if left or not listed else 0)


if __name__ == "__main__":
    main()
