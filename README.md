# dotfiles

My Neovim, PowerShell, and shell configuration, with shared AI instructions and skills.
Supports Claude Code, Codex, Grok, Cursor, and Hermes.

Agent instructions and skills are linked from one `INSTRUCTIONS.md` and one `skill/` tree.

## Install

Requires Git. Windows also requires PowerShell 7 and Developer Mode or an elevated shell when symlinks are needed.
Run the installer as your normal user. On macOS and Linux, do not use `sudo`.

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/install.ps1')))
```

The installer clones to `~/.dotfiles` and configures available agents.
It does not install or authenticate agent CLIs.
On Windows, it also sets up the PowerShell profile, theme, and managed Windows Terminal settings.

See the [setup guide](docs/setup.md) for agent requirements, options, and installed paths.

## Update

Managed update resets the clone to GitHub `main`, discarding local changes.
It also deletes untracked and ignored files, including nested repositories.

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/update.sh | bash
```

Windows PowerShell:

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/update.ps1')))
```

For a local installation, use the commands under [Development](#development).

## Documentation

| Topic                                                                             | Purpose                                                         |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| [Setup guide](docs/setup.md)                                                      | Options, installed paths, lifecycle rules, and troubleshooting. |
| [Skills](skill/)                                                                  | Shared agent workflows.                                         |
| [Neovim](nvim/)                                                                   | Configuration and setup guides.                                 |
| [PowerShell](powershell/)                                                         | Profile and terminal theme.                                     |
| [Zsh](.zshrc)                                                                     | Shell configuration.                                            |
| [Windows helpers](scripts/windows/)                                               | Node/pnpm through WSL and system cleanup.                       |
| [Colima](scripts/macos/setup-colima.sh)                                           | Docker setup on Apple Silicon.                                  |
| [Maestro](scripts/install-maestro.sh) / [uninstall](scripts/uninstall-maestro.sh) | Manual Maestro CLI and MCP setup.                               |
| [MCP tools](scripts/mcp/)                                                         | Manual Exa and Codex Claude Code plugin setup.                  |

## Uninstall

Managed uninstall removes installed links, recorded backups, and the clone.
Backups are deleted, not restored. Move any backup you want to keep elsewhere first.
These remote commands require the confirmation flag:

macOS and Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/uninstall.sh | bash -s -- --yes
```

Windows PowerShell:

```powershell
& ([scriptblock]::Create((irm 'https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/uninstall.ps1'))) -Yes
```

Local uninstall preserves the checkout. It still deletes recorded backups.
See the [setup guide](docs/setup.md#uninstall-behavior) for confirmation and cleanup details.

## Development

Run these commands from the primary checkout:

| Action       | macOS / Linux                       | Windows PowerShell       |
| ------------ | ----------------------------------- | ------------------------ |
| Install      | `bash scripts/install.sh --local`   | `.\install.ps1 -Local`   |
| Update links | `bash scripts/update.sh --local`    | `.\update.ps1 -Local`    |
| Uninstall    | `bash scripts/uninstall.sh --local` | `.\uninstall.ps1 -Local` |

Local mode links directly to this checkout without cloning or changing Git state.
Edits to existing skills take effect immediately. Run local update after adding or removing a skill.

Managed and local installations cannot coexist. Uninstall the managed installation before switching to local mode.
