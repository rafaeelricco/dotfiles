from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit

from scripts import deploy_release, package_release
from test_packaging import SHA, build_fixture, make_source


class ReleaseHTTPFixture:
    def __init__(self, root: Path, overrides: dict[str, bytes] | None = None, unknown_status: int = 404) -> None:
        self.root = root
        self.overrides = overrides or {}
        self.unknown_status = unknown_status
        fixture = self

        class Handler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:  # noqa: N802 - HTTP handler API
                request_path = unquote(urlsplit(self.path).path)
                if request_path in fixture.overrides:
                    self._respond(200, fixture.overrides[request_path])
                    return
                target: Path | None = None
                if request_path.startswith("/dotfiles/releases/"):
                    relative = request_path[len("/dotfiles/releases/"):]
                    pieces = relative.split("/", 1)
                    if len(pieces) == 2 and len(pieces[0]) == 40:
                        target = fixture.root / "releases" / pieces[0] / pieces[1]
                elif request_path.startswith("/dotfiles/"):
                    target = fixture.root / "current" / request_path[len("/dotfiles/"):]
                elif request_path.startswith("/skills/"):
                    target = fixture.root / "current" / "skills" / request_path[len("/skills/"):]
                if target is not None and ".." not in PurePosixPath(str(target)).parts and target.is_file():
                    self._respond(200, target.read_bytes())
                    return
                self._respond(fixture.unknown_status, b"not found\n")

            def _respond(self, status: int, body: bytes) -> None:
                self.send_response(status)
                self.send_header("Content-Type", "application/octet-stream")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

            def log_message(self, fmt: str, *args: object) -> None:
                return

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.server.daemon_threads = True
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.base_url = f"http://127.0.0.1:{self.server.server_address[1]}"

    def __enter__(self) -> "ReleaseHTTPFixture":
        self.thread.start()
        return self

    def __exit__(self, *_: object) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)


