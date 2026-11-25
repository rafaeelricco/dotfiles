#!/usr/bin/env bash
# Download captions and metadata for one YouTube video or every upload of a channel
# (Videos, Shorts and Streams tabs), then write one Markdown file per video.
# Usage: fetch_captions.sh COOKIES URL OUT
#   LANGS  caption tracks in preference order (default en-orig,en)
#   LIMIT  newest N per tab, for a pilot (default: all)
#   YTDLP  yt-dlp command (default: uvx yt-dlp)
#   ASR    videos to transcribe from audio: off, gate or all (default gate)
#   VISUAL on saves up to 20 frames per video from a 720p download (default off)
#   TRANSCRIBE  transcriber command (default: uv run --script <dir>/transcribe.py)
# The list is saved once in OUT/list.txt (delete it to list again). Rerunning the same
# command fetches, transcribes and extracts only what is still pending. Exits 0 only when
# nothing is pending.
set -euo pipefail
usage="usage: fetch_captions.sh COOKIES URL OUT"
cookies="${1:?$usage}"; url="${2:?$usage}"; out="${3:?$usage}"
langs="${LANGS:-en-orig,en}"
asr="${ASR:-gate}"
visual="${VISUAL:-off}"
read -ra ytdlp <<< "${YTDLP:-uvx yt-dlp}"
here="$(cd "$(dirname "$0")" && pwd)"
if [ -n "${TRANSCRIBE:-}" ]; then read -ra transcribe <<< "$TRANSCRIBE"
else transcribe=(uv run --script "$here/transcribe.py"); fi  # an array keeps spaces in $here
export PATH="$PATH:/usr/local/bin"  # deno
yt() { "${ytdlp[@]}" --remote-components ejs:github --cookies "$cookies" "$@"; }
mkdir -p "$out/subs"

if [ ! -s "$out/list.txt" ]; then
  : > "$out/list.tmp"
  case "$url" in
    *watch\?v=*|*youtu.be/*|*/shorts/[A-Za-z0-9_-]*)
      yt --skip-download --print "videos|%(id)s|%(title)s|%(duration)s" "$url" >> "$out/list.tmp" ;;
    *)
      channel="${url%%\?*}"; channel="${channel%/}"
      for tab in videos shorts streams featured; do channel="${channel%/"$tab"}"; done
      for tab in videos shorts streams; do
        if ! yt --flat-playlist ${LIMIT:+--playlist-end "$LIMIT"} \
            --print "$tab|%(id)s|%(title)s|%(duration)s" "$channel/$tab" \
            >> "$out/list.tmp" 2> "$out/list.err"; then
          # A channel without this tab is not an error; any other listing failure is.
          grep -q "does not have a $tab tab" "$out/list.err" || {
            cat "$out/list.err" >&2; echo "listing $channel/$tab failed; nothing saved" >&2; exit 1; }
        fi
      done ;;
  esac
  [ -s "$out/list.tmp" ] || { echo "listed no videos for $url" >&2; exit 1; }
  mv "$out/list.tmp" "$out/list.txt"
fi

python3 "$here/parse_captions.py" "$out" "$langs" --pending > "$out/pending.txt"
echo "listed $(wc -l < "$out/list.txt"), pending $(wc -l < "$out/pending.txt")"
if [ -s "$out/pending.txt" ]; then
  # Per-video failures stay pending and are reported below, so yt-dlp's status is not used.
  yt --skip-download --write-auto-subs --write-subs --sub-langs "$langs" --sub-format json3 \
    --write-info-json --sleep-subtitles 1 --ignore-errors \
    -o "$out/subs/%(id)s.%(ext)s" -a "$out/pending.txt" || true
fi

# Video and audio are downloaded right after the captions, while the cookies still work;
# frames and Whisper then run offline. A failure stays pending in the report below.
urls() { sed 's|^|https://www.youtube.com/watch?v=|'; }
python3 "$here/parse_captions.py" "$out" "$langs" --asr "$asr" --asr-todo > "$out/asr.txt"
echo "asr $(wc -l < "$out/asr.txt")"
if [ "$visual" = on ]; then
  python3 "$here/parse_captions.py" "$out" "$langs" --visual-todo > "$out/visual.txt"
  echo "visual $(wc -l < "$out/visual.txt")"
  if [ -s "$out/visual.txt" ]; then
    mkdir -p "$out/video"
    urls < "$out/visual.txt" > "$out/visual-urls.txt"
    yt -S 'res:720' -f 'bv*+ba/b' --merge-output-format mp4 --ignore-errors \
      -o "$out/video/%(id)s.%(ext)s" -a "$out/visual-urls.txt" || true
    python3 "$here/extract_frames.py" "$out" "$out/asr.txt" < "$out/visual.txt" || true
  fi
fi
if [ -s "$out/asr.txt" ]; then
  mkdir -p "$out/audio"
  # Audio already cut from a video by the visual pass is not downloaded again.
  python3 "$here/transcribe.py" "$out" --missing < "$out/asr.txt" | urls > "$out/asr-urls.txt"
  if [ -s "$out/asr-urls.txt" ]; then
    yt -f 'bestaudio[ext=m4a]/bestaudio' --ignore-errors \
      -o "$out/audio/%(id)s.%(ext)s" -a "$out/asr-urls.txt" || true
  fi
  "${transcribe[@]}" "$out" < "$out/asr.txt" || true
fi
python3 "$here/parse_captions.py" "$out" "$langs" --asr "$asr" --visual "$visual"
