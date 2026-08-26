# High-signal thread reply

Same shape for any reviewer. Fill slots; do not change structure.

Post as a pull-request review-comment reply (`gh api .../replies`) when
the source is an inline thread. For a review-submission body or issue
comment, post the same template with `gh pr comment`. Resolve only when
a thread id exists. 2–4 lines.
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
