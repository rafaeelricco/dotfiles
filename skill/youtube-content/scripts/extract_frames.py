"""Save up to 20 frames per video from OUT/video/<id>.mp4 for the readers to look at.

Usage: extract_frames.py OUT ASR_LIST < IDS
For each ID: find scene changes, add a frame every tenth of the video, keep frames at least
2 s apart, thin them to 20, and save OUT/frames/<id>/<mm-ss>.jpg plus index.json. IDs in
ASR_LIST also get their audio cut to OUT/audio/<id>.flac, so Whisper needs no second
download. The video is deleted before index.json is written. FFMPEG overrides the ffmpeg command.
"""
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from transcribe import audio_file  # noqa: E402  one rule for which audio file is finished

MAX_FRAMES, MIN_GAP_S, SCENE = 20, 2.0, 0.3
VIDEO_ID = re.compile(r"[A-Za-z0-9_-]{11}")


def pick(scenes: list[float], duration: float) -> list[float]:
    """The first frame, scene changes and a tenth-of-length grid, >= 2 s apart, at most 20."""
    grid = [duration * (2 * i + 1) / 20 for i in range(10)] if duration else []
    kept: list[float] = []
    for t in sorted({0.0, *scenes, *grid}):
        if not kept or t - kept[-1] >= MIN_GAP_S:
            kept.append(t)
    if len(kept) > MAX_FRAMES:  # thin evenly, keeping the first and the last
        kept = [kept[round(i * (len(kept) - 1) / (MAX_FRAMES - 1))] for i in range(MAX_FRAMES)]
    return kept


def scene_times(ffmpeg: list[str], video: Path) -> list[float]:
    run = subprocess.run(ffmpeg + ["-i", str(video), "-an", "-vf",
                                   f"scale=320:-2,select='gt(scene,{SCENE})',showinfo", "-f", "null", "-"],
                         capture_output=True, text=True, check=True)
    return [float(t) for t in re.findall(r"pts_time:([\d.]+)", run.stderr)]


def cut_audio(ffmpeg: list[str], video: Path, out: Path, vid: str) -> None:
    """Save the video's audio as OUT/audio/<id>.flac. On failure, Whisper's own download takes over."""
    audio = out / "audio"
    audio.mkdir(exist_ok=True)
    tmp = audio / f".{vid}.flac"  # hidden until complete, so Whisper never reads half a file
    try:
        subprocess.run(ffmpeg + ["-loglevel", "error", "-y", "-i", str(video), "-vn",
                                 "-ac", "1", "-ar", "16000", "-c:a", "flac", str(tmp)], check=True)
        tmp.replace(audio / f"{vid}.flac")
    except subprocess.CalledProcessError as exc:
        print(f"frames {vid}: no audio cut ({exc})", file=sys.stderr)
    finally:
        tmp.unlink(missing_ok=True)


def main() -> None:
    out, asr_ids = Path(sys.argv[1]), set(Path(sys.argv[2]).read_text().split())
    ffmpeg = shlex.split(os.environ.get("FFMPEG", "ffmpeg")) + ["-nostdin", "-hide_banner"]
    os.nice(10)
    for vid in sys.stdin.read().split():
        if not VIDEO_ID.fullmatch(vid):
            continue
        video = out / "video" / f"{vid}.mp4"  # --merge-output-format mp4; yt-dlp leftovers never match
        if not video.is_file():
            print(f"frames {vid}: no video file", file=sys.stderr)
            continue
        try:
            meta = json.loads((out / "subs" / f"{vid}.info.json").read_text(encoding="utf-8"))
            folder = out / "frames" / vid
            folder.mkdir(parents=True, exist_ok=True)
            frames = []
            for t in pick(scene_times(ffmpeg, video), meta.get("duration") or 0):
                name = f"{int(t) // 60:02d}-{int(t) % 60:02d}.jpg"
                shot = folder / name
                shot.unlink(missing_ok=True)
                subprocess.run(ffmpeg + ["-loglevel", "error", "-y", "-ss", str(t), "-i", str(video),
                                         "-frames:v", "1", "-q:v", "3", str(shot)], check=True)
                if shot.is_file() and shot.stat().st_size:  # past the real end, ffmpeg writes nothing
                    frames.append({"t": t, "file": name})
            if vid in asr_ids and audio_file(out, vid) is None:
                cut_audio(ffmpeg, video, out, vid)
            video.unlink()  # before index.json: a kill in between costs a download, never a stray video
            index = folder / "index.json.tmp"
            index.write_text(json.dumps({"frames": frames}), encoding="utf-8")
            index.replace(folder / "index.json")
            print(f"frames {vid}: {len(frames)}", flush=True)
        except (OSError, ValueError, subprocess.CalledProcessError) as exc:
            print(f"frames {vid}: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
