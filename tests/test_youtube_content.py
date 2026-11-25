"""Exercise the youtube-content caption scripts against a fake yt-dlp, with no network."""
from pathlib import Path
from types import SimpleNamespace
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPTS = ROOT / "skill/youtube-content/scripts"

# Stands in for yt-dlp. Listing prints `tab|id|title|duration` rows; a download writes
# `<id>.en-orig.json3` and `<id>.info.json` for every URL in the -a file, like the real tool.
FAKE_YTDLP = textwrap.dedent("""
    import json, os, sys
    args = sys.argv[1:]
    calls = open(os.environ["FAKE_CALLS"], "a")
    tabs = json.loads(os.environ.get("FAKE_TABS", "{}"))
    if "--flat-playlist" in args:
        url = args[-1]
        tab = url.rsplit("/", 1)[1]
        calls.write("list " + url + "\\n")
        if tab == os.environ.get("FAKE_FAIL_TAB"):
            sys.exit("ERROR: HTTP Error 429: Too Many Requests")
        if tab not in tabs:
            sys.exit(f"ERROR: [youtube:tab] @x: This channel does not have a {tab} tab")
        for vid, title in tabs[tab]:
            print(f"{tab}|{vid}|{title}|60")
        sys.exit(0)
    if "--print" in args:
        calls.write("video " + args[-1] + "\\n")
        print("videos|" + args[-1].rsplit("/", 1)[-1].split("v=")[-1] + "|One video|60")
        sys.exit(0)
    if "-S" in args or "-f" in args:  # 720p video for frames, or audio for Whisper
        kind, ext = ("video", "mp4") if "-S" in args else ("audio", "m4a")
        out = args[args.index("-o") + 1].split("/%(id)s")[0]
        for url in open(args[args.index("-a") + 1]).read().split():
            vid = url.split("v=")[1]
            calls.write(kind + " " + vid + "\\n")
            if vid not in os.environ.get("FAKE_NO_VIDEO", "").split(","):
                open(f"{out}/{vid}.{ext}", "w").write(kind)
        sys.exit(0)
    out = args[args.index("-o") + 1].split("/%(id)s")[0]
    failing = os.environ.get("FAKE_FAIL_CAPTIONS", "").split(",")
    silent = os.environ.get("FAKE_NO_CAPTIONS", "").split(",")
    for url in open(args[args.index("-a") + 1]).read().split():
        vid = url.split("v=")[1]
        calls.write("fetch " + vid + "\\n")
        if vid in silent:
            pass
        elif vid in failing:
            print("WARNING: Unable to download video subtitles for 'en-orig': HTTP 429", file=sys.stderr)
        else:
            events = [{"tStartMs": 0, "segs": [{"utf8": "first"}]},
                      {"tStartMs": 4000, "segs": [{"utf8": "same block"}]},
                      {"tStartMs": 12400, "segs": [{"utf8": "second block"}]}]
            json.dump({"events": events}, open(f"{out}/{vid}.en-orig.json3", "w"))
        offered = {} if vid in silent else {"en-orig": [{}]}
        json.dump({"id": vid, "upload_date": "20260101", "description": "desc",
                   "automatic_captions": offered}, open(f"{out}/{vid}.info.json", "w"))
    sys.exit(1 if failing != [""] else 0)
""")

# Stands in for transcribe.py: writes OUT/asr/<id>.json for each ID on stdin.
FAKE_ASR = textwrap.dedent("""
    import json, os, sys
    out = sys.argv[1]
    os.makedirs(out + "/asr", exist_ok=True)
    calls = open(os.environ["FAKE_CALLS"], "a")
    for vid in sys.stdin.read().split():
        calls.write("asr " + vid + "\\n")
        if vid in os.environ.get("FAKE_ASR_FAIL", "").split(","):
            continue
        speech = vid not in os.environ.get("FAKE_ASR_SILENT", "").split(",")
        segments = [{"start": 1.5, "end": 3.0, "text": "spoken words"}] if speech else []
        json.dump({"model": "fake", "language": "pt", "language_probability": 0.97,
                   "segments": segments}, open(f"{out}/asr/{vid}.json", "w"))
""")

