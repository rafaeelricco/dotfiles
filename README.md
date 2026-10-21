# dotfiles

My shared coding-agent skills, instructions, and development configuration.
Skills are linked into detected Claude Code, Codex, Grok, Cursor, and Hermes installations.

## Install a skill

Run as your normal user on macOS or Linux:

```bash
curl -fsSL https://r1cco.com/skills/orchestrate | bash
```

In PowerShell 7:

```powershell
irm https://r1cco.com/skills/orchestrate.ps1 | iex
```

Companion skills are included automatically. `orchestrate` installs seven skills:
`orchestrate`, `scope-and-plan`, `plan-format`, `model-tiers`, `implement`,
`verify`, and `commit-message`. Replace `orchestrate` in the URL with another
available skill. Selected installation preserves other skill links, instructions,
and terminal settings.

To select several skills, preview changes, or list available skills:

```bash
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- orchestrate ui
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- orchestrate --dry-run
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- --help
```

```powershell
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) orchestrate ui
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) orchestrate -DryRun
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) -Help
```

## Full setup

Omit the skill names to install all skills and shared agent instructions.
On Windows, full setup also copies the PowerShell profile when absent, links
the theme, and applies managed Windows Terminal settings.

```bash
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash
```

```powershell
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1')))
```

The remote installer downloads a verified release bundle. Keep its cache:
`${XDG_DATA_HOME:-$HOME/.local/share}/dotfiles`, or the equivalent user-home
location on Windows. `DOTFILES_HOME` can override it.
The installer configures available agents; it does not install or authenticate their CLIs.

## Update

Repeat the same install command to update. Selection controls which skill links
are installed; refreshing the shared bundle also updates the contents used by
skills already linked into that bundle.

## Uninstall

```bash
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- uninstall
```

```powershell
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) uninstall
```

Uninstall removes verified managed links and reversible recorded terminal changes.
It preserves checkouts, cached bundles, copied profiles, and backups.
Add `--dry-run` or `-DryRun` to preview removal.

## Development

Run the checked-out scripts directly. They resolve the checkout from their own
location and never fetch, reset, or clean Git state.

| Action                       | macOS / Linux                                   | PowerShell 7                        |
| ---------------------------- | ----------------------------------------------- | ----------------------------------- |
| Install selected skills      | `bash scripts/install.sh orchestrate`           | `.\install.ps1 orchestrate`         |
| Full setup / reconcile links | `bash scripts/install.sh`                       | `.\install.ps1`                     |
| Preview                      | `bash scripts/install.sh orchestrate --dry-run` | `.\install.ps1 orchestrate -DryRun` |
| Uninstall                    | `bash scripts/uninstall.sh`                     | `.\uninstall.ps1`                   |

Edits to linked checkout skills take effect immediately. Rerun installation after
adding or removing skills. The existing update scripts are compatibility entrypoints.

## Documentation

| Topic                                                                                         | Purpose                                                                          |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Setup guide](docs/setup.md)                                                                  | Commands, flags, prerequisites, installed paths, migration, and troubleshooting. |
| [Deployment](docs/deployment.md)                                                              | Verified releases, VPS runner, Nginx, and recovery.                              |
| [Skills](skill/)                                                                              | Shared agent workflows.                                                          |
| [Neovim](nvim/)                                                                               | Configuration and setup guides.                                                  |
| [PowerShell](powershell/)                                                                     | Profile and terminal theme.                                                      |
| [Zsh](.zshrc)                                                                                 | Shell configuration.                                                             |
| [Windows helpers](scripts/windows/)                                                           | Node/pnpm through WSL and system cleanup.                                        |
| [Colima](scripts/macos/setup-colima.sh)                                                       | Docker setup on Apple Silicon.                                                   |
| [Maestro installer](scripts/install-maestro.sh) / [uninstaller](scripts/uninstall-maestro.sh) | Manual Maestro CLI and MCP setup.                                                |
| [MCP tools](scripts/mcp/)                                                                     | Manual Exa and Codex Claude Code plugin setup.                                   |
