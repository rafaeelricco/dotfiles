#!/usr/bin/env python3
"""Grade probe transcripts and report pass rates per variant, with deltas.

Every assertion is checked programmatically against the tool-call stream, the
sandbox diff, or the final files — no LLM judge, so repeated grading of the same
transcripts is deterministic.

Usage:
    evals/grade.py evals/results
    evals/grade.py evals/results --json    # machine-readable
"""

import argparse
import json
import re
import statistics
import sys
from collections import Counter
from pathlib import Path

EVALS = Path(__file__).resolve().parent


def load_transcript(path: Path) -> dict:
    """Extract tool calls, final result text, and cost from a stream-json run."""
    calls, result, cost, duration = [], "", 0.0, 0
    if not path.exists():
        # Run directory created but the sweep died before writing a transcript.
        return {
            "calls": calls,
            "result": result,
            "cost": cost,
            "duration": duration,
            "errored": True,
        }
    for line in path.read_text().splitlines():
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue
        if msg.get("type") == "assistant":
            msg_id = msg.get("message", {}).get("id")
            for block in msg.get("message", {}).get("content", []):
                if block.get("type") == "tool_use":
                    calls.append({
                        "name": block.get("name"),
                        "input": block.get("input") or {},
                        "msg_id": msg_id,
                    })
        elif msg.get("type") == "result":
            result = msg.get("result") or ""
            cost = msg.get("total_cost_usd") or 0.0
            duration = msg.get("duration_ms") or 0
    # A run that never really executed — no output at all, or one that died
    # mid-stream and reported the API error as its result. Either way the model
    # was not given the chance to comply, so scoring it as a failed assertion
    # silently depresses the pass rate. Callers exclude these instead.
    errored = (not calls and not result.strip()) or result.lstrip().startswith(
        "API Error:"
    )
    return {
        "calls": calls,
        "result": result,
        "cost": cost,
        "duration": duration,
        "errored": errored,
    }


def diff_files(patch: str) -> set:
    return set(re.findall(r"^diff --git a/(.+?) b/", patch, re.M))


def diff_line_count(patch: str) -> int:
    return sum(
        1
        for line in patch.splitlines()
        if (line.startswith("+") or line.startswith("-"))
        and not line.startswith(("+++", "---"))
    )