# Stands in for ffmpeg: reports three scene changes, writes any output file it is given.
# Like the real one, it exits 0 without a file when -ss is past FAKE_FFMPEG_END.
FAKE_FFMPEG = textwrap.dedent("""
    import os, sys
    args = sys.argv[1:]
    if "null" in args:
        for t in (3.5, 4.0, 9.0):
            print(f"[Parsed_showinfo_2 @ 0x1] n:0 pts:1 pts_time:{t} duration:1", file=sys.stderr)
    elif "-vn" in args and os.environ.get("FAKE_FFMPEG_NO_AUDIO"):
        open(args[-1], "w").write("half")
        sys.exit("Output file does not contain any stream")
    elif "-ss" in args and float(args[args.index("-ss") + 1]) > float(os.environ.get("FAKE_FFMPEG_END", "1e9")):
        pass
    else:
        open(args[-1], "w").write("x")
""")


def load(name):
    spec = importlib.util.spec_from_file_location(name, SCRIPTS / f"{name}.py")
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

A, B, C = "aaaaaaaaaa1", "bbbbbbbbbb2", "cccccccccc3"


class CaptionScripts(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.out = self.dir / "kb"
        (self.dir / "fake.py").write_text(FAKE_YTDLP)
        (self.dir / "fake_asr.py").write_text(FAKE_ASR)
        (self.dir / "fake_ffmpeg.py").write_text(FAKE_FFMPEG)
        self.calls = self.dir / "calls.log"
        self.calls.touch()

    def tearDown(self):
        subprocess.run(["rm", "-rf", str(self.dir)], check=True)

    def fetch(self, url="https://www.youtube.com/@x", tabs=None, **env):
        self.calls.write_text("")
        environ = {k: v for k, v in os.environ.items() if k not in ("LIMIT", "LANGS", "ASR", "VISUAL")}
        environ.update(YTDLP=f"{sys.executable} {self.dir / 'fake.py'}",
                       TRANSCRIBE=f"{sys.executable} {self.dir / 'fake_asr.py'}",
                       FFMPEG=f"{sys.executable} {self.dir / 'fake_ffmpeg.py'}",
                       FAKE_CALLS=str(self.calls), FAKE_TABS=json.dumps(tabs or {}), **env)
        return subprocess.run(["bash", str(SCRIPTS / "fetch_captions.sh"), "cookies.txt", url, str(self.out)],
                              env=environ, capture_output=True, text=True)

    def logged(self, kind):
        return [line.split(" ", 1)[1] for line in self.calls.read_text().splitlines() if line.startswith(kind + " ")]

    def transcript(self, vid):
        return (self.out / "txt" / f"{vid}.md").read_text()

    def test_listing_failure_exits_and_saves_no_list(self):
        run = self.fetch(tabs={"videos": [[A, "a"]], "shorts": [[B, "b"]]}, FAKE_FAIL_TAB="shorts")
        self.assertEqual(run.returncode, 1)
        self.assertIn("listing https://www.youtube.com/@x/shorts failed", run.stderr)
        self.assertFalse((self.out / "list.txt").exists())
        self.assertEqual(self.logged("fetch"), [])

    def test_missing_tab_is_fine_and_a_video_in_two_tabs_counts_once(self):
        run = self.fetch(tabs={"videos": [[A, "a | with bar"], [B, "b"]], "shorts": [[B, "b"]]})
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("2 videos, 2 from captions, 0 transcribed, 0 no speech, 0 without, 0 pending", run.stdout)
        self.assertEqual(sorted(self.logged("fetch")), [A, B])
        self.assertTrue(self.transcript(A).startswith("# a | with bar\nid: " + A))

    def test_captions_are_grouped_into_ten_second_lines(self):
        self.fetch(tabs={"videos": [[A, "a"]]})
        self.assertIn("## Transcript\n[00:00] first same block\n[00:12] second block\n", self.transcript(A))

    def test_failed_caption_stays_pending_and_rerun_fetches_only_it(self):
        tabs = {"videos": [[A, "a"], [B, "b"]]}
        first = self.fetch(tabs=tabs, FAKE_FAIL_CAPTIONS=B)
        self.assertEqual(first.returncode, 1)
        self.assertIn("pending (1): " + B, first.stdout)
        self.assertIn("(not fetched yet)", self.transcript(B))
        second = self.fetch(tabs=tabs)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(self.logged("fetch"), [B])
        self.assertEqual(self.logged("list"), [])

    def test_rerun_with_nothing_pending_calls_no_yt_dlp(self):
        tabs = {"videos": [[A, "a"]]}
        self.fetch(tabs=tabs)
        run = self.fetch(tabs=tabs)
        self.assertEqual(run.returncode, 0)
        self.assertIn("listed 1, pending 0", run.stdout)
        self.assertEqual(self.calls.read_text(), "")

    def test_truncated_metadata_is_fetched_again(self):
        tabs = {"videos": [[A, "a"], [B, "b"]]}
        self.fetch(tabs=tabs)
        (self.out / "subs" / f"{A}.info.json").write_text('{"id": "aaa')
        run = self.fetch(tabs=tabs)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.logged("fetch"), [A])

    def test_video_without_offered_track_is_reported_without_captions(self):
        tabs = {"videos": [[A, "a"]]}
        self.fetch(tabs=tabs)
        (self.out / "subs" / f"{A}.en-orig.json3").unlink()
        info = self.out / "subs" / f"{A}.info.json"
        info.write_text(json.dumps({"id": A, "automatic_captions": {}, "description": "only desc"}))
        run = subprocess.run([sys.executable, str(SCRIPTS / "parse_captions.py"), str(self.out), "en-orig,en"],
                             capture_output=True, text=True)
        self.assertEqual(run.returncode, 0)
        self.assertIn("no captions (1): " + A, run.stdout)
        self.assertIn("only desc\n\n## Transcript\n(no captions available)", self.transcript(A))

    def test_channel_url_with_tab_and_query_is_normalized(self):
        self.fetch(url="https://www.youtube.com/@x/videos?si=abc", tabs={"videos": [[A, "a"]]})
        self.assertEqual(self.logged("list"), ["https://www.youtube.com/@x/videos",
                                               "https://www.youtube.com/@x/shorts",
                                               "https://www.youtube.com/@x/streams"])

    def test_title_cannot_forge_a_record_that_writes_outside_txt(self):
        victim = self.dir / "victim"
        victim.mkdir()
        (victim / "SKILL.md").write_text("original\n")
        forged = "\u2028videos|../../victim/SKILL|PWNED"
        run = self.fetch(tabs={"videos": [[A, "a" + forged]]})
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual((victim / "SKILL.md").read_text(), "original\n")
        self.assertEqual(sorted(p.name for p in (self.out / "txt").iterdir()), [A + ".md"])
        self.assertIn("# a" + forged, self.transcript(A))

    def test_malformed_list_lines_are_skipped(self):
        self.out.mkdir()
        (self.out / "list.txt").write_text(f"videos|{A}|a|60\nvideos|/etc/passwd|x|1\nbogus|{B}|b|1\n")
        run = self.fetch()
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.logged("fetch"), [A])
        self.assertIn("skipping malformed list line", run.stderr)

    def test_video_and_short_urls_skip_channel_listing(self):
        for url in (f"https://www.youtube.com/watch?v={A}", f"https://www.youtube.com/shorts/{A}"):
            with self.subTest(url=url):
                subprocess.run(["rm", "-rf", str(self.out)], check=True)
                run = self.fetch(url=url)
                self.assertEqual(run.returncode, 0, run.stderr)
                self.assertEqual(self.logged("list"), [])
                self.assertEqual(self.logged("fetch"), [A])

    def gate(self, info, track=None, events=(), langs="en-orig,en"):
        """List one video with this metadata and caption track; return the --asr-todo IDs."""
        (self.out / "subs").mkdir(parents=True)
        (self.out / "list.txt").write_text(f"videos|{A}|a|60\n")
        (self.out / "subs" / f"{A}.info.json").write_text(json.dumps(info))
        if track:
            (self.out / "subs" / f"{A}.{track}.json3").write_text(json.dumps(
                {"events": [{"tStartMs": t * 1000, "segs": [{"utf8": s}]} for t, s in events]}))
        return subprocess.run([sys.executable, str(SCRIPTS / "parse_captions.py"), str(self.out),
                               langs, "--asr", "gate", "--asr-todo"],
                              capture_output=True, text=True).stdout.split()

    SPEECH = [(t, "five words of real speech") for t in range(0, 60, 5)]  # 60 words per minute

    def test_gate_sends_missing_translated_and_sparse_captions_to_asr(self):
        cases = {
            "missing": ({"duration": 60}, None, ()),
            "translated": ({"duration": 60, "language": "fr",
                            "automatic_captions": {"en": [{}], "fr-orig": [{}]}}, "en", self.SPEECH),
            "sparse": ({"duration": 60, "language": "en", "automatic_captions": {"en-orig": [{}]}},
                       "en-orig", [(0, "[Music]"), (30, "oh")]),
        }
        for name, args in cases.items():
            with self.subTest(name):
                subprocess.run(["rm", "-rf", str(self.out)], check=True)
                self.assertEqual(self.gate(*args), [A])

    def test_gate_keeps_dense_original_and_manual_captions(self):
        cases = {
            "original": ({"duration": 60, "language": "en", "automatic_captions": {"en-orig": [{}]}},
                         "en-orig", self.SPEECH),
            "manual translation": ({"duration": 60, "language": "fr", "subtitles": {"en": [{}]}},
                                   "en", self.SPEECH),
            "japanese": ({"duration": 60, "language": "ja", "automatic_captions": {"ja-orig": [{}]}},
                         "ja-orig", [(t, "今日は新しい動画の作り方を説明します") for t in range(0, 60, 5)],
                         "ja-orig"),
        }
        for name, args in cases.items():
            with self.subTest(name):
                subprocess.run(["rm", "-rf", str(self.out)], check=True)
                self.assertEqual(self.gate(*args), [])

    def test_uncaptioned_video_is_transcribed_from_its_audio(self):
        run = self.fetch(tabs={"videos": [[A, "a"], [B, "b"]]}, FAKE_NO_CAPTIONS=B)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("2 videos, 1 from captions, 1 transcribed, 0 no speech, 0 without, 0 pending", run.stdout)
        self.assertEqual(self.logged("audio"), [B])
        self.assertEqual(self.logged("video"), [])
        self.assertIn("transcript_source: asr fake (pt 0.97); captions: no captions\n", self.transcript(B))
        self.assertIn("## Transcript\n[00:01] spoken words\n", self.transcript(B))

    def test_audio_without_speech_is_reported_and_never_invented(self):
        run = self.fetch(tabs={"videos": [[B, "b"]]}, FAKE_NO_CAPTIONS=B, FAKE_ASR_SILENT=B)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("no speech (1): " + B, run.stdout)
        self.assertIn("## Transcript\n(no speech detected)\n", self.transcript(B))

    def test_failed_transcription_stays_pending_and_rerun_retries_only_it(self):
        tabs = {"videos": [[A, "a"], [B, "b"]]}
        first = self.fetch(tabs=tabs, FAKE_NO_CAPTIONS=B, FAKE_ASR_FAIL=B)
        self.assertEqual(first.returncode, 1)
        self.assertIn("pending (1): " + B, first.stdout)
        second = self.fetch(tabs=tabs, FAKE_NO_CAPTIONS=B)
        self.assertEqual(second.returncode, 0, second.stderr)
        self.assertEqual(self.logged("fetch"), [])
        self.assertEqual(self.logged("asr"), [B])

    def test_asr_off_keeps_the_caption_only_report(self):
        run = self.fetch(tabs={"videos": [[B, "b"]]}, FAKE_NO_CAPTIONS=B, ASR="off")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn("no captions (1): " + B, run.stdout)
        self.assertEqual(self.logged("audio"), [])

    def test_visual_pass_saves_frames_and_reuses_the_video_audio(self):
        run = self.fetch(tabs={"videos": [[A, "a"], [B, "b"]]}, VISUAL="on", FAKE_NO_CAPTIONS=B)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(sorted(self.logged("video")), [A, B])
        self.assertEqual(self.logged("audio"), [])
        self.assertEqual(self.logged("asr"), [B])
        self.assertIn(f"\n## Frames\n[00:00] frames/{A}/00-00.jpg\n[00:03] frames/{A}/00-03.jpg\n"
                      f"[00:09] frames/{A}/00-09.jpg\n", self.transcript(A))
        self.assertEqual(list((self.out / "video").iterdir()), [])
        self.assertTrue((self.out / "audio" / f"{B}.flac").exists())
        self.assertFalse((self.out / "audio" / f"{A}.flac").exists())

    def test_missing_frames_stay_pending_without_hiding_the_transcript(self):
        run = self.fetch(tabs={"videos": [[A, "a"]]}, VISUAL="on", FAKE_NO_VIDEO=A)
        self.assertEqual(run.returncode, 1)
        self.assertIn("pending (1): " + A, run.stdout)
        self.assertIn("## Transcript\n[00:00] first same block\n", self.transcript(A))

    def test_frames_past_the_real_end_are_not_listed(self):
        run = self.fetch(tabs={"videos": [[A, "a"]]}, VISUAL="on", FAKE_FFMPEG_END="5")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertIn(f"\n## Frames\n[00:00] frames/{A}/00-00.jpg\n[00:03] frames/{A}/00-03.jpg\n",
                      self.transcript(A))
        self.assertNotIn("00-09.jpg", self.transcript(A))

    def test_failed_audio_cut_keeps_frames_and_falls_back_to_a_download(self):
        run = self.fetch(tabs={"videos": [[B, "b"]]}, VISUAL="on", FAKE_NO_CAPTIONS=B, FAKE_FFMPEG_NO_AUDIO="1")
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.logged("audio"), [B])
        self.assertIn("## Frames\n", self.transcript(B))
        self.assertEqual([p.name for p in (self.out / "audio").iterdir()], [f"{B}.m4a"])

    def test_yt_dlp_leftovers_do_not_count_as_audio(self):
        (self.out / "audio").mkdir(parents=True)
        (self.out / "audio" / f"{B}.temp.m4a").write_text("partial")
        (self.out / "audio" / f"{B}.m4a.part").write_text("partial")
        run = self.fetch(tabs={"videos": [[B, "b"]]}, FAKE_NO_CAPTIONS=B)
        self.assertEqual(run.returncode, 0, run.stderr)
        self.assertEqual(self.logged("audio"), [B])


