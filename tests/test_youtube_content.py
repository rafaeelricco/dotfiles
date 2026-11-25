"""Exercise the youtube-content caption scripts against a fake yt-dlp, with no network."""
from pathlib import Path
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
    out = args[args.index("-o") + 1].split("/%(id)s")[0]
    failing = os.environ.get("FAKE_FAIL_CAPTIONS", "").split(",")
    for url in open(args[args.index("-a") + 1]).read().split():
        vid = url.split("v=")[1]
        calls.write("fetch " + vid + "\\n")
        if vid in failing:
            print("WARNING: Unable to download video subtitles for 'en-orig': HTTP 429", file=sys.stderr)
        else:
            events = [{"tStartMs": 0, "segs": [{"utf8": "first"}]},
                      {"tStartMs": 4000, "segs": [{"utf8": "same block"}]},
                      {"tStartMs": 12400, "segs": [{"utf8": "second block"}]}]
            json.dump({"events": events}, open(f"{out}/{vid}.en-orig.json3", "w"))
        json.dump({"id": vid, "upload_date": "20260101", "description": "desc",
                   "automatic_captions": {"en-orig": [{}]}}, open(f"{out}/{vid}.info.json", "w"))
    sys.exit(1 if failing != [""] else 0)
""")

A, B, C = "aaaaaaaaaa1", "bbbbbbbbbb2", "cccccccccc3"


class CaptionScripts(unittest.TestCase):
    def setUp(self):
        self.dir = Path(tempfile.mkdtemp())
        self.out = self.dir / "kb"
        (self.dir / "fake.py").write_text(FAKE_YTDLP)
        self.calls = self.dir / "calls.log"
        self.calls.touch()

    def tearDown(self):
        subprocess.run(["rm", "-rf", str(self.dir)], check=True)

    def fetch(self, url="https://www.youtube.com/@x", tabs=None, **env):
        self.calls.write_text("")
        environ = dict(os.environ, YTDLP=f"{sys.executable} {self.dir / 'fake.py'}",
                       FAKE_CALLS=str(self.calls), FAKE_TABS=json.dumps(tabs or {}), **env)
        environ.pop("LIMIT", None)
        environ.pop("LANGS", None)
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
        self.assertIn("2 videos, 2 with captions, 0 without, 0 pending", run.stdout)
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


if __name__ == "__main__":
    unittest.main()
