#!/usr/bin/env python3
"""Run the instruction probes against each variant in variants/.

Swaps INSTRUCTIONS.md in place (the file ~/.claude/CLAUDE.md symlinks to), so
skill auto-invocation is exercised under real conditions. The original file is
restored on exit, including on Ctrl-C.

A hard kill (SIGKILL, parent process exit) skips that restore and strands a
variant in the working tree, where it has previously been swept into a commit.
Two guards cover that: a lockfile so two sweeps can never interleave, and a
startup reconcile that restores INSTRUCTIONS.md from HEAD when its contents are
provably a leftover variant rather than real edits.

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


def git(*args, cwd=REPO, check=True):
    return subprocess.run(
        ["git", *args], cwd=cwd, check=check, capture_output=True, text=True
    )


def acquire_lock() -> bool:
    """Refuse to start while another sweep owns the repo. Reclaims a stale lock
    whose owning process is gone."""
    if LOCKFILE.exists():
        try:
            pid = int(LOCKFILE.read_text().split()[0])
            os.kill(pid, 0)
        except (ValueError, IndexError, ProcessLookupError):
            print(f"reclaiming stale lock at {LOCKFILE}", file=sys.stderr)
        except PermissionError:
            pass  # process exists, owned by another user
        else:
            print(
                f"error: another sweep is running (pid {pid}).\n"
                f"       Two sweeps cannot share one INSTRUCTIONS.md — wait for it,\n"
                f"       or delete {LOCKFILE} if you know that process is dead.",
                file=sys.stderr,
            )
            return False
    LOCKFILE.write_text(f"{os.getpid()}\n")
    return True


def reconcile_instructions() -> bool:
    """Undo a variant stranded by a hard-killed sweep, but never touch real edits.

    A killed sweep leaves a variant sitting in the working tree, where it has
    been committed by accident before. If the dirty content is byte-identical to
    a known variant it can only be that leftover, so restore it from HEAD.
    Anything else is the user's own work — refuse and let them decide.
    """
    if not git("status", "--porcelain", "--", str(INSTRUCTIONS)).stdout.strip():
        return True
    current = INSTRUCTIONS.read_text()
    for variant in sorted((EVALS / "variants").glob("*.md")):
        if variant.read_text() == current:
            print(
                f"INSTRUCTIONS.md was left as '{variant.stem}' by an interrupted sweep — "
                "restoring from HEAD.",
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
    sandbox = make_sandbox(probe) if probe["sandbox"] == "fixture" else None
    cwd = sandbox or REPO
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
        "--permission-mode", probe["permission_mode"],
        "--allowedTools", *probe["allowed_tools"],
    ]
    # Clear any prior sweep's artifacts so grading never mixes runs from an
    # older version of the probe with fresh ones.
    shutil.rmtree(out_dir, ignore_errors=True)
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
    except subprocess.TimeoutExpired:
        (out_dir / "transcript.jsonl").write_text("")
        (out_dir / "stderr.txt").write_text(f"TIMEOUT after {RUN_TIMEOUT_S}s\n")

    if stub_bin:
        shutil.rmtree(stub_bin, ignore_errors=True)
    if sandbox:
        (out_dir / "diff.patch").write_text(
            git("diff", "HEAD", cwd=sandbox, check=False).stdout
        )
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

    if not reconcile_instructions():
        return 1
    if not acquire_lock():
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
