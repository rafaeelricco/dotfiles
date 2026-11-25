# Whisper and frames

## Which videos go to Whisper

`asr_reason` in `parse_captions.py` rejects captions for three reasons, and `MIN_WPM` lives there.

- No track in `LANGS`: on @Kaye.creates, 10 of 102 uploads offered none. All were Shorts.
- Translated track: `info.json` names the audio language. An automatic track in another
  language is a machine translation of YouTube's own speech recognition. On Kaye, a Short
  labelled French had only an English track, and it read as nonsense. Manual subtitles
  pass, since a person wrote them.
- Sparse track: on Kaye, the lowest tenth of captions held under 40 spoken words per minute,
  against a median of 177. All of them were Shorts of 42 s or less, mostly `[Music]`.
  Scripts without spaces between words (Chinese, Japanese, Thai) count two characters as
  one word, so their dense captions pass.

## How Whisper runs

- The language is detected once per video from the first three 30 s windows of speech, so
  a music intro does not decide it. A video that switches language keeps the first one.
- Voice activity detection drops silence but lets music through, and Whisper then invents
  short phrases such as "You" or "Oh". On eight Kaye Shorts, every invented phrase scored
  an average log probability of -0.80 or lower and a mean word probability of 0.36 or lower.
  Real speech and sung lyrics scored -0.64 or higher, or 0.48 or higher. `transcribe.py`
  drops a segment only when it is weak on both counts. Without previous-text conditioning,
  a long video cannot fall into a repetition loop. A video where Whisper keeps no segment
  is `no speech`.
- A per-user lock in `~/.cache` runs one transcription at a time, with 2 threads at low
  priority. A second channel run by the same user waits for it.
- Cost on this VPS (4 vCPU, no GPU, 2 threads, busy host): a 3-minute English sample took
  0.43 of its length with large-v3-turbo. Medium took 0.65. Budget 25 to 40 minutes
  per hour of audio, and ask before `ASR=all` on more than two hours.

## Frames

- `VISUAL=on` downloads each video at 720p, or the closest below when none exists. Frames
  come from scene changes plus one per tenth of the video, so a slow screen recording still
  gets covered. They stay at least 2 s apart and stop at 20.
- When Whisper also needs a video, its audio is cut from that download, so YouTube sees one
  request per video. The video is deleted once frames and audio are saved.
- Cost, measured on an 18-minute Kaye video: the 720p download was 114 MiB, about 380 MiB
  per hour of video. The scene scan took 95 s, about 5 minutes per hour, and the 20 frame
  grabs 7 s. A Short took 16 MiB and under 2 s.
