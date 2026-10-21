#!/usr/bin/env python3
"""Validate and publish one immutable dotfiles release, then smoke-test it."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
import tarfile
from pathlib import Path, PurePosixPath


VERSION_RE = re.compile(r"^[0-9a-f]{40}$")
SHA_RE = re.compile(r"^[0-9a-f]{64}$")
SKILL_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SCHEMA = 1
STATE_NAME = ".dotfiles-deploy-state.json"
LOCK_NAME = ".dotfiles-deploy.lock"
MAX_SMOKE_BYTES = 2 * 1024 * 1024
DEFAULT_BASE_URL = "https://r1cco.com"


class DeploymentError(Exception):
    """An invalid artifact or deployment state transition."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _safe_relative(name: str) -> bool:
    parts = name.split("/")
    path = PurePosixPath(name)
    return (
        bool(name)
        and not path.is_absolute()
        and all(part not in {"", ".", ".."} for part in parts)
        and "\\" not in name
        and "\x00" not in name
    )


def _read_regular(path: Path, label: str) -> bytes:
    try:
        mode = path.lstat().st_mode
    except OSError as exc:
        raise DeploymentError(f"missing {label}: {exc}") from exc
    if not stat.S_ISREG(mode):
        raise DeploymentError(f"{label} must be a regular file")
    try:
        return path.read_bytes()
    except OSError as exc:
        raise DeploymentError(f"cannot read {label}: {exc}") from exc


def _walk_artifact(root: Path) -> dict[str, Path]:
    try:
        mode = root.lstat().st_mode
    except OSError as exc:
        raise DeploymentError(f"release artifact directory is not readable: {exc}") from exc
    if not stat.S_ISDIR(mode):
        raise DeploymentError("release artifact must be a real directory, not a symlink")
    files: dict[str, Path] = {}
    for current, dirs, names in os.walk(root, followlinks=False):
        current_path = Path(current)
        for dirname in list(dirs):
            candidate = current_path / dirname
            if not stat.S_ISDIR(candidate.lstat().st_mode):
                raise DeploymentError(f"artifact path is not a regular directory: {candidate.relative_to(root)}")
        for filename in names:
            candidate = current_path / filename
            relative = candidate.relative_to(root).as_posix()
            if not _safe_relative(relative):
                raise DeploymentError(f"unsafe artifact path: {relative!r}")
            if not stat.S_ISREG(candidate.lstat().st_mode):
                raise DeploymentError(f"artifact path is not a regular file: {relative}")
            files[relative] = candidate
    return files


def _archive_entries(path: Path, kind: str, version: str) -> tuple[dict[str, bytes], dict[str, int]]:
    entries: dict[str, bytes] = {}
    modes: dict[str, int] = {}
    try:
        if kind == "zip":
            with zipfile.ZipFile(path) as archive:
                members = archive.infolist()
                for info in members:
                    name = info.filename
                    full_mode = (info.external_attr >> 16) & 0xFFFF
                    if not _safe_relative(name) or not name.startswith("dotfiles/") or name.endswith("/"):
                        raise DeploymentError(f"unsafe ZIP member: {name!r}")
                    if not stat.S_ISREG(full_mode):
                        raise DeploymentError(f"non-regular ZIP member: {name}")
                    if name in entries:
                        raise DeploymentError(f"duplicate ZIP member: {name}")
                    entries[name] = archive.read(info)
                    modes[name] = stat.S_IMODE(full_mode)
        else:
            with tarfile.open(path, mode="r:gz") as archive:
                for member in archive.getmembers():
                    name = member.name
                    if not _safe_relative(name) or not name.startswith("dotfiles/") or not member.isreg():
                        raise DeploymentError(f"unsafe TAR member: {name!r}")
                    if name in entries:
                        raise DeploymentError(f"duplicate TAR member: {name}")
                    stream = archive.extractfile(member)
                    if stream is None:
                        raise DeploymentError(f"cannot read TAR member: {name}")
                    entries[name] = stream.read()
                    modes[name] = stat.S_IMODE(member.mode)
    except DeploymentError:
        raise
    except (OSError, ValueError, zipfile.BadZipFile, tarfile.TarError) as exc:
        raise DeploymentError(f"invalid {kind.upper()} archive: {exc}") from exc
    if not entries:
        raise DeploymentError(f"{kind.upper()} archive is empty")
    prefix = "dotfiles/"
    if any(not name.startswith(prefix) for name in entries):
        raise DeploymentError(f"{kind.upper()} archive has a path outside dotfiles/")
    try:
        archived_version = entries[prefix + "VERSION"].decode("ascii").strip()
    except (KeyError, UnicodeDecodeError) as exc:
        raise DeploymentError(f"{kind.upper()} archive has no valid dotfiles/VERSION") from exc
    if archived_version != version:
        raise DeploymentError(f"{kind.upper()} archive VERSION does not match the release")
    return entries, modes


