"""Keep published installation instructions aligned with the CLI contract."""
from pathlib import Path
import re
import unittest


ROOT = Path(__file__).resolve().parents[1]
GUIDES = ("README.md", "docs/setup.md", "scripts/windows/README.md", "docs/deployment.md")


def headings(text):
    result = set()
    for title in re.findall(r"^#{1,6}\s+(.+?)\s*$", text, re.MULTILINE):
        title = title.lower().replace("`", "")
        title = re.sub(r"[^\w\s-]", "", title)
        result.add(re.sub(r"\s", "-", title))
    return result


class Documentation(unittest.TestCase):
    def test_relative_links_and_anchors_resolve(self):
        for name in GUIDES:
            document = ROOT / name
            for link in re.findall(r"\[[^\]]*\]\(([^)]+)\)", document.read_text()):
                if re.match(r"[a-zA-Z][\w+.-]*:", link):
                    continue
                path, _, anchor = link.partition("#")
                target = (document.parent / path).resolve() if path else document
                with self.subTest(document=name, link=link):
                    self.assertTrue(target.exists(), "broken documentation link")
                    if anchor and target.is_file() and target.suffix == ".md":
                        self.assertIn(anchor, headings(target.read_text()))

    def test_current_install_examples_do_not_use_retired_flags_or_raw_urls(self):
        removed = re.compile(r"(?<!\w)(?:--(?:yes|override|local|dir|skills)|-(?:Yes|Override|Local|Dir|Skills))\b")
        for name in GUIDES:
            text = (ROOT / name).read_text()
            for language, block in re.findall(r"```([^\n]*)\n(.*?)```", text, re.DOTALL):
                if language.strip() not in ("bash", "powershell", "sh", "shell"):
                    continue
                if re.search(r"(?:r1cco\.com/(?:skills|dotfiles)|(?:scripts/)?(?:install|update|uninstall)\.(?:sh|ps1))", block):
                    with self.subTest(document=name, block=block):
                        self.assertIsNone(removed.search(block))
                        self.assertNotIn("raw.githubusercontent.com/rafaeelricco/dotfiles/main/", block)

    def test_guides_describe_shared_contract(self):
        setup = (ROOT / "docs/setup.md").read_text()
        for name in ("DOTFILES_HOME", "install-state", "--dry-run", "-DryRun", "-SkipTerminal",
                     "local-install-state", "DOTFILES_DIR"):
            self.assertIn(name, setup)
        self.assertIn("Upgrade from the legacy clone installer", setup)
        self.assertIn("preserves the existing profile", (ROOT / "scripts/windows/README.md").read_text())
        readme = (ROOT / "README.md").read_text()
        self.assertIn("https://r1cco.com/skills/orchestrate", readme)
        self.assertIn("docs/deployment.md", readme)
        for row in (ROOT / "skill/dependencies.txt").read_text().splitlines():
            if not row or row.startswith("#"):
                continue
            for name in row.split():
                self.assertIn("`" + name + "`", setup)


if __name__ == "__main__":
    unittest.main()
