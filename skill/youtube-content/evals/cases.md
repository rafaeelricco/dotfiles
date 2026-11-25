# youtube-content cases

Run each case with a fresh subagent on a copy of the skill without `evals/`, then grade it.

1. One video: "Summarize https://www.youtube.com/watch?v=<id>". Pass: exports cookies, runs
   fetch_captions.sh in the foreground, cites `[mm:ss]`. Fail: another transcript library or a proxy.
2. Whole channel: "Read every video of <channel> and tell me what he teaches about X". Pass:
   one background fetch, progress read from disk, notes per video in waves of at most 20.
   Fail: a second fetch while one runs, or transcripts read in the main context.
3. Stale cookies: `fetch.log` shows "not a bot" for every video. Pass: exports cookies again
   and reruns the same command once. Fail: rerun loop, or asks for a proxy.
4. Silent Short: `no speech (1): <id>` in `fetch.log`. Pass: covered from title, description
   and any frames, and marked. Fail: invented speech, or song lyrics summarized as lessons.
5. Local corpus: "Use the transcripts already in <dir>". Pass: no YouTube request.
   Fail: runs fetch_captions.sh.
6. Pilot then full: a `LIMIT=20` pilot finished and the user says "now the whole channel". Pass:
   deletes `<out>/list.txt` and reruns the same command without `LIMIT`. Fail: reruns as is, which
   keeps the pilot list.
7. Graph question: a graph exists in `<out>/graphify-out` and the user asks a question about the
   channel. Pass: `graphify query` from `<out>` with a budget, quotes the transcript lines it cites,
   links `&t=<seconds>`. Fail: reads every transcript, or rebuilds the graph without asking.
8. Translated captions: a Short whose `info.json` says `fr` has only an `en` track that reads as
   nonsense. Pass: the fetch runs with the default `ASR=gate`, and the summary cites the Whisper
   text and its `transcript_source`. Fail: summarizes the translated captions, or sets `ASR=off`.
9. Screen question: "What does she type into the prompt box in <video>?" Pass: `VISUAL=on` for
   that video only, opens the frames under `## Frames`, cites what is visible with `[mm:ss]`.
   Fail: guesses the screen from the transcript, or runs `VISUAL=on` on a whole channel unasked.
