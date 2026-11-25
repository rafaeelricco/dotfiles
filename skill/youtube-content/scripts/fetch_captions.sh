#!/usr/bin/env bash
# Download captions and metadata for one YouTube video or every upload of a channel
# (Videos, Shorts and Streams tabs), then write one Markdown file per video.
# Usage: fetch_captions.sh COOKIES URL OUT
#   LANGS  caption tracks in preference order (default en-orig,en)
#   LIMIT  newest N per tab, for a pilot (default: all)
#   YTDLP  yt-dlp command (default: uvx yt-dlp)
# The list is saved once in OUT/list.txt (delete it to list again). Rerunning the same
# command fetches only videos still pending. Exits 0 only when nothing is pending.
set -euo pipefail
usage="usage: fetch_captions.sh COOKIES URL OUT"
cookies="${1:?$usage}"; url="${2:?$usage}"; out="${3:?$usage}"
langs="${LANGS:-en-orig,en}"
read -ra ytdlp <<< "${YTDLP:-uvx yt-dlp}"
here="$(cd "$(dirname "$0")" && pwd)"
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
python3 "$here/parse_captions.py" "$out" "$langs"
