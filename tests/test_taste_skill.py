"""The vendored taste skill keeps its local edits."""
import re
import unittest
from pathlib import Path

SKILL = Path(__file__).resolve().parents[1] / "skill/taste"
SOURCE_LINK = re.compile(rb"(github\.com|cdn\.jsdelivr\.net/gh)/[\w.-]+/taste-skill")


class TasteSkill(unittest.TestCase):
    def test_skill_and_stop_hook_use_the_name_taste(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("\nname: taste\n", text.split("---")[1])
        self.assertIn('"$HOME/.claude/skills/taste/scripts/gate.mjs"', text)
        self.assertNotIn("$CLAUDE_PROJECT_DIR/.", text)
        self.assertNotIn("design-taste-frontend", text)
        self.assertIn("the `ui`\nskill's `record` job", text)
        self.assertIn("references/taste-contract.md", text)

    def test_skill_md_routes_to_the_flow(self):
        text = (SKILL / "SKILL.md").read_text(encoding="utf-8")
        flow = (SKILL / "references/flow-taste.md").read_text(encoding="utf-8")
        self.assertIn("Read `./references/flow-taste.md` now.", text)
        self.assertNotIn("## House rules", text)
        self.assertIn("## House rules", flow)

    def test_no_file_links_to_the_source_repo(self):
        hits = [
            path.relative_to(SKILL).as_posix()
            for path in sorted(SKILL.rglob("*"))
            if path.is_file() and SOURCE_LINK.search(path.read_bytes())
        ]
        self.assertEqual(hits, [])

    def test_gate_never_hands_a_run_to_another_file(self):
        gate = (SKILL / "scripts/gate.mjs").read_text(encoding="utf-8")
        body = gate.split("function armingGate() {\n", 1)[1]
        self.assertTrue(body.startswith("  return null;"))

    def test_icon_demo_is_not_shipped(self):
        ignored = (SKILL.parents[1] / ".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertIn("skill/taste/assets/icons/demo/", ignored)
        self.assertFalse((SKILL / "assets/icons/demo.html").exists())
