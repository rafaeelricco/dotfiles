"""Exercise the public lifecycle interfaces in disposable user homes."""
import functools
import http.server
import json
import os
from pathlib import Path
import shlex
import shutil
import signal
import subprocess
import tarfile
import tempfile
import threading
import time
import unittest
import zipfile


REPO = Path(__file__).resolve().parents[1]
ORCHESTRATE = {
    "orchestrate", "scope-and-plan", "plan-format", "model-tiers",
    "implement", "verify", "commit-message",
}
PWSH = os.environ.get("DOTFILES_TEST_PWSH") or shutil.which("pwsh")
BASH = "/bin/bash" if Path("/bin/bash").exists() else shutil.which("bash")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


class LifecycleCases:
    runtime = "bash"

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="dotfiles-install-test-")
        self.addCleanup(self.temp.cleanup)
        self.base = Path(self.temp.name).resolve()
        self.home = self.base / "user"
        self.home.mkdir()
        self.source = self.base / "source"
        self.source.mkdir()
        self.release = os.environ.get("DOTFILES_TEST_RELEASE_DIR")
        if self.release:
            release = Path(self.release).resolve()
            version = (release / "VERSION").read_text().strip()
            if os.name == "nt":
                with zipfile.ZipFile(release / ("dotfiles-" + version + ".zip")) as archive:
                    archive.extractall(self.source)
            else:
                with tarfile.open(release / ("dotfiles-" + version + ".tar.gz")) as archive:
                    archive.extractall(self.source, filter="data")
            self.source = self.source / "dotfiles"
        else:
            for name in ("scripts", "skill", "powershell"):
                shutil.copytree(REPO / name, self.source / name,
                                ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache", "tests"))
            for name in ("INSTRUCTIONS.md", "install.ps1", "update.ps1", "uninstall.ps1"):
                shutil.copy2(REPO / name, self.source / name)
        self.bin = self.base / "bin"
        self.bin.mkdir()
        (self.bin / "codex").write_text("#!/bin/sh\nexit 0\n")
        (self.bin / "codex").chmod(0o755)
        (self.bin / "codex.cmd").write_text("@exit /b 0\r\n")
        self.env = os.environ.copy()
        for name in ("DOTFILES_DIR", "DOTFILES_HOME", "DOTFILES_VERSION", "DOTFILES_BASE_URL",
                     "DOTFILES_TARGET_ROOT", "DOTFILES_REMOTE_STAGE", "CLAUDE_CONFIG_DIR",
                     "CODEX_HOME", "GROK_HOME", "HERMES_HOME"):
            self.env.pop(name, None)
        self.env.update({
            "HOME": str(self.home), "USERPROFILE": str(self.home),
            "LOCALAPPDATA": str(self.home / "AppData" / "Local"),
            "XDG_STATE_HOME": str(self.home / "state"),
            "XDG_DATA_HOME": str(self.home / "data"),
            "PATH": str(self.bin) + os.pathsep + self.env.get("PATH", ""),
            "DOTFILES_TEST_PROFILE": str(self.home / "profile" / "Microsoft.PowerShell_profile.ps1"),
        })
        self.skills = self.home / ".agents" / "skills"
        self.state_base = (Path(self.env["LOCALAPPDATA"]) if os.name == "nt"
                           else Path(self.env["XDG_STATE_HOME"])) / "dotfiles"
        self.state = self.state_base / "install-state"

    def invoke(self, args=(), action="install", script=None, env=None):
        command_env = self.env.copy()
        if env:
            command_env.update(env)
        if self.runtime == "bash":
            entry = script or self.source / "scripts" / (action + ".sh")
            command = [BASH, str(entry)] + list(args)
        else:
            entry = script or self.source / (action + ".ps1")
            command_env["DOTFILES_TEST_SCRIPT"] = str(entry)
            command_env["DOTFILES_TEST_ARGS"] = json.dumps(list(args))
            command = [PWSH, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
                       "$PROFILE = $env:DOTFILES_TEST_PROFILE; "
                       "$installerArgs = @(ConvertFrom-Json $env:DOTFILES_TEST_ARGS); "
                       "& $env:DOTFILES_TEST_SCRIPT @installerArgs"]
        return subprocess.run(command, env=command_env, input="", text=True,
                              capture_output=True, timeout=90)

    def assert_success(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + "\n" + result.stderr)

    def names(self):
        return {p.name for p in self.skills.iterdir()} if self.skills.exists() else set()

    def skip_flags(self):
        return (["--skip-claude", "--skip-grok", "--skip-cursor", "--skip-hermes"]
                if self.runtime == "bash" else
                ["-SkipClaude", "-SkipGrok", "-SkipCursor", "-SkipHermes", "-SkipTerminal"])

    def serve_release(self):
        release = Path(self.release).resolve()
        version = (release / "VERSION").read_text().strip()
        web = self.base / "web"
        public = web / "dotfiles"
        immutable = public / "releases" / version
        shutil.copytree(release, immutable)
        for item in release.iterdir():
            if item.is_file():
                shutil.copy2(item, public / item.name)
        shutil.copytree(release / "skills", web / "skills")
        handler = functools.partial(QuietHandler, directory=str(web))
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        self.addCleanup(server.server_close)
        self.addCleanup(server.shutdown)
        return "http://127.0.0.1:" + str(server.server_port) + "/dotfiles", immutable

    def test_orchestrate_dependencies_and_repeat(self):
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        self.assertEqual(self.names(), ORCHESTRATE)
        for name in ORCHESTRATE:
            self.assertTrue((self.skills / name).is_symlink(), name)
            self.assertEqual((self.skills / name).resolve(), (self.source / "skill" / name).resolve())
        self.assertTrue(self.state.is_file())
        first = self.state.read_text()
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        lines = self.state.read_text().splitlines()
        self.assertEqual(len(lines), len(set(lines)), "state must not accumulate duplicate records")
        self.assertEqual(self.names(), ORCHESTRATE)
        self.assertIn("dotfiles-lifecycle-state-v2", first.splitlines()[0])

    def test_selected_retains_other_skills_and_guidance(self):
        guidance = self.home / ".codex" / "AGENTS.md"
        guidance.parent.mkdir(parents=True)
        guidance.write_text("My existing instructions\n")
        self.assert_success(self.invoke(["ui"] + self.skip_flags()))
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        self.assertEqual(self.names(), ORCHESTRATE | {"ui"})
        self.assertEqual(guidance.read_text(), "My existing instructions\n")
        self.assertFalse(guidance.is_symlink())

    def test_full_install_includes_guidance(self):
        self.assert_success(self.invoke(self.skip_flags()))
        expected = {p.parent.name for p in (self.source / "skill").glob("*/SKILL.md")}
        self.assertEqual(self.names(), expected)
        guidance = self.home / ".codex" / "AGENTS.md"
        self.assertTrue(guidance.is_symlink())
        self.assertEqual(guidance.resolve(), (self.source / "INSTRUCTIONS.md").resolve())

    def test_dry_run_does_not_install(self):
        option = "--dry-run" if self.runtime == "bash" else "-DryRun"
        self.assert_success(self.invoke(["orchestrate", option] + self.skip_flags()))
        self.assertFalse(self.state.exists())
        self.assertEqual(self.names(), set())
        self.assertFalse(self.home.joinpath(".codex", "AGENTS.md").exists())

    def test_removed_flags_and_unknown_skills_fail_before_state(self):
        removed = (["--yes", "-y", "--override", "--local", "--dir", "--skills"]
                   if self.runtime == "bash" else
                   ["-Yes", "-Override", "-Local", "-Dir", "-Skills"])
        for value in removed + ["unknown-skill", "../ui", ""]:
            with self.subTest(value=value):
                result = self.invoke([value] + self.skip_flags())
                self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
                self.assertFalse(self.state.exists())
                self.assertEqual(self.names(), set())

    def test_help_has_inventory_without_state(self):
        option = "--help" if self.runtime == "bash" else "-Help"
        result = self.invoke([option])
        self.assert_success(result)
        self.assertIn("orchestrate", result.stdout)
        self.assertIn("ui", result.stdout)
        flags = (["--dry-run", "--help", "--skip-claude", "--skip-codex", "--skip-grok", "--skip-cursor", "--skip-hermes"]
                 if self.runtime == "bash" else
                 ["-DryRun", "-Help", "-SkipClaude", "-SkipCodex", "-SkipGrok", "-SkipCursor", "-SkipHermes", "-SkipTerminal"])
        for flag in flags:
            self.assertIn(flag.lower(), result.stdout.lower())
        self.assertFalse(self.state.exists())

    def test_foreign_conflict_blocks_whole_plan(self):
        foreign = self.skills / "ui"
        foreign.mkdir(parents=True)
        (foreign / "mine").write_text("keep")
        result = self.invoke(["ui", "orchestrate"] + self.skip_flags())
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((foreign / "mine").read_text(), "keep")
        self.assertFalse((self.skills / "orchestrate").exists())
        self.assertFalse(self.state.exists())

    def test_duplicate_roots_and_dependency_cycle_terminate(self):
        (self.source / "skill" / "dependencies.txt").write_text("orchestrate ui\nui orchestrate\n")
        self.assert_success(self.invoke(["orchestrate", "ui", "orchestrate"] + self.skip_flags()))
        self.assertEqual(self.names(), {"orchestrate", "ui"})

    def test_missing_dependency_fails_before_state(self):
        (self.source / "skill" / "dependencies.txt").write_text("orchestrate absent-companion\n")
        self.assertNotEqual(self.invoke(["orchestrate"] + self.skip_flags()).returncode, 0)
        self.assertFalse(self.state.exists())
        self.assertEqual(self.names(), set())

    def test_uninstall_retains_source_and_backups(self):
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        backup = self.home / "instructions.backup"
        backup.write_text("valuable original\n")
        with self.state.open("a") as stream:
            stream.write("backup\t" + str(self.home / ".codex" / "AGENTS.md") + "\t" + str(backup) + "\n")
        self.assert_success(self.invoke(action="uninstall"))
        self.assertEqual(self.names(), set())
        self.assertTrue((self.source / "skill" / "orchestrate" / "SKILL.md").is_file())
        self.assertEqual(backup.read_text(), "valuable original\n")
        self.assert_success(self.invoke(action="uninstall"))

    @unittest.skipIf(os.name == "nt", "POSIX pseudo-terminal required")
    def test_terminal_confirmation_cancel_and_typed_replacement(self):
        import fcntl
        import pty
        import termios
        import time
        def terminal_run(responses):
            master, slave = pty.openpty()
            env = self.env.copy()
            if self.runtime == "bash":
                command = [BASH, str(self.source / "scripts/install.sh"), "ui"] + self.skip_flags()
            else:
                env["DOTFILES_TEST_SCRIPT"] = str(self.source / "install.ps1")
                env["DOTFILES_TEST_ARGS"] = json.dumps(["ui"] + self.skip_flags())
                command = [PWSH, "-NoLogo", "-NoProfile", "-Command",
                           "$PROFILE=$env:DOTFILES_TEST_PROFILE; "
                           "$installerArgs=@(ConvertFrom-Json $env:DOTFILES_TEST_ARGS); "
                           "& $env:DOTFILES_TEST_SCRIPT @installerArgs"]
            def controlling_terminal():
                os.setsid()
                fcntl.ioctl(0, termios.TIOCSCTTY, 0)
            process = subprocess.Popen(command, stdin=slave, stdout=slave, stderr=slave,
                                       env=env, preexec_fn=controlling_terminal)
            os.close(slave)
            output = bytearray()
            import select
            try:
                for prompt, reply in responses:
                    deadline = time.monotonic() + 20
                    while prompt.lower() not in output.decode(errors="replace").lower():
                        if time.monotonic() > deadline:
                            self.fail("terminal prompt missing: " + output.decode(errors="replace"))
                        if select.select([master], [], [], .1)[0]:
                            try: output.extend(os.read(master, 65536))
                            except OSError: self.fail(output.decode(errors="replace"))
                    os.write(master, reply.encode())
                deadline = time.monotonic() + 20
                while process.poll() is None and time.monotonic() < deadline:
                    if select.select([master], [], [], .1)[0]:
                        try: output.extend(os.read(master, 65536))
                        except OSError: break
                self.assertEqual(process.wait(timeout=5), 0, output.decode(errors="replace"))
            finally:
                if process.poll() is None: process.kill(); process.wait()
                os.close(master)
        terminal_run([("[Y/n]", "n\n")])
        self.assertFalse(self.state.exists())
        self.assertEqual(self.names(), set())
        foreign = self.skills / "ui"
        foreign.mkdir(parents=True)
        (foreign / "mine").write_text("keep me")
        terminal_run([("[Y/n]", "y\n"), ("type yes", "yes\n")])
        self.assertTrue(foreign.is_symlink())
        backups = list(self.skills.glob("ui.backup-*"))
        self.assertEqual(len(backups), 1)
        self.assertEqual((backups[0] / "mine").read_text(), "keep me")

    def test_tampered_state_cannot_remove_unrelated_user_link(self):
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        unrelated = self.home / "work/ui"
        unrelated.parent.mkdir()
        unrelated.symlink_to(self.source / "skill/ui", target_is_directory=True)
        with self.state.open("a") as stream:
            stream.write("link\t" + str(unrelated) + "\t" + str(self.source / "skill/ui") + "\n")
        self.assert_success(self.invoke(action="uninstall"))
        self.assertTrue(unrelated.is_symlink())

    def test_mutation_lock_is_respected(self):
        lock = Path(str(self.state) + ".lock")
        lock.mkdir(parents=True)
        result = self.invoke(["orchestrate"] + self.skip_flags())
        self.assertNotEqual(result.returncode, 0)
        self.assertTrue(lock.is_dir())
        self.assertFalse(self.state.exists())
        self.assertEqual(self.names(), set())

    def test_legacy_local_state_import_preserves_unselected_source(self):
        old = self.home / "old-dotfiles"
        shutil.copytree(self.source, old)
        self.skills.mkdir(parents=True)
        (self.skills / "ui").symlink_to(old / "skill" / "ui", target_is_directory=True)
        self.state_base.mkdir(parents=True, exist_ok=True)
        legacy = self.state_base / "local-install-state"
        legacy.write_text("dotfiles-local-lifecycle-state-v1\nsource\t" + str(old) +
                          "\nlink\t" + str(self.skills / "ui") + "\t" + str(old / "skill" / "ui") + "\n")
        original = legacy.read_bytes()
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        self.assertEqual(self.names(), ORCHESTRATE | {"ui"})
        self.assertEqual((self.skills / "ui").resolve(), old / "skill" / "ui")
        self.assertEqual(legacy.read_bytes(), original)
        self.assert_success(self.invoke(action="uninstall"))
        self.assertFalse((self.skills / "ui").is_symlink())
        self.assertTrue((old / "skill" / "ui" / "SKILL.md").exists())

    def test_legacy_directory_link_preserves_existing_skills(self):
        self.skills.parent.mkdir(parents=True)
        self.skills.symlink_to(self.source / "skill", target_is_directory=True)
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        self.assertTrue((self.skills / "ui" / "SKILL.md").exists())
        self.assertTrue((self.source / "skill" / "ui" / "SKILL.md").exists())
        self.assertTrue((self.source / "skill" / "orchestrate" / "SKILL.md").exists())

    def test_foreign_skill_directory_link_blocks_unattended_install(self):
        foreign = self.base / "foreign"
        foreign.mkdir()
        (foreign / "keep.txt").write_text("keep")
        self.skills.parent.mkdir(parents=True)
        self.skills.symlink_to(foreign, target_is_directory=True)
        result = self.invoke(["ui"] + self.skip_flags())
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("foreign destinations block unattended installation", result.stdout + result.stderr)
        self.assertTrue(self.skills.is_symlink())
        self.assertEqual(sorted(p.name for p in foreign.iterdir()), ["keep.txt"])

    def test_missing_recorded_source_is_dropped_and_its_links_preserved(self):
        other = self.base / "other"
        shutil.copytree(self.source, other, symlinks=True)
        self.assert_success(self.invoke(["ui"] + self.skip_flags(), script=other / ("scripts/install.sh" if self.runtime == "bash" else "install.ps1")))
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags()))
        shutil.rmtree(other)
        result = self.invoke(["orchestrate"] + self.skip_flags())
        self.assert_success(result)
        self.assertIn("lifecycle source is unavailable or invalid", result.stderr)
        self.assert_success(self.invoke(action="uninstall"))
        self.assertEqual(self.names(), {"ui"})
        self.assertTrue((self.skills / "ui").is_symlink())

    def test_remote_fixture_preview_install_and_corrupt_update(self):
        if not self.release:
            self.skipTest("requires DOTFILES_TEST_RELEASE_DIR built artifact")
        release = Path(self.release).resolve()
        version = (release / "VERSION").read_text().strip()
        base_url, immutable = self.serve_release()
        remote = release / ("install.sh" if self.runtime == "bash" else "install.ps1")
        options = ["orchestrate"] + self.skip_flags()
        dry = "--dry-run" if self.runtime == "bash" else "-DryRun"
        self.assert_success(self.invoke(options + [dry], script=remote, env={"DOTFILES_BASE_URL": base_url}))
        cache = Path(self.env["XDG_DATA_HOME"]) / "dotfiles"
        self.assertFalse(cache.exists())
        self.assertFalse(self.state.exists())
        self.assert_success(self.invoke(options, script=remote, env={"DOTFILES_BASE_URL": base_url}))
        self.assertEqual(self.names(), ORCHESTRATE)
        self.assertEqual((cache / "VERSION").read_text().strip(), version)
        for name in ORCHESTRATE:
            self.assertEqual((self.skills / name).resolve(), (cache / "skill" / name).resolve())
        before = (cache / "VERSION").read_bytes()
        suffix = ".zip" if self.runtime == "powershell" else ".tar.gz"
        (immutable / ("dotfiles-" + version + suffix)).write_bytes(b"corrupt archive")
        result = self.invoke(options, script=remote, env={"DOTFILES_BASE_URL": base_url})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual((cache / "VERSION").read_bytes(), before)
        self.assertEqual(self.names(), ORCHESTRATE)

    def test_remote_refreshes_contents_when_links_are_unchanged(self):
        if not self.release:
            self.skipTest("requires DOTFILES_TEST_RELEASE_DIR built artifact")
        from scripts import package_release
        base_url, first = self.serve_release()
        remote = Path(self.release) / ("install.sh" if self.runtime == "bash" else "install.ps1")
        env = {"DOTFILES_BASE_URL": base_url}
        self.assert_success(self.invoke(["ui"] + self.skip_flags(), script=remote, env=env))
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags(), script=remote, env=env))
        cache = Path(self.env["XDG_DATA_HOME"]) / "dotfiles"
        (self.source / "skill/ui/SKILL.md").write_text("# Updated unrequested skill\n")
        version = "f" * 40
        second = first.parent / version
        package_release.build_release(version, second, source=self.source, use_git=False)
        env["DOTFILES_VERSION"] = version
        dry = "--dry-run" if self.runtime == "bash" else "-DryRun"
        before = self.state.read_bytes()
        self.assert_success(self.invoke(["orchestrate", dry] + self.skip_flags(), script=remote, env=env))
        self.assertNotEqual((cache / "VERSION").read_text().strip(), version)
        self.assertEqual(self.state.read_bytes(), before)
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags(), script=remote, env=env))
        self.assertEqual((cache / "VERSION").read_text().strip(), version)
        self.assertEqual((self.skills / "ui/SKILL.md").read_text(), "# Updated unrequested skill\n")
        self.assertEqual(self.names(), ORCHESTRATE | {"ui"})
        self.assert_success(self.invoke(["uninstall"], script=remote, env=env))
        self.assertEqual(self.names(), set())
        self.assertTrue((cache / "VERSION").is_file())

    def test_full_install_prunes_removed_managed_skill_only(self):
        obsolete = self.source / "skill/obsolete-skill"
        obsolete.mkdir()
        (obsolete / "SKILL.md").write_text("# Obsolete\n")
        self.assert_success(self.invoke(["obsolete-skill"] + self.skip_flags()))
        shutil.rmtree(obsolete)
        foreign = self.skills / "private-skill"
        foreign.mkdir()
        (foreign / "SKILL.md").write_text("# Private\n")
        self.assert_success(self.invoke(self.skip_flags()))
        self.assertFalse((self.skills / "obsolete-skill").is_symlink())
        self.assertTrue((foreign / "SKILL.md").is_file())

    def test_remote_rejects_unsafe_archives_before_cache_activation(self):
        if not self.release:
            self.skipTest("requires DOTFILES_TEST_RELEASE_DIR built artifact")
        import hashlib
        import io
        base_url, immutable = self.serve_release()
        version = (immutable / "VERSION").read_text().strip()
        suffix = ".tar.gz" if self.runtime == "bash" else ".zip"
        asset = "dotfiles-" + version + suffix
        buffer = io.BytesIO()
        if self.runtime == "bash":
            with tarfile.open(fileobj=buffer, mode="w:gz") as archive:
                info = tarfile.TarInfo("dotfiles/../../escaped.txt")
                info.size = 4
                archive.addfile(info, io.BytesIO(b"evil"))
        else:
            with zipfile.ZipFile(buffer, "w") as archive:
                archive.writestr("dotfiles/../../escaped.txt", "evil")
        content = buffer.getvalue()
        (immutable / asset).write_bytes(content)
        (immutable / "SHA256SUMS").write_text(hashlib.sha256(content).hexdigest() + "  " + asset + "\n")
        remote = Path(self.release) / ("install.sh" if self.runtime == "bash" else "install.ps1")
        result = self.invoke(["orchestrate"] + self.skip_flags(), script=remote, env={"DOTFILES_BASE_URL": base_url})
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.state.exists())
        self.assertFalse((Path(self.env["XDG_DATA_HOME"]) / "dotfiles").exists())
        self.assertFalse((self.base / "escaped.txt").exists())

    @unittest.skipUnless(shutil.which("git"), "Git required for legacy clone fixture")
    def test_legacy_managed_checkout_migration_preserves_git_and_backups(self):
        old = self.home / "custom-legacy-dotfiles"
        shutil.copytree(self.source, old)
        subprocess.run(["git", "init", "-q", str(old)], check=True)
        subprocess.run(["git", "-C", str(old), "remote", "add", "origin",
                        "https://github.com/rafaeelricco/dotfiles.git"], check=True)
        (old / "valuable-local-edit").write_text("preserve checkout")
        self.skills.mkdir(parents=True)
        link = self.skills / "ui"
        link.symlink_to(old / "skill/ui", target_is_directory=True)
        legacy = old / ".git/dotfiles-lifecycle-state"
        legacy.write_text("dotfiles-lifecycle-state-v1\nlink\t" + str(link) + "\t" + str(old / "skill/ui") + "\n")
        original = legacy.read_bytes()
        env = {"DOTFILES_DIR": str(old)}
        self.assert_success(self.invoke(["orchestrate"] + self.skip_flags(), env=env))
        self.assertEqual(self.names(), ORCHESTRATE | {"ui"})
        self.assert_success(self.invoke(action="uninstall", env=env))
        self.assertFalse(link.is_symlink())
        self.assertEqual(legacy.read_bytes(), original)
        self.assertEqual((old / "valuable-local-edit").read_text(), "preserve checkout")

    def test_short_public_command_installs_orchestrate(self):
        if not self.release:
            self.skipTest("requires DOTFILES_TEST_RELEASE_DIR built artifact")
        base_url, _immutable = self.serve_release()
        env = self.env.copy()
        env["DOTFILES_BASE_URL"] = base_url
        suffix = ".ps1" if self.runtime == "powershell" else ""
        env["DOTFILES_TEST_URL"] = base_url.removesuffix("/dotfiles") + "/skills/orchestrate" + suffix
        if self.runtime == "bash":
            command = [BASH, "-c", 'set -o pipefail; curl -fsSL "$DOTFILES_TEST_URL" | bash']
        else:
            command = [PWSH, "-NoLogo", "-NoProfile", "-NonInteractive", "-Command",
                       "$PROFILE = $env:DOTFILES_TEST_PROFILE; "
                       "Invoke-RestMethod $env:DOTFILES_TEST_URL | Invoke-Expression"]
        result = subprocess.run(command, env=env, input="", text=True, capture_output=True, timeout=90)
        self.assert_success(result)
        self.assertEqual(self.names(), ORCHESTRATE)