class DeploymentTests(unittest.TestCase):
    def test_publish_smoke_idempotence_and_immutable_history(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, first = build_fixture(parent, name="first", version=SHA)
            second_sha = "fedcba9876543210fedcba9876543210fedcba98"
            _, second = build_fixture(parent, name="second", version=second_sha, marker="two")
            root = parent / "www" / "dotfiles"
            root.parent.mkdir(parents=True)
            portfolio = root.parent / "portfolio" / "index.html"
            portfolio.parent.mkdir(parents=True)
            portfolio.write_text("leave this route alone", encoding="utf-8")
            with ReleaseHTTPFixture(root) as web:
                previous_umask = os.umask(0o077)
                try:
                    self.assertEqual(deploy_release.deploy_release(first, root, 1, web.base_url), SHA)
                finally:
                    os.umask(previous_umask)
                self.assertEqual(os.readlink(root / "current"), f"releases/{SHA}")
                self.assertEqual(deploy_release.deploy_release(first, root, 2, web.base_url), SHA)
                self.assertEqual(os.readlink(root / "current"), f"releases/{SHA}")
                self.assertEqual(deploy_release.deploy_release(second, root, 3, web.base_url), second_sha)
            self.assertTrue((root / "releases" / SHA / f"dotfiles-{SHA}.zip").is_file())
            self.assertTrue((root / "releases" / second_sha / f"dotfiles-{second_sha}.tar.gz").is_file())
            if os.name != "nt":
                self.assertEqual(stat.S_IMODE(root.stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE((root / "releases").stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE((root / "releases" / second_sha).stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE((root / "releases" / second_sha / "skills").stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE((root / "releases" / second_sha / "install.sh").stat().st_mode), 0o755)
                self.assertEqual(stat.S_IMODE((root / "releases" / second_sha / "MANIFEST.json").stat().st_mode), 0o644)
            self.assertEqual(portfolio.read_text(encoding="utf-8"), "leave this route alone")
            state = json.loads((root / deploy_release.STATE_NAME).read_text(encoding="utf-8"))
            self.assertEqual(state, {"latest_run_number": 3, "latest_sha": second_sha, "schema": 1})

    def test_smoke_failure_rolls_current_back_and_keeps_success_metadata(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, first = build_fixture(parent, name="first", version=SHA)
            second_sha = "fedcba9876543210fedcba9876543210fedcba98"
            _, second = build_fixture(parent, name="second", version=second_sha, marker="two")
            root = parent / "www" / "dotfiles"
            root.parent.mkdir(parents=True)
            with ReleaseHTTPFixture(root) as good_web:
                deploy_release.deploy_release(first, root, 10, good_web.base_url)
            before_state = (root / deploy_release.STATE_NAME).read_bytes()
            with ReleaseHTTPFixture(root, overrides={"/dotfiles/VERSION": b"wrong\n"}) as broken_web:
                with self.assertRaisesRegex(deploy_release.DeploymentError, "current public endpoint"):
                    deploy_release.deploy_release(second, root, 11, broken_web.base_url)
            self.assertEqual(os.readlink(root / "current"), f"releases/{SHA}")
            self.assertEqual((root / deploy_release.STATE_NAME).read_bytes(), before_state)
            self.assertTrue((root / "releases" / second_sha / "VERSION").is_file())

    def test_stale_run_and_changed_existing_sha_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, first = build_fixture(parent, name="first", version=SHA)
            _, changed = build_fixture(parent, name="changed", version=SHA, marker="different content for an already used SHA")
            root = parent / "www" / "dotfiles"
            root.parent.mkdir(parents=True)
            with ReleaseHTTPFixture(root) as web:
                deploy_release.deploy_release(first, root, 7, web.base_url)
                with self.assertRaisesRegex(deploy_release.DeploymentError, "stale workflow run"):
                    deploy_release.deploy_release(first, root, 6, web.base_url)
                with self.assertRaisesRegex(deploy_release.DeploymentError, "different content"):
                    deploy_release.deploy_release(changed, root, 8, web.base_url)
            self.assertEqual(os.readlink(root / "current"), f"releases/{SHA}")

    def test_tampered_archive_sum_is_rejected_before_publication(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, release = build_fixture(parent)
            sums = release / "SHA256SUMS"
            original = sums.read_text(encoding="ascii")
            replacement = "1" if original[0] != "1" else "2"
            sums.write_text(replacement + original[1:], encoding="ascii")
            root = parent / "www" / "dotfiles"
            with self.assertRaisesRegex(deploy_release.DeploymentError, "SHA256SUMS"):
                deploy_release.deploy_release(release, root, 1, "http://127.0.0.1:1")
            self.assertFalse(root.exists())

    def test_artifact_symlinks_and_non_loopback_http_are_rejected(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, release = build_fixture(parent)
            link = release / "install.sh"
            original = link.read_bytes()
            link.unlink()
            target = parent / "external"
            target.write_bytes(original)
            try:
                link.symlink_to(target)
            except (OSError, NotImplementedError):
                self.skipTest("symlink creation is unavailable on this platform")
            with self.assertRaisesRegex(deploy_release.DeploymentError, "regular file"):
                deploy_release.validate_artifact(release)
            with self.assertRaisesRegex(deploy_release.DeploymentError, "loopback"):
                deploy_release._base_url("http://example.com")

    def test_unknown_skill_must_return_404_and_current_is_rolled_back(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            _, release = build_fixture(parent)
            root = parent / "www" / "dotfiles"
            root.parent.mkdir(parents=True)
            with ReleaseHTTPFixture(root, unknown_status=200) as web:
                with self.assertRaisesRegex(deploy_release.DeploymentError, "unknown skill endpoint"):
                    deploy_release.deploy_release(release, root, 1, web.base_url)
            self.assertFalse((root / "current").exists())
            self.assertFalse((root / deploy_release.STATE_NAME).exists())

    def test_powershell_aliases_fetch_same_release_and_forward_arguments(self) -> None:
        pwsh = shutil.which(os.environ.get("DOTFILES_TEST_PWSH", "pwsh"))
        if not pwsh:
            self.skipTest("PowerShell 7 is not installed on this runner")
        with tempfile.TemporaryDirectory() as temporary:
            parent = Path(temporary)
            source = make_source(parent / "source")
            (source / "scripts/remote.ps1").write_text(
                "param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Received)\n"
                "$release = '__DOTFILES_RELEASE__'\n"
                "$skills = '__DOTFILES_SKILLS__'\n"
                "Write-Output ('RECEIVED=' + ($Received -join '|'))\n",
                encoding="utf-8",
            )
            release = parent / "release"
            package_release.build_release(SHA, release, source=source, use_git=False)
            root = parent / "www" / "dotfiles"
            root.parent.mkdir(parents=True)
            with ReleaseHTTPFixture(root) as web:
                deploy_release.deploy_release(release, root, 1, web.base_url)
                environment = os.environ.copy()
                environment["DOTFILES_BASE_URL"] = web.base_url + "/dotfiles"
                for script, expected in (
                    ("update.ps1", "RECEIVED=--dry-run|alpha"),
                    ("uninstall.ps1", "RECEIVED=uninstall|--dry-run|alpha"),
                    ("skills/orchestrate.ps1", "RECEIVED=orchestrate|--dry-run|alpha"),
                ):
                    result = subprocess.run(
                        [pwsh, "-NoProfile", "-File", str(release / script), "--dry-run", "alpha"],
                        cwd=parent,
                        env=environment,
                        check=True,
                        capture_output=True,
                        text=True,
                    )
                    self.assertIn(expected, result.stdout, script)


class RunnerJobGuardTests(unittest.TestCase):
    GUARD = Path(__file__).resolve().parents[1] / "scripts/hosting/runner-job-guard.sh"
    RELEASE = {
        "GITHUB_REPOSITORY": "rafaeelricco/dotfiles",
        "GITHUB_WORKFLOW_REF": "rafaeelricco/dotfiles/.github/workflows/release.yml@refs/heads/main",
        "GITHUB_REF": "refs/heads/main",
        "GITHUB_EVENT_NAME": "push",
    }

    def run_guard(self, **overrides: str) -> subprocess.CompletedProcess[str]:
        bash = shutil.which("bash")
        if not bash or os.name == "nt":
            self.skipTest("the runner hook targets the Linux runner's Bash")
        environment = {"PATH": os.environ.get("PATH", "")}
        environment.update(self.RELEASE)
        environment.update(overrides)
        return subprocess.run([bash, str(self.GUARD)], env=environment, capture_output=True, text=True)

    def test_release_workflow_on_main_is_allowed(self) -> None:
        for event in ("push", "workflow_dispatch"):
            with self.subTest(event=event):
                self.assertEqual(self.run_guard(GITHUB_EVENT_NAME=event).returncode, 0)

    def test_other_jobs_are_refused(self) -> None:
        cases = {
            "other workflow": {"GITHUB_WORKFLOW_REF": "rafaeelricco/dotfiles/.github/workflows/evil.yml@refs/heads/main"},
            "pull request": {
                "GITHUB_EVENT_NAME": "pull_request",
                "GITHUB_REF": "refs/pull/9/merge",
                "GITHUB_WORKFLOW_REF": "rafaeelricco/dotfiles/.github/workflows/release.yml@refs/pull/9/merge",
            },
            "pull_request_target": {"GITHUB_EVENT_NAME": "pull_request_target"},
            "other branch": {
                "GITHUB_REF": "refs/heads/feature",
                "GITHUB_WORKFLOW_REF": "rafaeelricco/dotfiles/.github/workflows/release.yml@refs/heads/feature",
            },
            "other repository": {"GITHUB_REPOSITORY": "someone/dotfiles"},
            "missing context": {"GITHUB_WORKFLOW_REF": ""},
        }
        for name, overrides in cases.items():
            with self.subTest(name=name):
                result = self.run_guard(**overrides)
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("runner-job-guard: refusing job", result.stderr)


if __name__ == "__main__":
    unittest.main()
