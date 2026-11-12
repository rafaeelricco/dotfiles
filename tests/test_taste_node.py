"""The taste kit's node:test suite (tests/taste_js) runs with the Python tests."""
import shutil
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which("node"), "node is not installed")
class TasteNodeTests(unittest.TestCase):
    def test_node_suite_passes(self):
        files = sorted(str(p) for p in (ROOT / "tests/taste_js").glob("*.test.mjs"))
        self.assertTrue(files)
        r = subprocess.run(["node", "--test", *files], cwd=ROOT, capture_output=True, text=True, timeout=300)
        self.assertEqual(r.returncode, 0, r.stdout[-4000:] + r.stderr[-2000:])


if __name__ == "__main__":
    unittest.main()
