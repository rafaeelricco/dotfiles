# dotfiles

Keeping a development environment reproducible should not require maintaining
the same AI instructions in several vendor-specific trees.

This repository is the source of truth for my Neovim, PowerShell, shell,
Claude Code, and Codex setup. AI tools share one `CLAUDE.md` and one `skill/`
tree, installed through safe, repeatable symlinks.

- **One source of truth:** no generated skill or plugin copies.
- **Safe re-runs:** exact links are no-ops and conflicts can be backed up.
- **Cross-platform:** Bash for macOS/Linux and PowerShell 7 for Windows.

## Quick Install

**Prerequisites:** Git and Claude Code 2.1.203+. Windows also requires
PowerShell 7 plus Developer Mode or an elevated shell for symlinks.

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
without prompting and `--skip-codex` / `-SkipCodex` to install Claude only.

## Update

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/update.sh | bash
```

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/update.ps1')))
```

## Installed Paths

| Source | Claude Code | Codex |
| --- | --- | --- |
| `CLAUDE.md` | `~/.claude/CLAUDE.md` | `~/.codex/AGENTS.md` |
| `skill/<name>` | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` |

`CLAUDE_CONFIG_DIR` and `CODEX_HOME` are honored. The former Claude
marketplace is retired; existing marketplace installations are not removed
automatically.

## Other Dotfiles

- [`nvim/`](nvim/) — Neovim configuration and setup guides.
- [`powershell/`](powershell/) — PowerShell profile and terminal theme.
- [`.zshrc`](.zshrc) — Zsh configuration.
