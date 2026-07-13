# dotfiles

Keeping a development environment reproducible should not require maintaining
the same AI instructions in several vendor-specific trees.

This repository is the source of truth for my Neovim, PowerShell, shell,
Claude Code, and Codex setup. AI tools share one generic `INSTRUCTIONS.md` and
one `skill/` tree, installed through safe, repeatable symlinks.

- **One source of truth:** no generated skill or plugin copies.
- **Safe re-runs:** exact links are no-ops and conflicts can be backed up or
  explicitly overridden.
- **Cross-platform:** Bash for macOS/Linux and PowerShell 7 for Windows.

## Quick Install

**Prerequisites:** Git. Claude Code 2.1.203+ and Codex are optional; each is
configured only when its CLI is available on `PATH`. Windows also requires
PowerShell 7. Developer Mode or an elevated shell is required only when at
least one detected CLI needs symlinks.

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/install.sh | bash
```

### Windows

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/install.ps1')))
```

The default clone is `~/.dotfiles`. Use `--dir PATH` / `-Dir PATH` or
`DOTFILES_DIR` to override it. Use `--yes` / `-Yes` to back up conflicts
without prompting, `--override` / `-Override` to permanently remove conflicts
without backups, `--skip-claude` / `-SkipClaude` to skip Claude, and
`--skip-codex` / `-SkipCodex` to skip Codex. Both skip flags may be combined.
Install and update preserve existing configuration for absent or skipped CLIs.
Backup and override modes cannot be used together.

These scripts configure agent instructions and skills; they do not install,
remove, or authenticate the Claude Code and Codex CLIs.

## Update

Update is authoritative and destructive inside the managed clone. It fetches
GitHub `main`, forces local `main` to that commit, and removes every untracked,
ignored, and nested-repository path with `git clean -ffdx`. Invoking update is
the authorization for this cleanup; `--yes` / `-Yes` still means “back up
installer conflicts without prompting.”

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/update.sh | bash
```

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/update.ps1')))
```

## Uninstall

Remote uninstall requires an explicit confirmation flag:

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/uninstall.sh | bash -s -- --yes
```

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/uninstall.ps1'))) -Yes
```

Local interactive execution without `--yes` / `-Yes` requires typing the exact
token `UNINSTALL`. Any other response cancels unchanged. A noninteractive run
without the flag exits with status 2.

Uninstall removes only verified managed links, state-recorded backups, empty
installer-created directories, and finally the verified clone. Recorded
backups are deleted, not restored, even if their contents changed later. Move a
backup elsewhere before uninstall if it should be retained. Unmanaged paths,
nonempty directories, and backups created before state tracking are preserved.

Help, cancellation, successful cleanup, and an already-absent clone exit 0.
Repository validation and filesystem failures exit 1; Bash argument errors exit
2, while PowerShell parameter-binding errors use PowerShell's nonzero status.

## Installed Paths

| Source             | Claude Code               | Codex                     |
| ------------------ | ------------------------- | ------------------------- |
| `INSTRUCTIONS.md`  | `~/.claude/CLAUDE.md`     | `~/.codex/AGENTS.md`      |
| `skill/<name>`     | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` |

Each column is created or synchronized only when its CLI is detected on `PATH`
and not explicitly skipped. Existing managed links remain untouched otherwise.

`CLAUDE_CONFIG_DIR` and `CODEX_HOME` are honored. The former Claude
marketplace is retired; existing marketplace installations are not removed
automatically.

The installer records managed link destinations, backups, and directories in
`<clone>/.git/dotfiles-lifecycle-state`. The state survives update and is
deleted with the clone. If an older installation used a custom
`CLAUDE_CONFIG_DIR` or `CODEX_HOME`, supply the same variable once when running
the updated installer, updater, or uninstaller so that location can be recorded
or cleaned safely.

Existing clones must use the official GitHub HTTPS or SSH origin, be standalone
checkouts at the exact path passed through `--dir` / `-Dir`, and have no linked
worktrees. These checks run before update cleanup or uninstall deletion.

If a previous command created `~/.agents` as root, restore user ownership
before installing:

```bash
sudo chown -R "$(id -un):$(id -gn)" "$HOME/.agents"
```

Run the installer as your normal user, not with `sudo`.

## Other Dotfiles

- [`nvim/`](nvim/) — Neovim configuration and setup guides.
- [`powershell/`](powershell/) — PowerShell profile and terminal theme.
- [`.zshrc`](.zshrc) — Zsh configuration.