def _runtime_path_allowed(name: str, skills: list[str]) -> bool:
    path = PurePosixPath(name)
    parts = path.parts
    if name in {"VERSION", "INSTRUCTIONS.md", "install.ps1", "update.ps1", "uninstall.ps1", "skill/dependencies.txt"}:
        return True
    if any(part in {
        ".git", "tests", "evals", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox", ".nox",
        ".venv", "venv", "node_modules", "build", "dist", "htmlcov",
    } for part in parts):
        return False
    if path.suffix in {".pyc", ".pyo"}:
        return False
    if len(parts) >= 3 and parts[0] == "skill":
        return parts[1] in skills and path.name != ".gitignore"
    if name in {
        "powershell/Microsoft.PowerShell_profile.ps1", "powershell/required_config.json",
        "powershell/themes/robbyrussell.omp.json",
        "scripts/install.sh", "scripts/update.sh", "scripts/uninstall.sh",
        "scripts/remote.sh", "scripts/remote.ps1",
        "scripts/lib/lifecycle.sh", "scripts/lib/lifecycle.ps1",
        "scripts/install-maestro.sh", "scripts/uninstall-maestro.sh",
        "scripts/mcp/install-mcp.sh", "scripts/mcp/install-mcp.ps1",
        "scripts/windows/setup-wsl-node.sh", "scripts/windows/system-cleanup.bat",
        "scripts/windows/wsl_dev_env", "scripts/macos/colima.yaml",
        "scripts/macos/system-cleanup.sh", "scripts/macos/setup-colima.sh",
    }:
        return True
    return False


