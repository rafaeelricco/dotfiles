# dotfiles

Keeping a development environment reproducible should not require maintaining
the same AI instructions in several vendor-specific trees.

This repository is the source of truth for my Neovim, PowerShell, shell,
Claude Code, Codex, Grok, and Cursor setup. AI tools share one generic `INSTRUCTIONS.md` and
one `skill/` tree, installed through safe, repeatable symlinks. A skill's body never
loads until it is invoked, so the tree is cheap to keep whole; skills that should
never fire on their own carry `disable-model-invocation: true`, which keeps them out
of the model's listing while leaving `/<name>` available to me.

- **One source of truth:** no generated skill or plugin copies.
- **Safe re-runs:** exact links are no-ops and conflicts can be backed up or
  explicitly overridden.
- **Cross-platform:** Bash for macOS/Linux and PowerShell 7 for Windows.

## Quick Install

**Prerequisites:** Git. Claude Code 2.1.203+, Codex, and Grok are optional; each is
configured only when its CLI is available on `PATH`. Cursor is configured when
`~/.cursor` exists, since it ships no CLI. Windows also requires
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
without backups, `--skip-claude` / `-SkipClaude`, `--skip-codex` / `-SkipCodex`,
`--skip-grok` / `-SkipGrok`, and `--skip-cursor` / `-SkipCursor` to skip
individual agents, and `-SkipTerminal` on
Windows to skip PowerShell profile / Windows Terminal setup. Skip flags may be
combined. Install and update preserve existing configuration for absent or
skipped CLIs. Backup and override modes cannot be used together.

These scripts configure agent instructions and skills; they do not install,
remove, or authenticate the Claude Code, Codex, or Grok CLIs, or Cursor. On Windows they
also copy the PowerShell profile, link the theme, and merge managed Windows Terminal
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

| Source            | Claude Code               | Codex                     | Grok                    | Cursor                    |
| ----------------- | ------------------------- | ------------------------- | ----------------------- | ------------------------- |
| `INSTRUCTIONS.md` | `~/.claude/CLAUDE.md`     | `~/.codex/AGENTS.md`      | `~/.grok/AGENTS.md`     | not installed             |
| `skill/<name>`    | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` | `~/.grok/skills/<name>` | `~/.cursor/skills/<name>` |

Each column is created or synchronized only when its CLI is detected on `PATH`
and not explicitly skipped; Cursor is keyed on `~/.cursor` existing instead.
Existing managed links remain untouched otherwise.

Cursor gets skills only. Its user-global rules live in application settings
rather than on disk, so there is no destination for `INSTRUCTIONS.md`. Cursor
also reads `~/.claude/skills/` and `~/.agents/skills/` for compatibility, so the
`~/.cursor/skills/` set matters most when Claude Code and Codex are skipped or
absent.

### Windows terminal (`install.ps1` only; skip with `-SkipTerminal`)

| Source                                        | Destination                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| `powershell/Microsoft.PowerShell_profile.ps1` | `$PROFILE` (**copy**, not symlink; re-install skips existing file unless `-Override`) |
| `powershell/themes/robbyrussell.omp.json`     | `<profile-dir>/themes/robbyrussell.omp.json`                                          |
| managed WT keys                               | live `settings.json` (Store package or unpackaged path)                               |

Managed Windows Terminal keys only:

- `profiles.defaults.background` = `#141414`
- action: `ctrl+shift+t` → `duplicateTab` (same CWD as the current tab; the profile emits OSC 9;9 so Terminal knows the path)

`powershell/required_config.json` is a **reference snapshot**, not fully installed.
Install does not replace the whole Windows Terminal settings file.

### Node/pnpm via WSL (Windows, optional)

Non-interactive `bash` from PowerShell can use Linux Homebrew node/pnpm via
`BASH_ENV` → `~/.wsl_dev_env` (avoids Windows Node shims that fail with
`exec: node: not found`). See [`scripts/windows/README.md`](scripts/windows/README.md).

```powershell
wsl -d Ubuntu-24.04 -- bash /mnt/<drive>/.../dotfiles/scripts/windows/setup-wsl-node.sh
```

Docker: install **Docker Desktop** on Windows (not docker-ce inside the distro).

`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `GROK_HOME` are honored; Cursor has no
equivalent override and always uses `~/.cursor`. The former Claude
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
  On Windows, `install.ps1` **copies** the profile (template; put secrets only on the live `$PROFILE`),
  links the theme, and merges managed
  Windows Terminal keys (`#141414` background, `Ctrl+Shift+T` → `duplicateTab`).
- [`scripts/windows/`](scripts/windows/) — Windows helpers: Node/pnpm-via-WSL
  (`setup-wsl-node.sh`, `wsl_dev_env` + profile `BASH_ENV`), and system cleanup.
- [`.zshrc`](.zshrc) — Zsh configuration.
- [`scripts/install-maestro.sh`](scripts/install-maestro.sh) /
  [`scripts/uninstall-maestro.sh`](scripts/uninstall-maestro.sh) — Maestro CLI +
  Maestro MCP (Java 17+ required; brew or curl; registers/removes on detected
  claude/codex/grok). Hand-run. Not hooked into the main installer.
- [`scripts/mcp/`](scripts/mcp/) — `install-mcp.sh` / `install-mcp.ps1` register
  selected tools (Exa MCP server and the OpenAI Codex Claude Code plugin) with
  every detected agent CLI. Run by hand. Interactive mode shows a
  checkbox list (toggle by number, Enter to confirm). Non-interactive:
  `--mcp exa,codex-cc` / `-Mcp all`. Exa prompts for an optional API key
  (or `--exa-key` / `-ExaKey`); blank = free tier.
  `codex-cc` runs `claude plugin marketplace add
openai/codex-plugin-cc` and `claude plugin install codex@openai-codex -s user`
  (Claude-only; not an MCP). Optional Codex runtime: `npm i -g @openai/codex`.
  Not hooked into the main installer.
