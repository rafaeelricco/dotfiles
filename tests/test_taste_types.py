"""tsc --checkJs over the taste and ui scripts: no undefined names or wrong argument counts, and no more errors than the
baseline. Lower BASELINE when a file is cleaned. Skipped until `npm ci` has installed TypeScript."""
import re
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TSC = ROOT / "node_modules/.bin" / ("tsc.cmd" if sys.platform == "win32" else "tsc")
# the count after the 2026-11-11 cleanup; most are DOM narrowing (Element vs HTMLElement), not bugs
BASELINE = 649
# undefined name, misspelt name, wrong number of arguments: each was a real bug or a missing import when first seen
NEVER = ("TS2304", "TS2552", "TS2554")


@unittest.skipUnless(TSC.exists(), "run `npm ci` to install TypeScript")
class TasteTypes(unittest.TestCase):
    def test_typecheck_holds_the_baseline(self):
        r = subprocess.run([str(TSC), "-p", "tsconfig.json"], cwd=ROOT, capture_output=True, text=True, timeout=600)
        lines = [l for l in r.stdout.splitlines() if re.search(r"error TS\d+", l)]
        never = [l for l in lines if any(c in l for c in NEVER)]
        self.assertEqual(never, [])
        self.assertLessEqual(len(lines), BASELINE, f"{len(lines)} errors, baseline {BASELINE}")


if __name__ == "__main__":
    unittest.main()
