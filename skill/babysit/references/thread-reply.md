# High-signal thread reply

Same shape for any reviewer. Fill slots; do not change structure.

Post as a pull-request review-comment reply (`gh api .../replies`). 2–4 lines.
No thanks, no process theater, no full diffs, no restating the reviewer's paragraph.

Replace `<hash>` with the 7-char commit that fixed it. Omit the Fixed line only
when there is no commit (reply-only / already fixed on HEAD).

## Fixed

```text
Fixed in `<hash>`. <one concrete change that addresses this finding>.
```

Optional second sentence only if the fix is non-obvious (why this approach, or
what was _not_ changed). Never list files or test commands unless the finding
was about them.

## Disagree / wontfix

Leave the thread open unless the user explicitly approved resolve-on-disagree.

```text
Not applying. <reason with evidence — code path, prior commit, or product intent>.
Leaving open for a human call.
```

## Already fixed / outdated on HEAD

No new commit. Resolve after reply when the code on HEAD already addresses it.

```text
Already addressed on HEAD (`<hash>`). <one line pointing at the existing fix>.
```

If the fixing commit is unknown, drop the parenthetical hash and name the
symbol or behavior instead.

## Skip

No commit. Finding is not a demonstrated defect (style, nit, formatting,
wording, optional refactor, hypothetical, or no evidence on this path).
Bot: resolve after reply. Human: resolve only if the user confirmed that.

```text
Skipping. <one line: style / nit / hypothetical / no defect on this path>.
```

Do not use Disagree here. Disagree is a rejected defect, left open.
