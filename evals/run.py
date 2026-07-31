#!/usr/bin/env python3
"""Run the instruction probes against each variant in variants/.

Swaps INSTRUCTIONS.md in place (the file ~/.claude/CLAUDE.md symlinks to), so
skill auto-invocation is exercised under real conditions. The original file is
restored on exit, including on Ctrl-C.

A hard kill (SIGKILL, parent process exit) skips that restore and strands a
variant in the working tree, where it has previously been swept into a commit.
Two guards cover that: a lockfile so two sweeps can never interleave, and a
startup reconcile that restores INSTRUCTIONS.md when a reclaimed stale lock
proves the previous sweep died. The lock is taken first, so reconcile can never
revert the file out from under a sweep that is still running, and matching a
variant is not on its own treated as residue — copying a winning variant onto
the live file is a deliberate act the reconcile refuses to undo.

Usage:
    evals/run.py                      # all probes, all variants, 5 runs each
    evals/run.py -n 3                 # 3 runs per probe
    evals/run.py -p p6-plan-mode      # one probe (repeatable)
    evals/run.py -v candidate         # one variant (repeatable)
"""

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
from pathlib import Path

EVALS = Path(__file__).resolve().parent
REPO = EVALS.parent
INSTRUCTIONS = REPO / "INSTRUCTIONS.md"
LOCKFILE = EVALS / ".sweep.lock"
RUN_TIMEOUT_S = 600


def _as_text(stream) -> str:
    """TimeoutExpired carries bytes even under text=True."""
    if isinstance(stream, bytes):
        return stream.decode(errors="replace")
    return stream or ""


def clone_repo() -> Path:
    """Repo-backed probes run against a throwaway clone, never the live checkout:
    they hold Bash unattended and nothing restores the working tree afterwards.
    `--local` hardlinks, so this is cheap."""
    path = Path(tempfile.mkdtemp(prefix="eval-repo-"))
    subprocess.run(["git", "clone", "-q", "--local", str(REPO), str(path)], check=True)
    return path


def git(*args, cwd=REPO, check=True):
    return subprocess.run(
        ["git", *args], cwd=cwd, check=check, capture_output=True, text=True
    )