def check(assertion: dict, run_dir: Path, tx: dict) -> bool:
    kind = assertion["check"]
    calls = tx["calls"]

    if kind == "skill_invoked":
        return any(
            c["name"] == "Skill" and c["input"].get("skill") == assertion["skill"]
            for c in calls
        )
    if kind == "tool_used":
        return any(c["name"] == assertion["tool"] for c in calls)
    if kind == "tool_not_used":
        return not any(c["name"] == assertion["tool"] for c in calls)
    if kind == "tool_call_count_min":
        return sum(1 for c in calls if c["name"] == assertion["tool"]) >= assertion["count"]
    if kind == "result_matches":
        return re.search(assertion["pattern"], tx["result"]) is not None
    if kind == "bash_command_not_matches":
        return not any(
            c["name"] == "Bash"
            and re.search(assertion["pattern"], c["input"].get("command", ""))
            for c in calls
        )
    if kind == "skill_invoked_before_tool":
        skill_at = next(
            (i for i, c in enumerate(calls)
             if c["name"] == "Skill" and c["input"].get("skill") == assertion["skill"]),
            None,
        )
        tool_at = next(
            (i for i, c in enumerate(calls)
             if c["name"] == assertion["tool"]
             and re.search(assertion["pattern"], json.dumps(c["input"]))),
            None,
        )
        # The target must actually run: "loaded X before committing" is not
        # satisfied by never committing.
        return skill_at is not None and tool_at is not None and skill_at < tool_at
    if kind == "skill_invoked_first":
        return (
            bool(calls)
            and calls[0]["name"] == "Skill"
            and calls[0]["input"].get("skill") == assertion["skill"]
        )
    if kind == "tool_used_after_skill":
        skill_at = next(
            (i for i, c in enumerate(calls)
             if c["name"] == "Skill" and c["input"].get("skill") == assertion["skill"]),
            None,
        )
        if skill_at is None:
            return False
        pattern = assertion.get("pattern")
        # Scan only past the skill load, so a gate-1 worker spawned earlier
        # cannot satisfy (or spuriously fail) the check.
        return any(
            c["name"] == assertion["tool"]
            and (pattern is None or re.search(pattern, json.dumps(c["input"])))
            for c in calls[skill_at + 1:]
        )
    if kind == "tool_used_before_skill":
        tool_at = next(
            (i for i, c in enumerate(calls) if c["name"] == assertion["tool"]),
            None,
        )
        skill_at = next(
            (i for i, c in enumerate(calls)
             if c["name"] == "Skill" and c["input"].get("skill") == assertion["skill"]),
            None,
        )
        # Both ends must run: "fanned out before consulting" is not satisfied
        # by never fanning out.
        return tool_at is not None and skill_at is not None and tool_at < skill_at
    if kind == "parallel_tool_calls_min":
        # Blocks share one message id when the model emits them in a single
        # turn; that, not stream position, is what makes them concurrent.
        batches = Counter(c["msg_id"] for c in calls if c["name"] == assertion["tool"])
        return max(batches.values(), default=0) >= assertion["count"]
    if kind == "verify_exit_is":
        f = run_dir / "verify-exit.txt"
        return f.exists() and f.read_text().strip() == str(assertion["code"])

    patch_file = run_dir / "diff.patch"
    patch = patch_file.read_text() if patch_file.exists() else ""

    if kind == "git_diff_files_subset":
        return diff_files(patch).issubset(set(assertion["files"]))
    if kind == "git_diff_files_include":
        return set(assertion["files"]).issubset(diff_files(patch))
    if kind == "git_diff_lines_max":
        return diff_line_count(patch) <= assertion["max"]

    target = run_dir / "workdir" / assertion["path"]
    content = target.read_text() if target.exists() else ""
    if kind == "file_matches":
        return re.search(assertion["pattern"], content) is not None
    if kind == "file_not_matches":
        return re.search(assertion["pattern"], content) is None

    raise ValueError(f"unknown check: {kind}")