def validate_artifact(artifact: Path) -> dict[str, object]:
    artifact = artifact.absolute()
    files = _walk_artifact(artifact)
    version_bytes = _read_regular(files.get("VERSION", artifact / "VERSION"), "VERSION")
    try:
        version = version_bytes.decode("ascii").strip()
    except UnicodeDecodeError as exc:
        raise DeploymentError("VERSION must be ASCII") from exc
    if not VERSION_RE.fullmatch(version) or version_bytes != (version + "\n").encode("ascii"):
        raise DeploymentError("VERSION must be exactly one lowercase 40-character commit SHA plus newline")

    manifest_bytes = _read_regular(files.get("MANIFEST.json", artifact / "MANIFEST.json"), "MANIFEST.json")
    try:
        manifest = json.loads(manifest_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DeploymentError(f"MANIFEST.json is invalid JSON: {exc}") from exc
    if not isinstance(manifest, dict) or manifest.get("schema") != SCHEMA or manifest.get("version") != version:
        raise DeploymentError("MANIFEST.json schema or version does not match VERSION")
    skills = manifest.get("skills")
    if not isinstance(skills, list) or not skills or any(not isinstance(name, str) for name in skills):
        raise DeploymentError("MANIFEST.json skills must be a non-empty list of names")
    if skills != sorted(set(skills)):
        raise DeploymentError("MANIFEST.json skills must be a sorted unique list")
    if any(not SKILL_RE.fullmatch(name) for name in skills):
        raise DeploymentError("MANIFEST.json contains an invalid skill name")

    archives = manifest.get("archives")
    expected_archive_names = {f"dotfiles-{version}.tar.gz", f"dotfiles-{version}.zip"}
    if not isinstance(archives, dict) or set(archives) != expected_archive_names:
        raise DeploymentError("MANIFEST.json must list exactly this release's tar.gz and zip archives")
    archive_hashes: dict[str, str] = {}
    for name, digest in archives.items():
        if not isinstance(digest, str) or not SHA_RE.fullmatch(digest):
            raise DeploymentError(f"MANIFEST.json has an invalid archive digest for {name}")
        data = _read_regular(files.get(name, artifact / name), name)
        if sha256(data) != digest:
            raise DeploymentError(f"archive digest does not match MANIFEST.json: {name}")
        archive_hashes[name] = digest

    sums = _read_regular(files.get("SHA256SUMS", artifact / "SHA256SUMS"), "SHA256SUMS")
    expected_sums = "".join(f"{archive_hashes[name]}  {name}\n" for name in sorted(archive_hashes)).encode("ascii")
    if sums != expected_sums:
        raise DeploymentError("SHA256SUMS does not exactly match the two archive digests")

    launchers = manifest.get("launchers")
    if not isinstance(launchers, dict):
        raise DeploymentError("MANIFEST.json launchers must be an object")
    expected_launcher_names = {
        "install.sh", "install.ps1", "update.sh", "update.ps1", "uninstall.sh", "uninstall.ps1",
        *(f"skills/{skill}" for skill in skills),
        *(f"skills/{skill}.ps1" for skill in skills),
    }
    if set(launchers) != expected_launcher_names:
        raise DeploymentError("MANIFEST.json must list every expected bootstrap and skill launcher")
    for name, digest in launchers.items():
        if not isinstance(name, str) or not _safe_relative(name) or not isinstance(digest, str) or not SHA_RE.fullmatch(digest):
            raise DeploymentError(f"MANIFEST.json has an invalid launcher entry: {name!r}")
        data = _read_regular(files.get(name, artifact.joinpath(*PurePosixPath(name).parts)), name)
        if sha256(data) != digest:
            raise DeploymentError(f"launcher digest does not match MANIFEST.json: {name}")
        if b"__DOTFILES_RELEASE__" in data or b"__DOTFILES_SKILLS__" in data:
            raise DeploymentError(f"launcher contains an unresolved release placeholder: {name}")
        if version.encode("ascii") not in data:
            raise DeploymentError(f"launcher does not pin the current release: {name}")

    expected_files = {
        "VERSION", "SHA256SUMS", "MANIFEST.json", *expected_archive_names, *expected_launcher_names,
    }
    if set(files) != expected_files:
        extra = sorted(set(files) - expected_files)
        missing = sorted(expected_files - set(files))
        raise DeploymentError(f"artifact file set is not exact (extra={extra}, missing={missing})")

    tar_entries, tar_modes = _archive_entries(artifact / f"dotfiles-{version}.tar.gz", "tar", version)
    zip_entries, zip_modes = _archive_entries(artifact / f"dotfiles-{version}.zip", "zip", version)
    if tar_entries != zip_entries:
        raise DeploymentError("tar.gz and ZIP archives do not contain identical files")
    if tar_modes != zip_modes:
        raise DeploymentError("tar.gz and ZIP archives do not contain identical file modes")
    try:
        runtime_manifest_bytes = tar_entries["dotfiles/RUNTIME-MANIFEST.json"]
        runtime_manifest = json.loads(runtime_manifest_bytes)
    except (KeyError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DeploymentError(f"archive runtime manifest is missing or invalid: {exc}") from exc
    if not isinstance(runtime_manifest, dict) or runtime_manifest.get("schema") != SCHEMA or runtime_manifest.get("version") != version:
        raise DeploymentError("archive runtime manifest schema or version does not match")
    if sha256(runtime_manifest_bytes) != manifest.get("runtime_manifest_sha256"):
        raise DeploymentError("archive runtime manifest digest does not match MANIFEST.json")
    runtime_files = runtime_manifest.get("files")
    if not isinstance(runtime_files, list):
        raise DeploymentError("archive runtime manifest files must be a list")
    expected_runtime: dict[str, dict[str, object]] = {}
    for item in runtime_files:
        if not isinstance(item, dict):
            raise DeploymentError("archive runtime manifest contains a malformed file record")
        name, digest, size, mode = item.get("path"), item.get("sha256"), item.get("size"), item.get("mode")
        if not isinstance(name, str) or not _safe_relative(name) or name in expected_runtime:
            raise DeploymentError(f"archive runtime manifest contains an unsafe or duplicate path: {name!r}")
        if not _runtime_path_allowed(name, skills):
            raise DeploymentError(f"archive runtime manifest contains a non-runtime path: {name}")
        if not isinstance(digest, str) or not SHA_RE.fullmatch(digest) or not isinstance(size, int) or size < 0:
            raise DeploymentError(f"archive runtime manifest has invalid metadata for {name}")
        if not isinstance(mode, str) or mode not in {"0644", "0755"}:
            raise DeploymentError(f"archive runtime manifest has an invalid mode for {name}")
        expected_runtime[name] = {"sha256": digest, "size": size, "mode": mode}
    actual_runtime_names = set(tar_entries) - {"dotfiles/RUNTIME-MANIFEST.json"}
    expected_prefixed = {"dotfiles/" + name for name in expected_runtime}
    if actual_runtime_names != expected_prefixed:
        raise DeploymentError("archive files do not exactly match RUNTIME-MANIFEST.json")
    for name, record in expected_runtime.items():
        content = tar_entries["dotfiles/" + name]
        if len(content) != record["size"] or sha256(content) != record["sha256"]:
            raise DeploymentError(f"runtime file digest or size mismatch: {name}")
        expected_mode = int(record["mode"], 8)
        if tar_modes["dotfiles/" + name] != expected_mode:
            raise DeploymentError(f"runtime file mode does not match manifest: {name}")
    if tar_modes.get("dotfiles/RUNTIME-MANIFEST.json") != 0o644:
        raise DeploymentError("runtime manifest must be a regular non-executable archive file")
    manifest_skill_names = {
        name[len("skill/") : -len("/SKILL.md")]
        for name in expected_runtime
        if name.startswith("skill/") and name.endswith("/SKILL.md")
    }
    if manifest_skill_names != set(skills):
        raise DeploymentError("runtime SKILL.md inventory does not match MANIFEST.json skills")
    if expected_runtime.get("VERSION", {}).get("sha256") != sha256(version_bytes):
        raise DeploymentError("runtime manifest does not record this release's VERSION")
    if expected_runtime.get("VERSION", {}).get("size") != len(version_bytes):
        raise DeploymentError("runtime manifest VERSION size is invalid")

    return {
        "version": version,
        "manifest": manifest,
        "files": files,
        "runtime_manifest": runtime_manifest,
        "runtime_entries": tar_entries,
    }


def _tree_digests(path: Path) -> dict[str, str]:
    if not path.is_dir() or path.is_symlink():
        raise DeploymentError(f"immutable release path is not a real directory: {path}")
    result: dict[str, str] = {}
    for current, dirs, names in os.walk(path, followlinks=False):
        current_path = Path(current)
        for dirname in dirs:
            candidate = current_path / dirname
            if not stat.S_ISDIR(candidate.lstat().st_mode):
                raise DeploymentError(f"existing immutable release contains a non-directory path: {candidate}")
        for name in names:
            candidate = current_path / name
            relative = candidate.relative_to(path).as_posix()
            if not _safe_relative(relative) or not stat.S_ISREG(candidate.lstat().st_mode):
                raise DeploymentError(f"existing immutable release contains an unsafe path: {relative}")
            result[relative] = sha256(candidate.read_bytes())
    return result


def _artifact_digests(validation: dict[str, object]) -> dict[str, str]:
    root_files: dict[str, Path] = validation["files"]  # type: ignore[assignment]
    return {name: sha256(path.read_bytes()) for name, path in sorted(root_files.items())}


def _read_state(root: Path) -> dict[str, object] | None:
    path = root / STATE_NAME
    if not path.exists() and not path.is_symlink():
        return None
    data = _read_regular(path, STATE_NAME)
    try:
        state = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise DeploymentError(f"deployment state is invalid JSON: {exc}") from exc
    if (
        not isinstance(state, dict)
        or state.get("schema") != SCHEMA
        or not isinstance(state.get("latest_run_number"), int)
        or state["latest_run_number"] < 1
        or not isinstance(state.get("latest_sha"), str)
        or not VERSION_RE.fullmatch(state["latest_sha"])
    ):
        raise DeploymentError("deployment state has an invalid schema or comparison record")
    return state


def _write_state(root: Path, run_number: int, version: str) -> None:
    data = (json.dumps({"schema": SCHEMA, "latest_run_number": run_number, "latest_sha": version}, sort_keys=True, separators=(",", ":")) + "\n").encode()
    fd, raw = tempfile.mkstemp(prefix=".dotfiles-deploy-state-", dir=root)
    temporary = Path(raw)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
            stream.flush()
            os.fsync(stream.fileno())
        os.chmod(temporary, 0o644)
        os.replace(temporary, root / STATE_NAME)
    except BaseException:
        temporary.unlink(missing_ok=True)
        raise


def _base_url(value: str) -> str:
    parsed = urllib.parse.urlsplit(value)
    if parsed.scheme not in {"https", "http"} or not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise DeploymentError("--base-url must be an HTTPS origin (or localhost HTTP fixture) without credentials, query, or fragment")
    if parsed.path not in {"", "/"}:
        raise DeploymentError("--base-url must be the site origin, without a path")
    if parsed.scheme == "http" and parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise DeploymentError("plain HTTP is allowed only for loopback smoke fixtures")
    return value.rstrip("/")


def _fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "dotfiles-release-smoke/1"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            if response.status != 200:
                raise DeploymentError(f"smoke request returned HTTP {response.status}: {url}")
            data = response.read(MAX_SMOKE_BYTES + 1)
            if len(data) > MAX_SMOKE_BYTES:
                raise DeploymentError(f"smoke response is unexpectedly large: {url}")
            return data
    except urllib.error.HTTPError as exc:
        raise DeploymentError(f"smoke request returned HTTP {exc.code}: {url}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise DeploymentError(f"smoke request failed for {url}: {exc}") from exc


def _expect_404(url: str) -> None:
    request = urllib.request.Request(url, headers={"User-Agent": "dotfiles-release-smoke/1"})
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            raise DeploymentError(f"unknown skill endpoint unexpectedly returned HTTP {response.status}: {url}")
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise DeploymentError(f"unknown skill endpoint returned HTTP {exc.code}, expected 404: {url}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise DeploymentError(f"unknown-skill smoke request failed for {url}: {exc}") from exc


def smoke_test(base_url: str, root: Path, version: str, validation: dict[str, object]) -> None:
    origin = _base_url(base_url)
    manifest: dict[str, object] = validation["manifest"]  # type: ignore[assignment]
    public_files: dict[str, Path] = validation["files"]  # type: ignore[assignment]

    # Current aliases and immutable release paths must both serve the exact
    # bytes that passed validation before they were copied to disk.
    current_paths = ["VERSION", "SHA256SUMS", "MANIFEST.json", "install.sh", "install.ps1", "update.sh", "update.ps1", "uninstall.sh", "uninstall.ps1"]
    skills: list[str] = manifest["skills"]  # type: ignore[assignment]
    short_skill = "orchestrate" if "orchestrate" in skills else skills[0]
    current_paths.append(f"skills/{short_skill}")
    for relative in current_paths:
        local = public_files[relative].read_bytes()
        remote = _fetch(f"{origin}/dotfiles/{relative}" if not relative.startswith("skills/") else f"{origin}/{relative}")
        if sha256(remote) != sha256(local):
            raise DeploymentError(f"current public endpoint differs from validated artifact: {relative}")
    immutable_version = _fetch(f"{origin}/dotfiles/releases/{version}/VERSION")
    if immutable_version != (version + "\n").encode("ascii"):
        raise DeploymentError("immutable release VERSION endpoint does not match the deployed SHA")
    _expect_404(f"{origin}/skills/dotfiles-smoke-unknown-{version[:12]}")


def _current_target(root: Path) -> str | None:
    current = root / "current"
    if not current.exists() and not current.is_symlink():
        return None
    try:
        mode = current.lstat().st_mode
    except OSError as exc:
        raise DeploymentError(f"cannot inspect current pointer: {exc}") from exc
    if not stat.S_ISLNK(mode):
        raise DeploymentError("current exists but is not a symlink; refusing to replace it")
    target = os.readlink(current)
    match = re.fullmatch(r"releases/([0-9a-f]{40})", target)
    if not match:
        raise DeploymentError(f"current symlink has an unexpected target: {target!r}")
    return target


def _atomic_current(root: Path, target: str | None) -> None:
    current = root / "current"
    if target is None:
        if current.is_symlink():
            current.unlink()
        elif current.exists():
            raise DeploymentError("current changed during rollback and is not a symlink")
        return
    temporary = root / f".current-{os.getpid()}-{time.time_ns()}"
    try:
        os.symlink(target, temporary)
        os.replace(temporary, current)
    finally:
        temporary.unlink(missing_ok=True)


def _acquire_lock(root: Path) -> Path:
    lock = root / LOCK_NAME
    try:
        lock.mkdir()
    except FileExistsError as exc:
        raise DeploymentError(f"deployment lock is already held: {lock}") from exc
    except OSError as exc:
        raise DeploymentError(f"cannot create deployment lock {lock}: {exc}") from exc
    return lock


def deploy_release(artifact: Path, root: Path, run_number: int, base_url: str = DEFAULT_BASE_URL) -> str:
    if run_number < 1:
        raise DeploymentError("--run-number must be a positive integer")
    validation = validate_artifact(artifact)
    version = validation["version"]
    root = root.absolute()
    if not root.parent.is_dir():
        raise DeploymentError(f"deployment parent must already exist: {root.parent}")
    if root.exists() and root.is_symlink():
        raise DeploymentError("deployment root must not be a symlink")
    if root.exists() and not root.is_dir():
        raise DeploymentError("deployment root must be a directory")
    root_was_present = root.exists()
    root.mkdir(exist_ok=True)
    if not root_was_present:
        os.chmod(root, 0o755)
    lock = _acquire_lock(root)
    stage: Path | None = None
    previous_target: str | None = None
    pointer_switched = False
    try:
        state = _read_state(root)
        if state is not None:
            latest_run = state["latest_run_number"]
            latest_sha = state["latest_sha"]
            if run_number < latest_run:
                raise DeploymentError(f"stale workflow run {run_number}; latest successful run is {latest_run}")
            if run_number == latest_run and version != latest_sha:
                raise DeploymentError("workflow run number already records a different release SHA")

        releases = root / "releases"
        if releases.exists() and (releases.is_symlink() or not releases.is_dir()):
            raise DeploymentError("releases must be a real directory")
        releases.mkdir(exist_ok=True)
        os.chmod(releases, 0o755)
        destination = releases / version
        expected_digests = _artifact_digests(validation)
        if destination.exists() or destination.is_symlink():
            if destination.is_symlink() or not destination.is_dir():
                raise DeploymentError(f"immutable release already exists as a non-directory: {destination}")
            if _tree_digests(destination) != expected_digests:
                raise DeploymentError(f"immutable release {version} already exists with different content")
        else:
            stage = Path(tempfile.mkdtemp(prefix=f".{version}.stage-", dir=releases))
            source_files: dict[str, Path] = validation["files"]  # type: ignore[assignment]
            for relative, source in sorted(source_files.items()):
                target = stage.joinpath(*PurePosixPath(relative).parts)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target, follow_symlinks=False)
                executable_launcher = relative.endswith(".sh") or (relative.startswith("skills/") and "." not in PurePosixPath(relative).name)
                os.chmod(target, 0o755 if executable_launcher else 0o644)
            for current, _dirs, _files in os.walk(stage, topdown=False):
                os.chmod(current, 0o755)
            # Do not rewrite a different same-SHA publication that raced us.
            try:
                os.rename(stage, destination)
            except FileExistsError:
                if _tree_digests(destination) != expected_digests:
                    raise DeploymentError(f"immutable release {version} was concurrently published with different content")
            stage = None

        previous_target = _current_target(root)
        new_target = f"releases/{version}"
        _atomic_current(root, new_target)
        pointer_switched = True
        try:
            smoke_test(base_url, root, version, validation)
            _write_state(root, run_number, version)
        except BaseException:
            _atomic_current(root, previous_target)
            pointer_switched = False
            raise
        return version
    finally:
        if stage is not None:
            shutil.rmtree(stage, ignore_errors=True)
        if pointer_switched:
            # The smoke and state write succeeded; the new pointer is durable.
            pass
        shutil.rmtree(lock, ignore_errors=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release", required=True, type=Path, help="downloaded public release artifact directory")
    parser.add_argument("--root", required=True, type=Path, help="deployment root containing current and releases")
    parser.add_argument("--run-number", required=True, type=int, help="monotonic GitHub Actions run number")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL, help="public site origin used for HTTPS smoke checks (localhost HTTP is allowed for tests)")
    args = parser.parse_args(argv)
    try:
        version = deploy_release(args.release, args.root, args.run_number, args.base_url)
    except DeploymentError as exc:
        parser.error(str(exc))
    print(f"deployed {version} (run {args.run_number}) to {args.root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
