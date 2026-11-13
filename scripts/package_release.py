#!/usr/bin/env python3
"""Build deterministic, self-describing dotfiles release artifacts."""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import os
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


VERSION_RE = re.compile(r"^[0-9a-f]{40}$")
SKILL_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
ROOT = Path(__file__).resolve().parents[1]
ROOT_FILES = {"INSTRUCTIONS.md", "install.ps1", "update.ps1", "uninstall.ps1"}
REQUIRED_RUNTIME = {
    "INSTRUCTIONS.md",
    "install.ps1",
    "update.ps1",
    "uninstall.ps1",
    "scripts/install.sh",
    "scripts/update.sh",
    "scripts/uninstall.sh",
    "scripts/remote.sh",
    "scripts/remote.ps1",
    "skill/dependencies.txt",
}


class ReleaseError(Exception):
    """An invalid source tree or release request."""


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _is_runtime_path(relative: str) -> bool:
    path = PurePosixPath(relative)
    parts = path.parts
    if not parts or path.is_absolute() or ".." in parts or "." in parts:
        return False
    if any(part in {
        ".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache", ".tox", ".nox",
        ".venv", "venv", "node_modules", "build", "dist", "htmlcov",
    } for part in parts):
        return False
    if path.suffix in {".pyc", ".pyo"}:
        return False
    if "tests" in parts or "evals" in parts:
        return False
    if relative in ROOT_FILES or relative == "skill/dependencies.txt":
        return True
    if parts[0] == "skill" and len(parts) >= 3:
        return path.name != ".gitignore"
    if relative in {
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


def _tracked_candidates(source: Path) -> tuple[list[str], dict[str, int]]:
    """Read tracked plus non-ignored worktree files, preserving tracked modes."""
    try:
        result = subprocess.run(
            ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
            cwd=source,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
    except (OSError, subprocess.CalledProcessError) as exc:
        raise ReleaseError(f"cannot enumerate source files with git ls-files: {exc}") from exc
    names = [item.decode("utf-8") for item in result.stdout.split(b"\0") if item]
    modes: dict[str, int] = {}
    try:
        mode_result = subprocess.run(
            ["git", "ls-files", "--stage", "-z"],
            cwd=source,
            check=True,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        for item in mode_result.stdout.split(b"\0"):
            if not item:
                continue
            head, raw_path = item.split(b"\t", 1)
            mode = int(head.split(b" ", 1)[0], 8)
            modes[raw_path.decode("utf-8")] = mode
    except (OSError, subprocess.CalledProcessError, ValueError):
        # Unstaged and fixture files still get a stable mode from the filesystem.
        pass
    return names, modes


def _filesystem_candidates(source: Path) -> list[str]:
    names: list[str] = []
    for current, dirs, files in os.walk(source, followlinks=False):
        dirs[:] = sorted(
            name for name in dirs
            if name not in {".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}
        )
        for name in sorted(files):
            path = Path(current, name)
            if path.is_symlink():
                continue
            names.append(path.relative_to(source).as_posix())
    return names


def _collect_runtime(source: Path, use_git: bool) -> tuple[dict[str, bytes], dict[str, int], list[str]]:
    if use_git:
        candidates, tracked_modes = _tracked_candidates(source)
    else:
        candidates, tracked_modes = _filesystem_candidates(source), {}

    files: dict[str, bytes] = {}
    modes: dict[str, int] = {}
    for name in sorted(set(candidates)):
        if not _is_runtime_path(name):
            continue
        path = source.joinpath(*PurePosixPath(name).parts)
        try:
            info = path.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode):
            raise ReleaseError(f"runtime source is a symlink: {name}")
        if not stat.S_ISREG(info.st_mode):
            continue
        try:
            content = path.read_bytes()
        except OSError as exc:
            raise ReleaseError(f"cannot read runtime file {name}: {exc}") from exc
        files[name] = content
        git_mode = tracked_modes.get(name)
        executable = (git_mode & 0o111) != 0 if git_mode is not None else (info.st_mode & 0o111) != 0
        modes[name] = 0o755 if executable else 0o644

    missing = sorted(REQUIRED_RUNTIME - files.keys())
    if missing:
        raise ReleaseError("runtime source is incomplete; missing: " + ", ".join(missing))
    return files, modes, candidates


def _skills_from_files(files: dict[str, bytes]) -> list[str]:
    skills = sorted(
        PurePosixPath(name).parts[1]
        for name in files
        if name.startswith("skill/") and len(PurePosixPath(name).parts) == 3 and PurePosixPath(name).name == "SKILL.md"
    )
    if not skills:
        raise ReleaseError("no skill/<name>/SKILL.md files found")
    invalid = [name for name in skills if not SKILL_RE.fullmatch(name)]
    if invalid:
        raise ReleaseError("skill directory names must be lowercase URL-safe slugs: " + ", ".join(invalid))
    return skills


def _render_remote(template: bytes, version: str, skills: str, label: str) -> bytes:
    try:
        text = template.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise ReleaseError(f"{label} is not UTF-8 text") from exc
    if "__DOTFILES_RELEASE__" not in text:
        raise ReleaseError(f"{label} is missing the __DOTFILES_RELEASE__ release placeholder")
    if "__DOTFILES_SKILLS__" not in text:
        raise ReleaseError(f"{label} is missing the __DOTFILES_SKILLS__ inventory placeholder")
    return text.replace("__DOTFILES_RELEASE__", version).replace("__DOTFILES_SKILLS__", skills).encode("utf-8")


def _runtime_manifest(files: dict[str, bytes], modes: dict[str, int], version: str) -> bytes:
    runtime = dict(files)
    runtime["VERSION"] = (version + "\n").encode("ascii")
    runtime_modes = dict(modes)
    runtime_modes["VERSION"] = 0o644
    manifest = {
        "schema": 1,
        "version": version,
        "files": [
            {
                "path": name,
                "sha256": sha256(content),
                "size": len(content),
                "mode": format(runtime_modes[name], "04o"),
            }
            for name, content in sorted(runtime.items())
        ],
    }
    return (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def _make_tar(files: dict[str, bytes], modes: dict[str, int]) -> bytes:
    output = io.BytesIO()
    with gzip.GzipFile(fileobj=output, mode="wb", filename="", mtime=0, compresslevel=9) as compressed:
        with tarfile.open(fileobj=compressed, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for name, content in sorted(files.items()):
                info = tarfile.TarInfo("dotfiles/" + name)
                info.size = len(content)
                info.mode = modes[name]
                info.uid = info.gid = 0
                info.uname = info.gname = ""
                info.mtime = 0
                info.type = tarfile.REGTYPE
                archive.addfile(info, io.BytesIO(content))
    return output.getvalue()


def _make_zip(files: dict[str, bytes], modes: dict[str, int]) -> bytes:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name, content in sorted(files.items()):
            info = zipfile.ZipInfo("dotfiles/" + name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = (stat.S_IFREG | modes[name]) << 16
            info.flag_bits = 0
            archive.writestr(info, content, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    return output.getvalue()


def _public_launchers(version: str, skills: list[str], shell: bytes, powershell: bytes) -> dict[str, bytes]:
    rendered_shell = _render_remote(shell, version, " ".join(skills), "scripts/remote.sh")
    rendered_ps = _render_remote(powershell, version, " ".join(skills), "scripts/remote.ps1")
    release_base = f"${{DOTFILES_BASE_URL:-https://r1cco.com/dotfiles}}/releases/{version}"
    powershell_base = (
        "$baseUrl = if ($env:DOTFILES_BASE_URL) { $env:DOTFILES_BASE_URL.TrimEnd('/') } "
        "else { 'https://r1cco.com/dotfiles' }\n"
    )

    # The public bootstraps are the native fetch/install entrypoints. Aliases
    # remain tiny and pin every operation to this same immutable release.
    outputs = {
        "install.sh": rendered_shell,
        "install.ps1": rendered_ps,
        "update.sh": (
            "#!/usr/bin/env bash\n"
            "set -euo pipefail\n"
            f"curl -fsSL \"{release_base}/install.sh\" | bash -s -- \"$@\"\n"
        ).encode(),
        "uninstall.sh": (
            "#!/usr/bin/env bash\n"
            "set -euo pipefail\n"
            f"curl -fsSL \"{release_base}/install.sh\" | bash -s -- uninstall \"$@\"\n"
        ).encode(),
        "update.ps1": (
            powershell_base +
            f"$bootstrap = (Invoke-RestMethod -Uri \"$baseUrl/releases/{version}/install.ps1\")\n"
            "& ([scriptblock]::Create([string]$bootstrap)) @args\n"
        ).encode(),
        "uninstall.ps1": (
            powershell_base +
            f"$bootstrap = (Invoke-RestMethod -Uri \"$baseUrl/releases/{version}/install.ps1\")\n"
            "& ([scriptblock]::Create([string]$bootstrap)) uninstall @args\n"
        ).encode(),
    }
    for skill in skills:
        outputs[f"skills/{skill}"] = (
            "#!/usr/bin/env bash\n"
            "set -euo pipefail\n"
            f"curl -fsSL \"{release_base}/install.sh\" | bash -s -- {skill} \"$@\"\n"
        ).encode()
        outputs[f"skills/{skill}.ps1"] = (
            powershell_base +
            f"$bootstrap = (Invoke-RestMethod -Uri \"$baseUrl/releases/{version}/install.ps1\")\n"
            f"& ([scriptblock]::Create([string]$bootstrap)) {skill} @args\n"
        ).encode()
    return outputs


def build_release(version: str, output: Path, source: Path = ROOT, use_git: bool = True) -> Path:
    if not VERSION_RE.fullmatch(version):
        raise ReleaseError("--version must be a 40-character lowercase commit SHA")
    source = source.resolve()
    output = output.absolute()
    if output == source or source in output.parents:
        raise ReleaseError("--output must be outside the source tree")

    files, modes, _candidates = _collect_runtime(source, use_git=use_git)
    skills = _skills_from_files(files)
    archive_files = dict(files)
    archive_modes = dict(modes)
    archive_files["VERSION"] = (version + "\n").encode("ascii")
    archive_modes["VERSION"] = 0o644
    archive_files["RUNTIME-MANIFEST.json"] = _runtime_manifest(files, modes, version)
    archive_modes["RUNTIME-MANIFEST.json"] = 0o644

    tar_name = f"dotfiles-{version}.tar.gz"
    zip_name = f"dotfiles-{version}.zip"
    tar_bytes = _make_tar(archive_files, archive_modes)
    zip_bytes = _make_zip(archive_files, archive_modes)
    launchers = _public_launchers(version, skills, files["scripts/remote.sh"], files["scripts/remote.ps1"])
    launcher_hashes = {name: sha256(content) for name, content in sorted(launchers.items())}
    public_manifest = {
        "schema": 1,
        "version": version,
        "skills": skills,
        "archives": {tar_name: sha256(tar_bytes), zip_name: sha256(zip_bytes)},
        "launchers": launcher_hashes,
        "runtime_manifest_sha256": sha256(archive_files["RUNTIME-MANIFEST.json"]),
    }
    manifest_bytes = (json.dumps(public_manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()
    sums = "".join(f"{public_manifest['archives'][name]}  {name}\n" for name in sorted(public_manifest["archives"]))
    artifact_files = {
        "VERSION": (version + "\n").encode("ascii"),
        "SHA256SUMS": sums.encode("ascii"),
        "MANIFEST.json": manifest_bytes,
        tar_name: tar_bytes,
        zip_name: zip_bytes,
        **launchers,
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    if output.exists():
        if not output.is_dir() or any(output.iterdir()):
            raise ReleaseError(f"--output must not exist or must be empty: {output}")
        output.rmdir()
    stage = Path(tempfile.mkdtemp(prefix=f".{output.name}.stage-", dir=output.parent))
    try:
        for name, content in sorted(artifact_files.items()):
            destination = stage.joinpath(*PurePosixPath(name).parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(content)
            os.chmod(destination, 0o755 if name.endswith(".sh") or (name.startswith("skills/") and not name.endswith(".ps1")) else 0o644)
        os.replace(stage, output)
    except BaseException:
        shutil.rmtree(stage, ignore_errors=True)
        raise
    return output


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--version", required=True, help="40-character lowercase commit SHA")
    parser.add_argument("--output", required=True, type=Path, help="new or empty directory for one release artifact")
    parser.add_argument("--source", type=Path, default=ROOT, help="source checkout (defaults to this checkout)")
    args = parser.parse_args(argv)
    try:
        source = args.source.resolve()
        use_git = source == ROOT.resolve() or (source / ".git").exists()
        result = build_release(args.version, args.output, source=source, use_git=use_git)
    except ReleaseError as exc:
        parser.error(str(exc))
    print(result)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
