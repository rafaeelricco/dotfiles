# /// script
# requires-python = ">=3.10"
# dependencies = ["faster-whisper==1.2.1", "av==16.1.0"]
# ///
"""Transcribe OUT/audio/<id>.<ext> for each video ID on stdin into OUT/asr/<id>.json.

Usage: transcribe.py OUT [--missing] < IDS
--missing only prints the IDs that have no finished audio file yet.
ASR_MODEL picks the Whisper model (default large-v3-turbo); ASR_THREADS the CPU threads
(default 2). The language is detected once per video. Audio is cut into 10-minute chunks
with 2 s of overlap, and each chunk is a checkpoint, so a rerun resumes where it stopped.
"""
import fcntl
import json
import math
import os
import re
import shutil
import sys
from pathlib import Path

MODEL = os.environ.get("ASR_MODEL", "large-v3-turbo")
THREADS = int(os.environ.get("ASR_THREADS", "2"))
RATE, CHUNK_S, OVERLAP_S = 16000, 600, 2
# Over music Whisper invents short phrases ("You", "Oh"); those score weak on both counts.
# See references/media.md for the measured split.
MIN_LOGPROB, MIN_WORD_PROB = -0.7, 0.5
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")
# Finished audio only: yt-dlp's .part, .ytdl, -FragN and .temp leftovers never match.
AUDIO_EXTS = (".flac", ".m4a", ".webm", ".opus", ".mp3", ".ogg")
LOCK = Path(os.environ.get("XDG_CACHE_HOME", Path.home() / ".cache")) / "youtube-content-asr.lock"


def audio_file(out: Path, vid: str) -> Path | None:
    """The finished audio file for a video, OUT/audio/<id>.<ext>, or None."""
    return next((p for ext in AUDIO_EXTS if (p := out / "audio" / f"{vid}{ext}").is_file()), None)


def atomic_json(path: Path, value) -> None:
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_text(json.dumps(value, ensure_ascii=False), encoding="utf-8")
    tmp.replace(path)


def chunks(duration: float) -> list[tuple[float, float, float, float]]:
    """(start, end, padded_start, padded_end) of each chunk, in seconds."""
    return [(i * CHUNK_S, min(duration, (i + 1) * CHUNK_S),
             max(0, i * CHUNK_S - OVERLAP_S), min(duration, (i + 1) * CHUNK_S + OVERLAP_S))
            for i in range(max(1, math.ceil(duration / CHUNK_S)))]


def keep(words, start: float, end: float, offset: float) -> dict | None:
    """The segment made of the words whose midpoint falls in [start, end), or None."""
    kept = [w for w in words if start <= offset + (w.start + w.end) / 2 < end]
    if not kept:
        return None
    return {"start": round(offset + kept[0].start, 3), "end": round(offset + kept[-1].end, 3),
            "text": "".join(w.word for w in kept).strip()}


def invented(segment) -> bool:
    """True when both the segment's log probability and its mean word probability are weak."""
    words = segment.words or []
    mean = sum(w.probability for w in words) / len(words) if words else 0.0
    return segment.avg_logprob < MIN_LOGPROB and mean < MIN_WORD_PROB


def transcribe(model, audio_path: Path, work: Path) -> dict:
    from faster_whisper import decode_audio
    audio = decode_audio(str(audio_path))  # 16 kHz mono float32
    duration = len(audio) / RATE
    try:
        ident = json.loads((work / "identity.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        ident = {}
    if ident.get("model") != MODEL or ident.get("duration") != duration:
        shutil.rmtree(work, ignore_errors=True)  # checkpoints from other settings never mix
        work.mkdir(parents=True)
        lang, prob, _ = model.detect_language(audio, vad_filter=True, language_detection_segments=3)
        ident = {"model": MODEL, "language": lang, "language_probability": round(prob, 2),
                 "duration": duration}
        atomic_json(work / "identity.json", ident)
    plan, segments = chunks(duration), []
    for i, (start, end, a, b) in enumerate(plan):
        ckpt = work / f"chunk-{i:05}.json"
        try:
            kept = json.loads(ckpt.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            generated, _ = model.transcribe(
                audio[int(a * RATE):int(b * RATE)], language=ident["language"], beam_size=5,
                vad_filter=True, word_timestamps=True, condition_on_previous_text=False)
            kept = [seg for s in generated
                    if not invented(s) and (seg := keep(s.words or [], start, end, a))]
            atomic_json(ckpt, kept)
        segments += kept
        print(f"asr {audio_path.stem}: chunk {i + 1}/{len(plan)}", flush=True)
    return dict(ident, segments=segments)


def main() -> None:
    out = Path(sys.argv[1])
    ids = [v for v in sys.stdin.read().split() if VIDEO_ID.fullmatch(v)]
    if "--missing" in sys.argv[2:]:
        for vid in ids:
            if audio_file(out, vid) is None:
                print(vid)
        return
    results = out / "asr"
    results.mkdir(exist_ok=True)
    LOCK.parent.mkdir(parents=True, exist_ok=True)
    with LOCK.open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)  # one transcription per user; another channel waits
        os.nice(10)
        from faster_whisper import WhisperModel
        model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=THREADS)
        for vid in ids:
            audio = audio_file(out, vid)
            if audio is None:
                print(f"asr {vid}: no audio file", file=sys.stderr)
                continue
            try:
                result = transcribe(model, audio, results / vid)
            except Exception as exc:  # one bad file must not stop the queue
                print(f"asr {vid}: {exc}", file=sys.stderr)
                continue
            atomic_json(results / f"{vid}.json", result)
            shutil.rmtree(results / vid)
            audio.unlink()


if __name__ == "__main__":
    main()
