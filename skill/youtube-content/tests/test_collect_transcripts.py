import io
import json
import os
from contextlib import redirect_stderr, redirect_stdout
from pathlib import Path
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import Mock, patch
from xml.etree.ElementTree import ParseError

from requests import Timeout
from youtube_transcript_api import (
    FetchedTranscript, FetchedTranscriptSnippet, IpBlocked, TranscriptsDisabled, VideoUnavailable,
)

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPTS))
import collect_transcripts as batch
import fetch_transcript as single


def tracks(video_id):
    result = FetchedTranscript(
        [FetchedTranscriptSnippet("início", 0, 2), FetchedTranscriptSnippet("fim", 3723, 1)],
        video_id, "Portuguese", "pt", False,
    )
    return [Mock(fetch=Mock(return_value=result))]


class BatchTest(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.root = Path(folder.name)
        self.ids = [letter * 11 for letter in "abcdefghi"]
        self.api = Mock()
        self.api.list.side_effect = tracks
        provider = patch.object(batch, "YouTubeTranscriptApi", return_value=self.api)
        provider.start()
        self.addCleanup(provider.stop)

    def cli(self, *args, expected=0):
        stdout, stderr = io.StringIO(), io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            self.assertEqual(batch.main(args), expected, stderr.getvalue())
        return json.loads(stderr.getvalue() if expected == 1 else stdout.getvalue())

    def test_list_identity_full_text_and_repeated_invocation(self):
        a = self.ids[0]
        inputs = [f"https://youtu.be/{a}", f"https://youtube.com/watch?v={a}&list=xyz", *self.ids[1:]]
        with patch.object(Path, "cwd", return_value=self.root):
            first = self.cli(*inputs)
            second = self.cli(*reversed(inputs))
        self.assertEqual(first, second)
        self.assertEqual((first["unique"], first["saved"]), (9, 9))
        self.assertEqual([c.args[0] for c in self.api.list.call_args_list], self.ids)
        content = Path(first["videos"][0]["path"]).read_text(encoding="utf-8")
        self.assertEqual(content, f"# {a}\n\nVideo: https://www.youtube.com/watch?v={a}\n"
                         "Source: youtube-transcript-api\nLanguage: pt\n\n[0:00] início\n[1:02:03] fim\n")

    def test_partial_coverage_and_bounded_retry(self):
        a, b, c, d, e = self.ids[:5]
        self.api.list.side_effect = [tracks(a), IpBlocked(b)]
        args = ["--output", str(self.root)]
        first = self.cli(*args, a, b, c, d, e, expected=2)
        self.assertEqual([v["status"] for v in first["videos"]],
                         ["saved", "blocked", "pending", "pending", "pending"])
        self.assertEqual(first, self.cli(*args, expected=2))
        self.assertEqual(self.api.list.call_count, 2)
        self.api.list.side_effect = [IpBlocked(b)]
        self.assertEqual(self.cli(*args, "--retry", expected=2), first)
        self.api.list.side_effect = [tracks(b), TranscriptsDisabled(c), VideoUnavailable(d), Timeout()]
        result = self.cli(*args, "--retry", expected=2)
        self.assertEqual([(v["status"], v["reason"]) for v in result["videos"]], [
            ("saved", None), ("saved", None), ("missing", "TranscriptsDisabled"),
            ("unavailable", "VideoUnavailable"), ("retryable", "Timeout")])
        self.api.list.side_effect = tracks
        self.assertEqual(self.cli(*args, "--retry", expected=2)["saved"], 3)
        self.assertEqual([call.args[0] for call in self.api.list.call_args_list], [a, b, b, b, c, d, e, e])

    def test_malformed_caption_does_not_starve_remaining_queue(self):
        a, b = self.ids[:2]
        bad_track = Mock()
        bad_track.fetch.side_effect = ParseError("no element found")
        self.api.list.side_effect = [[bad_track], tracks(b)]
        args = ["--output", str(self.root)]
        result = self.cli(*args, a, b, expected=2)
        self.assertEqual([(v["status"], v["reason"]) for v in result["videos"]],
                         [("retryable", "ParseError"), ("saved", None)])
        self.assertEqual(self.cli(*args, expected=2), result)
        self.api.list.side_effect = tracks
        self.assertEqual(self.cli(*args, "--retry")["saved"], 2)
        self.assertEqual([call.args[0] for call in self.api.list.call_args_list], [a, b, a])

    def test_process_death_during_second_fetch_and_recovery(self):
        a, b, c = self.ids[:3]
        command = """
import os, sys
import collect_transcripts as batch
def fetch(api, video_id):
    if video_id == sys.argv[-2]:
        os._exit(23)
    return 'saved', None, 'committed transcript'
batch.fetch_one = fetch
sys.exit(batch.main())
"""
        args = ["--output", str(self.root)]
        child = subprocess.run([sys.executable, "-c", command, *args, a, b, c],
                               env={**os.environ, "PYTHONPATH": str(SCRIPTS)}, check=False)
        self.assertEqual(child.returncode, 23)
        self.assertFalse(list(self.root.glob("transcripts/*.md")))
        result = self.cli(*args)
        self.assertEqual([call.args[0] for call in self.api.list.call_args_list], [b, c])
        self.assertEqual(Path(result["videos"][0]["path"]).read_text(), "committed transcript")

    def test_export_failure_and_busy_writer(self):
        a = self.ids[0]
        args = ["--output", str(self.root)]
        with patch.object(Path, "replace", side_effect=OSError("disk full")):
            self.assertIn("disk full", self.cli(*args, a, expected=1)["error"])
        self.assertFalse(list(self.root.glob("transcripts/*")))
        db = sqlite3.connect(self.root / "queue.sqlite3")
        try:
            db.execute("BEGIN IMMEDIATE")
            self.assertIn("locked", self.cli(*args, a, expected=1)["error"])
        finally:
            db.close()
        self.assertEqual(self.cli(*args)["saved"], 1)
        self.assertEqual(self.api.list.call_count, 1)

    def test_invalid_inputs_and_empty_tracks(self):
        a, b = self.ids[:2]
        bad = ["https://youtube.com/@channel", f"https://other.test/watch?v={a}",
               f"https://youtu.be/{a}1", "https://youtube.com/playlist?list=q"]
        blank = tracks(b)
        blank[0].fetch.return_value.snippets[0].text = " "
        blank[0].fetch.return_value.snippets[1].text = ""
        self.api.list.side_effect = [[], blank]
        result = self.cli("--output", str(self.root), *bad, a, b, expected=2)
        self.assertEqual(result["invalid_inputs"], bad)
        self.assertEqual([v["reason"] for v in result["videos"]], ["no_tracks", "empty_track"])
        self.assertFalse(list(self.root.glob("transcripts/*")))

    def test_single_video_cli(self):
        video_id = self.ids[0]
        with patch.object(sys, "argv", ["fetch_transcript.py", video_id, "--text-only", "--timestamps"]), \
             patch("youtube_transcript_api.YouTubeTranscriptApi") as api, redirect_stdout(io.StringIO()) as out:
            api.return_value.fetch.return_value = tracks(video_id)[0].fetch()
            single.main()
        self.assertEqual(out.getvalue(), "0:00 início\n1:02:03 fim\n")
