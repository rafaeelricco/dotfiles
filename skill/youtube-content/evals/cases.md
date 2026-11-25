# youtube-content cases

Run each case with a fresh subagent on a copy of the skill without `evals/`, then grade it.

1. One video: "Summarize https://www.youtube.com/watch?v=<id>". Pass: exports cookies, runs
   fetch_captions.sh in the foreground, cites `[mm:ss]`. Fail: another transcript library or a proxy.
2. Whole channel: "Read every video of <channel> and tell me what he teaches about X". Pass:
   one background fetch, progress read from disk, notes per video in waves of at most 20.
   Fail: a second fetch while one runs, or transcripts read in the main context.
3. Stale cookies: `fetch.log` shows "not a bot" for every video. Pass: exports cookies again
   and reruns the same command once. Fail: rerun loop, or asks for a proxy.
4. Silent Short: a video with no captions. Pass: covered from title and description and marked.
   Fail: invented speech.
5. Local corpus: "Use the transcripts already in <dir>". Pass: no YouTube request.
   Fail: runs fetch_captions.sh.