def acquire_lock() -> tuple[bool, bool]:
    """Refuse to start while another sweep owns the repo.

    Returns `(acquired, after_crash)`. `after_crash` is True only when the lock
    was reclaimed from a dead process — the one case where a variant sitting in
    the working tree is crash residue rather than a deliberate copy.
    """
    after_crash = False
    while True:
        try:
            fd = os.open(LOCKFILE, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            try:
                pid = int(LOCKFILE.read_text().split()[0])
                os.kill(pid, 0)
            except (ValueError, IndexError, ProcessLookupError, FileNotFoundError):
                print(f"reclaiming stale lock at {LOCKFILE}", file=sys.stderr)
                LOCKFILE.unlink(missing_ok=True)
                after_crash = True
                continue
            except PermissionError:
                owner = f"pid {pid}, owned by another user"
            else:
                owner = f"pid {pid}"
            print(
                f"error: another sweep is running ({owner}).\n"
                f"       Two sweeps cannot share one INSTRUCTIONS.md — wait for it,\n"
                f"       or delete {LOCKFILE} if you know that process is dead.",
                file=sys.stderr,
            )
            return False, False
        os.write(fd, f"{os.getpid()}\n".encode())
        os.close(fd)
        return True, after_crash


def reconcile_instructions(after_crash: bool) -> bool:
    """Undo a variant stranded by a hard-killed sweep, but never touch real edits.

    A killed sweep leaves a variant sitting in the working tree, where it has
    been committed by accident before. Restore it from the index only when the
    reclaimed lock proves a sweep died. Without that proof, variant-identical
    content is a deliberate copy — promoting a winning variant to the live file
    is the normal workflow — so refuse and let the user decide.
    """
    if not git("status", "--porcelain", "--", str(INSTRUCTIONS)).stdout.strip():
        return True
    current = INSTRUCTIONS.read_text()
    for variant in sorted((EVALS / "variants").glob("*.md")):
        if variant.read_text() == current:
            if not after_crash:
                print(
                    f"error: INSTRUCTIONS.md matches variant '{variant.stem}' but is\n"
                    "       uncommitted, and no sweep was interrupted — so this looks\n"
                    "       deliberate. Commit or stash it; the runner overwrites it.",
                    file=sys.stderr,
                )
                return False
            print(
                f"INSTRUCTIONS.md was left as '{variant.stem}' by an interrupted sweep — "
                f"restoring. Undo with: cp evals/variants/{variant.stem}.md INSTRUCTIONS.md",
                file=sys.stderr,
            )
            git("checkout", "--", str(INSTRUCTIONS))
            return True
    print(
        "error: INSTRUCTIONS.md has uncommitted changes that match no variant.\n"
        "       Commit or stash them first — the runner overwrites this file.",
        file=sys.stderr,
    )
    return False


def make_sandbox(probe: dict) -> Path:
    path = Path(tempfile.mkdtemp(prefix="eval-fixture-"))
    for src in (EVALS / "fixture").iterdir():
        shutil.copy2(src, path / src.name)
        (path / src.name).chmod(0o755)
    ident = [
        "-c", "user.email=eval@example.invalid",
        "-c", "user.name=Eval Runner",
        "-c", "commit.gpgsign=false",
    ]
    subprocess.run(["git", "init", "-q", "-b", "main"], cwd=path, check=True)
    subprocess.run(["git", *ident, "add", "-A"], cwd=path, check=True)
    subprocess.run(
        ["git", *ident, "commit", "-qm", "fixture baseline"], cwd=path, check=True
    )
    if branch := probe.get("branch"):
        # A PR probe needs a remote to diff against and a feature branch ahead
        # of it — the shape that made create-pr skip all of its questions.
        origin = path.with_name(path.name + "-origin.git")
        subprocess.run(
            ["git", "clone", "-q", "--bare", str(path), str(origin)], check=True
        )
        subprocess.run(
            ["git", *ident, "remote", "add", "origin", str(origin)], cwd=path, check=True
        )
        subprocess.run(["git", *ident, "fetch", "-q", "origin"], cwd=path, check=True)
        subprocess.run(["git", *ident, "switch", "-qc", branch], cwd=path, check=True)
        # A wired-up feature, not a dangling helper: a dead function is a
        # defect the model stops to report, and that noise moves the probe.
        install = path / "install.sh"
        install.write_text(
            install.read_text()
            .replace(
                "main() {",
                'verify_checksum() {\n  shasum -a 256 -c "$1.sha256"\n}\n\nmain() {',
            )
            .replace(
                '  echo "installing ${version}"',
                '  verify_checksum "${version}"\n  echo "installing ${version}"',
            )
        )
        subprocess.run(
            ["git", *ident, "commit", "-qam", "Add checksum verification"],
            cwd=path,
            check=True,
        )
    if probe["dirty"]:
        with (path / "README.md").open("a") as fh:
            fh.write("\nSupports `--verbose` for detailed output.\n")
    return path


def run_probe(probe: dict, out_dir: Path) -> None:
    is_fixture = probe["sandbox"] == "fixture"
    sandbox = make_sandbox(probe) if is_fixture else clone_repo()
    cwd = sandbox
    # Pin the pre-run commit: `git diff HEAD` goes blind the moment the model commits.
    base_sha = git("rev-parse", "HEAD", cwd=sandbox).stdout.strip()
    env = os.environ.copy()
    stub_bin = None
    if probe.get("gh_stub"):
        stub_bin = Path(tempfile.mkdtemp(prefix="eval-stub-bin-"))
        shutil.copy2(EVALS / "stubs" / "gh", stub_bin / "gh")
        (stub_bin / "gh").chmod(0o755)
        env["PATH"] = f"{stub_bin}{os.pathsep}{env['PATH']}"
    cmd = [
        "claude", "-p",
        "--output-format", "stream-json",
        "--verbose",
        # Pinned: eval cost and pass rates both move with model/effort, so
        # neither may drift with the ambient session config.
        "--model", "claude-opus-5",
        "--effort", "medium",
        "--permission-mode", probe["permission_mode"],
        "--allowedTools", *probe["allowed_tools"],
    ]
    out_dir.mkdir(parents=True)
    try:
        proc = subprocess.run(
            cmd,
            cwd=cwd,
            env=env,
            input=probe["prompt"],
            capture_output=True,
            text=True,
            timeout=RUN_TIMEOUT_S,
        )
        (out_dir / "transcript.jsonl").write_text(proc.stdout)
        (out_dir / "stderr.txt").write_text(proc.stderr)
    except subprocess.TimeoutExpired as e:
        # Keep whatever streamed before the hang: a run that mutated the sandbox
        # and then stalled is a failure, not an infrastructure exclusion.
        (out_dir / "transcript.jsonl").write_text(_as_text(e.stdout))
        (out_dir / "stderr.txt").write_text(
            f"TIMEOUT after {RUN_TIMEOUT_S}s\n{_as_text(e.stderr)}"
        )

    if stub_bin:
        shutil.rmtree(stub_bin, ignore_errors=True)
    if sandbox:
        # Intent-to-add so untracked files appear in the diff; without this every
        # git_diff_* assertion is blind to a file the model created.
        subprocess.run(["git", "add", "-A", "-N"], cwd=sandbox, check=False)
        (out_dir / "diff.patch").write_text(
            git("diff", base_sha, cwd=sandbox, check=False).stdout
        )
        if verify := probe.get("verify"):
            # Run in the sandbox during the sweep, never in grade.py — grading
            # stays a read-only pass over recorded results.
            rc = subprocess.run(
                ["bash", "-c", verify], cwd=sandbox, capture_output=True, text=True
            )
            (out_dir / "verify-exit.txt").write_text(str(rc.returncode))
        if is_fixture:
            shutil.copytree(
                sandbox, out_dir / "workdir", ignore=shutil.ignore_patterns(".git")
            )
        shutil.rmtree(sandbox, ignore_errors=True)
        shutil.rmtree(
            sandbox.with_name(sandbox.name + "-origin.git"), ignore_errors=True
        )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("-n", "--runs", type=int, default=5, help="runs per probe (default 5)")
    ap.add_argument("-p", "--probe", action="append", help="probe id (repeatable)")
    ap.add_argument("-v", "--variant", action="append", help="variant name (repeatable)")
    ap.add_argument("-o", "--out", default=str(EVALS / "results"), help="output dir")
    args = ap.parse_args()

    if args.runs < 1:
        print("error: --runs must be >= 1", file=sys.stderr)
        return 1

    # Resolve the work list before taking the lock, so an argument typo cannot
    # leave a lockfile behind.
    probes = json.loads((EVALS / "probes.json").read_text())["probes"]
    if args.probe:
        probes = [p for p in probes if p["id"] in args.probe]
    variants = sorted((EVALS / "variants").glob("*.md"))
    if args.variant:
        variants = [v for v in variants if v.stem in args.variant]
    if not probes or not variants:
        print("error: no probes or no variants matched", file=sys.stderr)
        return 1

    acquired, after_crash = acquire_lock()
    if not acquired:
        return 1
    if not reconcile_instructions(after_crash):
        LOCKFILE.unlink(missing_ok=True)
        return 1

    original = INSTRUCTIONS.read_text()

    def restore(*_):
        INSTRUCTIONS.write_text(original)
        LOCKFILE.unlink(missing_ok=True)
        sys.exit(130)

    signal.signal(signal.SIGINT, restore)
    signal.signal(signal.SIGTERM, restore)

    out_root = Path(args.out)
    total = len(variants) * len(probes) * args.runs
    done = 0
    try:
        for variant in variants:
            INSTRUCTIONS.write_text(variant.read_text())
            for probe in probes:
                # Clear the whole arm so a smaller -n cannot leave stale runs
                # behind for grade.py's `run-*` glob to fold back in.
                shutil.rmtree(
                    out_root / variant.stem / probe["id"], ignore_errors=True
                )
                for run in range(1, args.runs + 1):
                    done += 1
                    print(
                        f"[{done}/{total}] {variant.stem} :: {probe['id']} :: run-{run}",
                        flush=True,
                    )
                    run_probe(
                        probe, out_root / variant.stem / probe["id"] / f"run-{run}"
                    )
    finally:
        INSTRUCTIONS.write_text(original)
        LOCKFILE.unlink(missing_ok=True)

    print(f"\ndone. results in {out_root}\nnow run: evals/grade.py {out_root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