def pct(x: float) -> str:
    return f"{100 * x:5.1f}%"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("results", type=Path)
    ap.add_argument(
        "--baseline",
        default="baseline",
        help="variant used as the reference every other variant is compared against",
    )
    ap.add_argument("--json", action="store_true", help="emit JSON instead of markdown")
    args = ap.parse_args()

    probes = {p["id"]: p for p in json.loads((EVALS / "probes.json").read_text())["probes"]}
    variants = sorted(d.name for d in args.results.iterdir() if d.is_dir())
    report = {}
    # Tracked outside `report` so the `if not per_run` skip below cannot also
    # swallow the record of why a probe never scored.
    excluded = {}

    for variant in variants:
        report[variant] = {}
        for probe_id, probe in probes.items():
            probe_dir = args.results / variant / probe_id
            if not probe_dir.is_dir():
                continue
            runs = sorted(probe_dir.glob("run-*"))
            per_run, per_assertion = [], {a["text"]: [] for a in probe["assertions"]}
            costs, durations, errored = [], [], 0
            for run_dir in runs:
                tx = load_transcript(run_dir / "transcript.jsonl")
                costs.append(tx["cost"])
                durations.append(tx["duration"])
                if tx["errored"]:
                    errored += 1
                    continue
                outcomes = []
                for assertion in probe["assertions"]:
                    ok = check(assertion, run_dir, tx)
                    per_assertion[assertion["text"]].append(ok)
                    outcomes.append(ok)
                per_run.append(all(outcomes))
            if errored:
                excluded[(variant, probe_id)] = errored
            if not per_run:
                continue
            report[variant][probe_id] = {
                "section": probe["section"],
                "tests": probe["tests"],
                "n": len(per_run),
                "errored": errored,
                "pass_rate": sum(per_run) / len(per_run),
                "stddev": statistics.stdev([float(x) for x in per_run]) if len(per_run) > 1 else 0.0,
                "assertions": {k: sum(v) / len(v) for k, v in per_assertion.items() if v},
                "cost_usd": sum(costs),
                "duration_ms": sum(durations) / len(durations) if durations else 0,
            }

    if args.json:
        # `excluded` is keyed by tuple, which json cannot serialize — re-nest it.
        nested = {}
        for (variant, probe_id), count in excluded.items():
            nested.setdefault(variant, {})[probe_id] = count
        json.dump({"report": report, "excluded": nested}, sys.stdout, indent=2)
        return 0

    ref = args.baseline if args.baseline in variants else variants[0]
    others = [v for v in variants if v != ref]
    ordered = [ref, *others]
    print(f"# Instruction eval — {ref} (reference) vs {', '.join(others) or 'nothing'}\n")
    delta_heads = [f"Δ {v}" for v in others]
    print("| § | Probe | " + " | ".join(ordered + delta_heads) + " |")
    print("|---|---|" + "---|" * (len(ordered) + len(delta_heads)))

    regressions = []
    for probe_id, probe in probes.items():
        rows = {v: report.get(v, {}).get(probe_id) for v in ordered}
        if not any(rows.values()):
            continue
        cells = [
            f"{pct(rows[v]['pass_rate'])} n={rows[v]['n']}" if rows[v] else "  —  "
            for v in ordered
        ]
        for other in others:
            if rows[ref] and rows[other]:
                d = rows[other]["pass_rate"] - rows[ref]["pass_rate"]
                cells.append(f"{100 * d:+.0f}pp" if d else "—")
                if d < 0:
                    regressions.append((probe_id, other, rows[ref], rows[other]))
            else:
                cells.append("  —  ")
        sec = next((r["section"] for r in rows.values() if r), "?")
        print(f"| {sec} | `{probe_id}` | " + " | ".join(cells) + " |")

    print("\n## Cost per sweep\n")
    for variant in variants:
        total = sum(r["cost_usd"] for r in report[variant].values())
        avg_ms = statistics.mean([r["duration_ms"] for r in report[variant].values()] or [0])
        runs = sum(r["n"] + r["errored"] for r in report[variant].values())
        per_run = f", ${total / runs:.4f}/run" if runs else ""
        print(
            f"- **{variant}**: ${total:.4f} over {runs} runs{per_run}, "
            f"mean run {avg_ms / 1000:.1f}s"
        )

    if regressions:
        print(f"\n## Below {ref} — failing assertions\n")
        for probe_id, variant, before, after in regressions:
            print(f"### `{probe_id}` (§{before['section']}) — {variant} — {before['tests']}\n")
            for text, rate in after["assertions"].items():
                was = before["assertions"].get(text, 0.0)
                flag = " ← **dropped**" if rate < was else ""
                print(f"- {pct(was)} → {pct(rate)}  {text}{flag}")
            print()
    else:
        print(f"\nNothing scored below {ref}.\n")

    if excluded:
        print("## Runs excluded (no tool calls, no output — API error or kill)\n")
        for (variant, probe_id), count in sorted(excluded.items()):
            note = "" if report[variant].get(probe_id) else " — probe never scored"
            print(f"- {variant}/`{probe_id}`: {count} excluded{note}")
        print("\nThese are infrastructure failures, not rule violations. Re-run to replace them.\n")

    low_n = min(
        (r["n"] for v in variants for r in report[v].values()), default=5
    )
    if low_n < 5:
        print(
            f"> Only n={low_n} per probe. These probes are non-deterministic run to run —\n"
            "> a 0% or 100% at low n is noise, not a result. Re-run with `-n 5` or more."
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
