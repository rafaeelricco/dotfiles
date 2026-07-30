# dotfiles

Keeping a development environment reproducible should not require maintaining
the same AI instructions in several vendor-specific trees.

This repository is the source of truth for my Neovim, PowerShell, shell,
Claude Code, Codex, and Grok setup. AI tools share one generic `INSTRUCTIONS.md` and
one `skill/` tree, installed through safe, repeatable symlinks.

- **One source of truth:** no generated skill or plugin copies.
- **Safe re-runs:** exact links are no-ops and conflicts can be backed up or
  explicitly overridden.
- **Cross-platform:** Bash for macOS/Linux and PowerShell 7 for Windows.

## Quick Install

**Prerequisites:** Git. Claude Code 2.1.203+, Codex, and Grok are optional; each is
configured only when its CLI is available on `PATH`. Windows also requires
PowerShell 7. Developer Mode or an elevated shell is required when agent or
Windows terminal install needs symlinks.

### macOS / Linux

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/install.sh | bash
```

### Windows

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/install.ps1')))
```

Remote install uses managed mode and clones `~/.dotfiles` by default.

## Local Checkout Install

Use local mode from the primary checkout to avoid a second clone:

```bash
bash scripts/install.sh --local
```

```powershell
.\install.ps1 -Local
```

Local mode links instructions and skills directly from that checkout. It never
clones or changes Git state. Edits to an existing skill are live immediately.
After adding or removing a skill, reconcile the global links with:

```bash
bash scripts/update.sh --local
```

```powershell
.\update.ps1 -Local
```

The default clone is `~/.dotfiles`. Use `--dir PATH` / `-Dir PATH` or
`DOTFILES_DIR` to override it. Use `--yes` / `-Yes` to back up conflicts
without prompting, `--override` / `-Override` to permanently remove conflicts
without backups, `--skip-claude` / `-SkipClaude`, `--skip-codex` / `-SkipCodex`, and
`--skip-grok` / `-SkipGrok` to skip individual CLIs, and `-SkipTerminal` on
Windows to skip PowerShell profile / Windows Terminal setup. Skip flags may be
combined. Install and update preserve existing configuration for absent or
skipped CLIs. Backup and override modes cannot be used together.

These scripts configure agent instructions and skills; they do not install,
remove, or authenticate the Claude Code, Codex, or Grok CLIs. On Windows they
also link the PowerShell profile and theme and merge managed Windows Terminal
keys (unless `-SkipTerminal`).

## Update

Managed update is authoritative and destructive inside the managed clone. It fetches
GitHub `main`, forces local `main` to that commit, and removes every untracked,
ignored, and nested-repository path with `git clean -ffdx`. Invoking update is
the authorization for this cleanup; `--yes` / `-Yes` still means “back up
installer conflicts without prompting.”

Local update only reconciles links from the checkout that created the local
installation. It never fetches, pulls, checks out, resets, cleans, commits, or
changes the index or working tree.

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/update.sh | bash
```

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/update.ps1')))
```

## Uninstall

Local uninstall removes recorded links and backups while preserving the
checkout:

```bash
bash scripts/uninstall.sh --local
```

```powershell
.\uninstall.ps1 -Local
```

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

| Source            | Claude Code               | Codex                     | Grok                    |
| ----------------- | ------------------------- | ------------------------- | ----------------------- |
| `INSTRUCTIONS.md` | `~/.claude/CLAUDE.md`     | `~/.codex/AGENTS.md`      | `~/.grok/AGENTS.md`     |
| `skill/<name>`    | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` | `~/.grok/skills/<name>` |

Each column is created or synchronized only when its CLI is detected on `PATH`
and not explicitly skipped. Existing managed links remain untouched otherwise.

### Windows terminal (`install.ps1` only; skip with `-SkipTerminal`)

| Source | Destination |
| ------ | ----------- |
| `powershell/Microsoft.PowerShell_profile.ps1` | `$PROFILE` (current PowerShell 7 host profile) |
| `powershell/themes/robbyrussell.omp.json` | `<profile-dir>/themes/robbyrussell.omp.json` |
| managed WT keys | live `settings.json` (Store package or unpackaged path) |

Managed Windows Terminal keys only:

- `profiles.defaults.background` = `#141414`
- action: `ctrl+shift+t` → `duplicateTab` (same CWD as the current tab; the profile emits OSC 9;9 so Terminal knows the path)

`powershell/required_config.json` is a **reference snapshot**, not fully installed.
Install does not replace the whole Windows Terminal settings file.

`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `GROK_HOME` are honored. The former Claude
marketplace is retired; existing marketplace installations are not removed
automatically.

Managed mode records link destinations, backups, and directories in
`<clone>/.git/dotfiles-lifecycle-state`. Local mode records the same data plus
its source checkout in `${XDG_STATE_HOME:-~/.local/state}/dotfiles/local-install-state`
on macOS/Linux and `%LOCALAPPDATA%\dotfiles\local-install-state` on Windows.

Managed and local modes cannot coexist. To migrate, uninstall the managed
installation first, then run the checked-out installer with `--local` / `-Local`.
No install command automatically deletes an existing repository.

Managed state survives update and is deleted with the clone. If an older
installation used a custom `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, or `GROK_HOME`, supply the same
variable once when running the updated installer, updater, or uninstaller so
that location can be recorded or cleaned safely.

Managed clones must use the official GitHub HTTPS or SSH origin, be standalone
checkouts at the exact path passed through `--dir` / `-Dir`, and have no linked
worktrees. Local mode requires the primary checkout but permits other linked
worktrees to exist. A linked worktree itself cannot be the local source.

If a previous command created `~/.agents` as root, restore user ownership
before installing:

```bash
sudo chown -R "$(id -un):$(id -gn)" "$HOME/.agents"
```

Run the installer as your normal user, not with `sudo`.

## Other Dotfiles

- [`nvim/`](nvim/) — Neovim configuration and setup guides.
- [`powershell/`](powershell/) — PowerShell profile and terminal theme.
  On Windows, `install.ps1` links the profile and theme and merges managed
  Windows Terminal keys (`#141414` background, `Ctrl+Shift+T` → `duplicateTab`).
- [`.zshrc`](.zshrc) — Zsh configuration.
- [`scripts/mcp/`](scripts/mcp/) — `install-mcp.sh` / `install-mcp.ps1` register
  selected tools (Exa, Argent MCP servers, and the OpenAI Codex Claude Code
  plugin) with every detected agent CLI. Run by hand. Interactive mode shows a
  checkbox list (toggle by number, Enter to confirm). Non-interactive:
  `--mcp exa,argent,codex-cc` / `-Mcp all`. Exa prompts for an optional API key
  (or `--exa-key` / `-ExaKey`); blank = free tier. Argent installs
  `@swmansion/argent` globally via npm (Node ≥ 20.11) and registers a stdio MCP
  (`argent mcp`). `codex-cc` runs `claude plugin marketplace add
  openai/codex-plugin-cc` and `claude plugin install codex@openai-codex -s user`
  (Claude-only; not an MCP). Optional Codex runtime: `npm i -g @openai/codex`.
  Not hooked into the main installer.
