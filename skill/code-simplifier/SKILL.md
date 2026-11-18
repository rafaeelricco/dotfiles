---
name: code-simplifier
description: >
  Tidy changed code so it reads more plainly while doing exactly the same
  thing. Use when asked to simplify, clean up, or refine code, or when
  orchestrate loads it after a code edit.
---

# Code simplifier

Behavior is fixed: outputs, side effects, errors, and public names do not
change. Only the shape of the code does. Public means anything reachable from
outside its file or module: exported or non-underscore names, CLI flags,
output keys, and return shapes.

## Scope

Without a target, work on what is uncommitted (`git diff HEAD` and untracked
files); on a clean tree, on the branch's diff against its base. In a diff, the
scope is each changed function or block, not the whole file: an untouched
neighbor was not part of the change. A path, file, or range you are given
replaces that default and covers all of it. Edit nothing outside the scope;
list ideas for outside code in the report. Empty scope → say so and stop;
never widen it to find work.

## Whose style

The project's written rules (CLAUDE.md, AGENTS.md, linter and formatter
config) come first, then how nearby code is written, when it is not itself the
mess. Either outranks the list below: a construct the project's rules adopt
stays, such as chained ternaries under a formatter set for them. Your own
taste breaks ties only.

## What to change

- Deep nesting → early returns.
- A wrapper, helper, or layer with one caller and no reason → inline it.
- Duplicated logic in scope → one copy.
- A local name that hides intent → a name that states it.
- A comment that repeats the code → delete it; a comment that says why stays.
- Chained or nested conditional expressions → if/else or switch.

## What to leave alone

- Shorter is not the goal: no dense one-liners or tricks.
- Separate concerns stay in separate functions.
- An abstraction with several callers stays.
- Nothing that makes the code harder to debug or extend.
- Dead code and docs that disagree with the code: report them, do not fix
  them; removing or rewriting them is a separate change.

## Steps

1. List the files and functions or blocks in scope.
2. Run the narrowest existing tests that exercise them, wherever in the repo
   they live; record the result. No such tests → a throwaway check of the
   observable output, removed afterwards, or else note what you will inspect.
3. Make the edits.
4. Rerun the same checks. A result different from step 2 → undo the edit that
   caused it.
5. Report the files changed, one line per change a reader would notice, the
   checks and their before/after results, and ideas left outside the scope.
