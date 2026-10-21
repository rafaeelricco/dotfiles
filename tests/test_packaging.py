from __future__ import annotations

import hashlib
import json
import os
import stat
import tempfile
import unittest
import zipfile
import tarfile
from pathlib import Path

from scripts import deploy_release, package_release


SHA = "0123456789abcdef0123456789abcdef01234567"


def make_source(root: Path, *, marker: str = "one") -> Path:
    files = {
        "INSTRUCTIONS.md": "runtime instructions\n",
        "install.ps1": "param([Parameter(ValueFromRemainingArguments=$true)]$Args)\n",
        "update.ps1": "update alias\n",
        "uninstall.ps1": "uninstall alias\n",
        "scripts/install.sh": "#!/usr/bin/env bash\nexit 0\n",
        "scripts/update.sh": "#!/usr/bin/env bash\nexit 0\n",
        "scripts/uninstall.sh": "#!/usr/bin/env bash\nexit 0\n",
        "scripts/remote.sh": "release=__DOTFILES_RELEASE__\nskills=__DOTFILES_SKILLS__\n",
        "scripts/remote.ps1": "$release='__DOTFILES_RELEASE__'\n$skills='__DOTFILES_SKILLS__'\n",
        "scripts/lib/lifecycle.sh": "# lifecycle\n",
        "scripts/package_release.py": "must stay out of runtime\n",
        "scripts/deploy_release.py": "must stay out of runtime\n",
        "scripts/hosting/dotfiles.nginx.conf": "must stay out of runtime\n",
        "scripts/windows/README.md": "build documentation excluded from runtime\n",
        "skill/dependencies.txt": "orchestrate scope-and-plan verify commit-message\n",
        "skill/orchestrate/SKILL.md": f"# Orchestrate {marker}\n",
        "skill/orchestrate/references/guide.md": "keep runtime references\n",
        "skill/ui/SKILL.md": "# UI\n",
        "skill/ui/tests/test_ui.py": "test-only\n",
        "skill/ui/evals/cases.md": "eval-only\n",
        "powershell/Microsoft.PowerShell_profile.ps1": "profile asset\n",
        "powershell/themes/theme.omp.json": "{}\n",
        "tests/test_installers.py": "repository tests excluded\n",
        "fonts/user-font.ttf": "user file excluded\n",
        "scripts/.env": "private environment excluded\n",
        "powershell/private-token.txt": "private user file excluded\n",
    }
    for relative, content in files.items():
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
    os.chmod(root / "scripts/install.sh", 0o755)
    os.chmod(root / "scripts/remote.sh", 0o755)
    return root


def build_fixture(parent: Path, *, version: str = SHA, marker: str = "one", name: str = "release") -> tuple[Path, Path]:
    source = make_source(parent / f"source-{name}", marker=marker)
    output = parent / name
    package_release.build_release(version, output, source=source, use_git=False)
    return source, output


def artifact_hashes(root: Path) -> dict[str, str]:
    return {
        path.relative_to(root).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest()
        for path in root.rglob("*")
        if path.is_file()
    }


class PackageReleaseTests(unittest.TestCase):
    def test_deterministic_archives_manifest_and_allowlist(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, first = build_fixture(parent, name="first")
            _, second = build_fixture(parent, name="second")
            self.assertEqual(artifact_hashes(first), artifact_hashes(second))

            manifest = json.loads((first / "MANIFEST.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["version"], SHA)
            self.assertEqual(manifest["skills"], ["orchestrate", "ui"])
            self.assertIn("skills/orchestrate", manifest["launchers"])
            self.assertIn("skills/ui.ps1", manifest["launchers"])

            for archive_name in manifest["archives"]:
                archive_path = first / archive_name
                self.assertEqual(hashlib.sha256(archive_path.read_bytes()).hexdigest(), manifest["archives"][archive_name])
            sums = (first / "SHA256SUMS").read_text(encoding="ascii")
            self.assertEqual(sums.count("\n"), 2)

            with tarfile.open(first / f"dotfiles-{SHA}.tar.gz", "r:gz") as archive:
                names = set(archive.getnames())
                self.assertIn("dotfiles/RUNTIME-MANIFEST.json", names)
                self.assertIn("dotfiles/skill/orchestrate/references/guide.md", names)
                self.assertNotIn("dotfiles/tests/test_installers.py", names)
                self.assertNotIn("dotfiles/skill/ui/tests/test_ui.py", names)
                self.assertNotIn("dotfiles/skill/ui/evals/cases.md", names)
                self.assertNotIn("dotfiles/scripts/package_release.py", names)
                self.assertNotIn("dotfiles/fonts/user-font.ttf", names)
                self.assertNotIn("dotfiles/scripts/.env", names)
                self.assertNotIn("dotfiles/powershell/private-token.txt", names)
            with zipfile.ZipFile(first / f"dotfiles-{SHA}.zip") as archive:
                self.assertEqual(set(archive.namelist()), names)
                self.assertEqual(archive.read("dotfiles/VERSION"), (SHA + "\n").encode())

    def test_rendered_bootstraps_and_named_launchers_pin_same_sha(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            _, output = build_fixture(Path(temporary))
            manifest = json.loads((output / "MANIFEST.json").read_text())
            self.assertEqual(manifest["skills"], ["orchestrate", "ui"])
            for name in ("install.sh", "install.ps1"):
                content = (output / name).read_text(encoding="utf-8")
                self.assertIn(SHA, content)
                self.assertIn("orchestrate ui", content)
                self.assertNotIn("__DOTFILES_", content)
            for name in ("update.sh", "update.ps1", "uninstall.sh", "uninstall.ps1", "skills/orchestrate", "skills/orchestrate.ps1", "skills/ui", "skills/ui.ps1"):
                content = (output / name).read_text(encoding="utf-8")
                self.assertIn(SHA, content, name)
                self.assertNotIn("__DOTFILES_", content, name)
            if os.name != "nt":
                self.assertTrue((output / "skills/orchestrate").stat().st_mode & stat.S_IXUSR)

    def test_rejects_bad_sha_and_missing_template_placeholders(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            source = make_source(parent / "source")
            with self.assertRaisesRegex(package_release.ReleaseError, "40-character"):
                package_release.build_release("A" * 40, parent / "bad", source, use_git=False)

            (source / "scripts/remote.ps1").write_text("no render slots", encoding="utf-8")
            with self.assertRaisesRegex(package_release.ReleaseError, "placeholder"):
                package_release.build_release(SHA, parent / "bad", source, use_git=False)

    def test_downloaded_native_artifact_is_self_consistent(self) -> None:
        release_dir = os.environ.get("DOTFILES_TEST_RELEASE_DIR")
        if not release_dir:
            self.skipTest("native matrix did not provide DOTFILES_TEST_RELEASE_DIR")
        result = deploy_release.validate_artifact(Path(release_dir))
        self.assertRegex(result["version"], r"^[0-9a-f]{40}$")


if __name__ == "__main__":
    unittest.main()
