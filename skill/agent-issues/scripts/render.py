"""Render an agent-issue draft into a GitHub issue body.

The draft's first two lines are the title and the labels; the body follows.
{{path:line}} or {{path:start-end}} becomes a link pinned to --base (".../blob/<sha>/").
{{path}} links the file. {{#k}} becomes #number from --nums (JSON {"k": number}),
or "(issue k in this batch)" before the issues exist.
"""

import argparse
import json
import re

parser = argparse.ArgumentParser()
parser.add_argument("draft")
parser.add_argument("--base", required=True)
parser.add_argument("--nums")
args = parser.parse_args()

base = args.base if args.base.endswith("/") else args.base + "/"
nums = json.load(open(args.nums)) if args.nums else {}


def link(match: re.Match) -> str:
    token = match.group(1)
    if token.startswith("#"):
        key = token[1:]
        return f"#{nums[key]}" if key in nums else f"(issue {key} in this batch)"
    path, _, lines = token.partition(":")
    anchor = ""
    if lines:
        start, _, end = lines.partition("-")
        anchor = f"#L{start}" + (f"-L{end}" if end else "")
    return f"[`{token}`]({base}{path}{anchor})"


body = open(args.draft).read().split("\n", 2)[2]
print(re.sub(r"\{\{([^}]+)\}\}", link, body), end="")