class AsrUnits(unittest.TestCase):
    """Pure helpers of transcribe.py; faster-whisper is imported only inside main()."""
    def setUp(self):
        self.t = load("transcribe")

    def test_chunks_overlap_and_cover(self):
        self.assertEqual(self.t.chunks(1300), [(0, 600, 0, 602), (600, 1200, 598, 1202),
                                               (1200, 1300, 1198, 1300)])
        self.assertEqual(self.t.chunks(15), [(0, 15, 0, 15)])

    def test_overlap_words_kept_once(self):
        w = lambda s, e, word: SimpleNamespace(start=s, end=e, word=word)
        # Chunk 600-1200 padded from 598: a word at 599.0-600.5 belongs to the previous chunk.
        seg = self.t.keep([w(1, 2.5, " gone"), w(2.5, 3, " kept"), w(3, 4, " too")], 600, 1200, 598)
        self.assertEqual(seg, {"start": 600.5, "end": 602, "text": "kept too"})
        self.assertIsNone(self.t.keep([w(1, 2, " gone")], 600, 1200, 598))

    def test_audio_file_picks_only_finished_audio(self):
        out = Path(tempfile.mkdtemp())
        (out / "audio").mkdir()
        for name in (f"{A}.temp.m4a", f"{A}.m4a.part", f"{A}.m4a.ytdl", f"{A}.m4a.part-Frag3"):
            (out / "audio" / name).write_text("partial")
        self.assertIsNone(self.t.audio_file(out, A))
        (out / "audio" / f"{A}.m4a").write_text("done")
        self.assertEqual(self.t.audio_file(out, A), out / "audio" / f"{A}.m4a")
        subprocess.run(["rm", "-rf", str(out)], check=True)

    def test_invented_phrases_are_dropped_and_real_speech_kept(self):
        seg = lambda lp, *probs: SimpleNamespace(
            avg_logprob=lp, words=[SimpleNamespace(probability=p) for p in probs])
        self.assertTrue(self.t.invented(seg(-0.98, 0.09)))         # "You" over music
        self.assertTrue(self.t.invented(seg(-1.00, 0.03, 0.68)))   # "Sign up."
        self.assertFalse(self.t.invented(seg(-0.64, 0.43, 0.93, 0.51, 0.22, 0.26, 0.67, 0.36, 0.51)))
        self.assertFalse(self.t.invented(seg(-0.48, 0.13, 0.91, 0.86, 0.44)))  # strong log probability


class FrameUnits(unittest.TestCase):
    def setUp(self):
        self.f = load("extract_frames")

    def test_pick_spacing_grid_and_cap(self):
        self.assertEqual(self.f.pick([3.5, 4.0, 9.0], 0), [0.0, 3.5, 9.0])
        self.assertEqual(self.f.pick([], 100),
                         [0.0, 5.0, 15.0, 25.0, 35.0, 45.0, 55.0, 65.0, 75.0, 85.0, 95.0])
        many = self.f.pick([float(t) for t in range(2, 200, 2)], 0)
        self.assertEqual((len(many), many[0], many[-1]), (20, 0.0, 198.0))


if __name__ == "__main__":
    unittest.main()
