---
name: youtube-content
description: >
  Summarize, transcribe, or reformat a YouTube video. When the user supplies
  a list of videos, collect their timestamped transcripts into a persistent
  local corpus and report coverage for each video.
license: MIT (adapted from Hermes Agent, Copyright (c) 2025 Nous Research)
---

# YouTube Content Tool

## When to use

Use when the user shares a YouTube URL or video link, asks to summarize a video, requests a transcript, or wants to extract and reformat content from any YouTube video. Transforms transcripts into structured content (chapters, summaries, threads, blog posts).

Extract transcripts from YouTube videos and convert them into useful formats.

## Setup

The helper declares its dependency inline (PEP 723), so `uv run` builds an
isolated environment on first use. Needs [uv](https://docs.astral.sh/uv/).
Without uv, install the dependencies listed at the top of the selected script into a Python 3.10+ virtualenv and replace
`uv run` with that environment's `python3` below.

## Helper Script

`<skill-dir>` is the directory containing this SKILL.md file. The script accepts any standard YouTube URL format, short links (youtu.be), shorts, embeds, live links, or a raw 11-character video ID.

```bash
# JSON output with metadata
uv run <skill-dir>/scripts/fetch_transcript.py "https://youtube.com/watch?v=VIDEO_ID"

# Plain text (good for piping into further processing)
uv run <skill-dir>/scripts/fetch_transcript.py "URL" --text-only

# With timestamps
uv run <skill-dir>/scripts/fetch_transcript.py "URL" --timestamps

# Specific language with fallback chain
uv run <skill-dir>/scripts/fetch_transcript.py "URL" --language tr,en
```

## Output Formats

After fetching the transcript, format it based on what the user asks for:

- **Chapters**: Group by topic shifts, output timestamped chapter list
- **Summary**: Concise 5-10 sentence overview of the entire video
- **Chapter summaries**: Chapters with a short paragraph summary for each
- **Thread**: Twitter/X thread format — numbered posts, each under 280 chars
- **Blog post**: Full article with title, sections, and key takeaways
- **Quotes**: Notable quotes with timestamps

### Example — Chapters Output

```
00:00 Introduction — host opens with the problem statement
03:45 Background — prior work and why existing solutions fall short
12:20 Core method — walkthrough of the proposed approach
24:10 Results — benchmark comparisons and key takeaways
31:55 Q&A — audience questions on scalability and next steps
```

## Collect a supplied list of videos

Run the batch helper once with all supplied video URLs or IDs, including
duplicates. Use the user's output directory when given. Otherwise let the
helper choose the corpus and report its absolute path.

```bash
uv run <skill-dir>/scripts/collect_transcripts.py -- URL1 URL2 URL3
uv run <skill-dir>/scripts/collect_transcripts.py --output CORPUS -- URL1 URL2
uv run <skill-dir>/scripts/collect_transcripts.py --output CORPUS
uv run <skill-dir>/scripts/collect_transcripts.py --output CORPUS --retry
```

Use the third form to resume pending work. Use the fourth when the user asks
to try failed collection again. A provider block pauses the corpus until that
explicit retry. Report saved/unique videos, each unresolved ID and reason,
and any invalid inputs. Link the corpus. If a transformation was requested,
use the saved transcripts and identify its coverage.

## Single-video workflow

1. **Fetch** the transcript with `uv run` and `--text-only --timestamps`.
2. **Validate**: confirm the output is non-empty and in the expected language. If empty, retry without `--language` to get any available transcript. If still empty, tell the user the video likely has transcripts disabled.
3. **Chunk if needed**: if the transcript exceeds ~50K characters, split into overlapping chunks (~40K with 2K overlap) and summarize each chunk before merging.
4. **Transform** into the requested output format. If the user did not specify a format, default to a summary.
5. **Verify**: re-read the transformed output to check for coherence, correct timestamps, and completeness before presenting.

## Error Handling

- **Transcript disabled**: tell the user; suggest they check if subtitles are available on the video page.
- **Private/unavailable video**: relay the error and ask the user to verify the URL.
- **No matching language**: retry without `--language` to fetch any available transcript, then note the actual language to the user.
- **Dependency missing**: run the helper through `uv run`, or use the virtualenv fallback in Setup.