@unittest.skipIf(os.name == "nt" or not BASH, "native POSIX Bash required")
class BashInstallers(LifecycleCases, unittest.TestCase):
    def test_symlinked_agent_home_uninstalls_its_links(self):
        actual = self.home / "actual-claude"
        actual.mkdir()
        (self.home / ".claude").symlink_to(actual, target_is_directory=True)
        (self.bin / "claude").write_text("#!/bin/sh\nexit 0\n")
        (self.bin / "claude").chmod(0o755)
        self.assert_success(self.invoke(["ui"]))
        self.assertTrue((actual / "skills/ui").is_symlink())
        self.assert_success(self.invoke(action="uninstall"))
        self.assertFalse((actual / "skills/ui").is_symlink())
        self.assertTrue((self.home / ".claude").is_symlink())

    def test_full_install_directory_link_migration_drops_obsolete_skill(self):
        old = self.home / "old-dotfiles"
        shutil.copytree(self.source, old)
        (old / "skill/obsolete-skill").mkdir()
        (old / "skill/obsolete-skill/SKILL.md").write_text("# Obsolete\n")
        self.skills.parent.mkdir(parents=True)
        self.skills.symlink_to(old / "skill", target_is_directory=True)
        self.state_base.mkdir(parents=True, exist_ok=True)
        (self.state_base / "local-install-state").write_text(
            "dotfiles-local-lifecycle-state-v1\nsource\t" + str(old) + "\n")
        self.assert_success(self.invoke(self.skip_flags()))
        self.assertFalse(self.skills.is_symlink())
        self.assertNotIn("obsolete-skill", self.names())
        self.assertEqual((self.skills / "ui").resolve(), (self.source / "skill/ui").resolve())

    def test_uninstall_removes_links_under_external_agent_homes(self):
        external = Path(tempfile.mkdtemp(prefix="dotfiles-external-")).resolve()
        self.addCleanup(shutil.rmtree, external, ignore_errors=True)
        for name in (".agents", ".cursor"):
            (external / name).mkdir()
            (self.home / name).symlink_to(external / name, target_is_directory=True)
        self.assert_success(self.invoke(["ui", "--skip-claude", "--skip-grok", "--skip-hermes"]))
        for name in (".agents", ".cursor"):
            self.assertTrue((external / name / "skills/ui").is_symlink())
        result = self.invoke(action="uninstall")
        self.assert_success(result)
        for name in (".agents", ".cursor"):
            self.assertFalse((external / name / "skills/ui").is_symlink(), result.stdout)

    def test_termination_signal_exits_while_holding_lock(self):
        script = self.base / "locker.sh"
        script.write_text("set -eo pipefail\n. " + shlex.quote(str(REPO / "scripts/lib/lifecycle.sh")) +
                          "\ndotfiles_lock\nsleep 2\necho CONTINUED\n")
        lock = self.state_base / "install-state.lock"
        for sig, code in ((signal.SIGTERM, 143), (signal.SIGHUP, 129)):
            with self.subTest(signal=sig.name):
                proc = subprocess.Popen([BASH, str(script)], env=self.env, text=True,
                                        stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                deadline = time.monotonic() + 10
                while not lock.is_dir() and time.monotonic() < deadline:
                    time.sleep(0.05)
                self.assertTrue(lock.is_dir())
                proc.send_signal(sig)
                out, err = proc.communicate(timeout=10)
                self.assertNotIn("CONTINUED", out, err)
                self.assertEqual(proc.returncode, code, out + err)
                self.assertFalse(lock.exists())


@unittest.skipUnless(PWSH, "PowerShell 7 runtime unavailable")
class PowerShellInstallers(LifecycleCases, unittest.TestCase):
    runtime = "powershell"

    def test_terminal_deltas_restore_missing_values_and_preserve_user_edits(self):
        settings = Path(self.env["LOCALAPPDATA"]) / "Microsoft/Windows Terminal/settings.json"
        settings.parent.mkdir(parents=True)
        for original, edit in [({}, False), ({"profiles": {"defaults": {"background": "#abcdef"}},
                                              "actions": [{"keys": "ctrl+shift+t", "command": "newTab"}]}, True)]:
            with self.subTest(edit=edit):
                settings.write_text(json.dumps(original))
                env = self.env.copy()
                env["DOTFILES_TEST_SETTINGS"] = str(settings)
                env["DOTFILES_TEST_EDIT"] = "yes" if edit else "no"
                env["DOTFILES_TEST_HELPER"] = str(self.source / "scripts/lib/lifecycle.ps1")
                result = subprocess.run([PWSH, "-NoProfile", "-NonInteractive", "-Command",
                    "$ErrorActionPreference='Stop'; $PROFILE=$env:DOTFILES_TEST_PROFILE; "
                    ". $env:DOTFILES_TEST_HELPER; $state=New-DotfilesState; "
                    "Merge-DotfilesTerminalSettings -Path $env:DOTFILES_TEST_SETTINGS -State $state; "
                    "if($env:DOTFILES_TEST_EDIT -eq 'yes'){ "
                    "$settings=Get-Content $env:DOTFILES_TEST_SETTINGS -Raw|ConvertFrom-Json -AsHashtable; "
                    "$settings.profiles.defaults.background='#123456'; "
                    "Write-DotfilesTerminalSettings $env:DOTFILES_TEST_SETTINGS $settings }; "
                    "Undo-DotfilesTerminalDeltas $state"], env=env, capture_output=True, text=True, timeout=30)
                self.assert_success(result)
                expected = json.loads(json.dumps(original))
                if edit: expected["profiles"]["defaults"]["background"] = "#123456"
                self.assertEqual(json.loads(settings.read_text()), expected)

    @unittest.skipUnless(os.name == "nt", "Windows Terminal integration requires Windows")
    def test_terminal_original_values_restored_and_profile_retained(self):
        settings_path = Path(self.env["LOCALAPPDATA"]) / "Microsoft" / "Windows Terminal" / "settings.json"
        settings_path.parent.mkdir(parents=True)
        original = {"profiles": {"defaults": {"background": "#abcdef"}},
                    "actions": [{"keys": "ctrl+shift+t", "command": "newTab"}]}
        settings_path.write_text(json.dumps(original))
        flags = [flag for flag in self.skip_flags() if flag != "-SkipTerminal"]
        self.assert_success(self.invoke(flags))
        self.assertEqual(json.loads(settings_path.read_text())["profiles"]["defaults"]["background"], "#141414")
        self.assert_success(self.invoke(action="uninstall"))
        self.assertEqual(json.loads(settings_path.read_text()), original)
        self.assertTrue(Path(self.env["DOTFILES_TEST_PROFILE"]).is_file())
        self.assertFalse((Path(self.env["DOTFILES_TEST_PROFILE"]).parent / "themes/robbyrussell.omp.json").is_symlink())


if __name__ == "__main__":
    unittest.main()
