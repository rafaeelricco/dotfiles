# dotfiles

My shared coding-agent skills, instructions, and development configuration.
Skills are linked into detected Claude Code, Codex, Grok, Cursor, and Hermes installations.

## Install a skill

Run as your normal user on macOS or Linux:

```bash
curl -fsSL https://r1cco.com/skills/verify | bash
```

In PowerShell 7:

```powershell
irm https://r1cco.com/skills/verify.ps1 | iex
```

Companion skills are included automatically when required. Replace `verify` in
the URL with another available skill. Selected installation preserves other
skill links, instructions, and terminal settings.

To select several skills, preview changes, or list available skills:

```bash
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- verify ui
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- verify --dry-run
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- --help
```

```powershell
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) verify ui
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) verify -DryRun
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

If you installed `orchestrate` or `scope-and-plan`, run the
current installer from [Full setup](#full-setup) without skill names. Full setup
removes stale managed links and installs the current skill set.

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

| Action                       | macOS / Linux                              | PowerShell 7                   |
| ---------------------------- | ------------------------------------------ | ------------------------------ |
| Install selected skills      | `bash scripts/install.sh verify`           | `.\install.ps1 verify`         |
| Full setup / reconcile links | `bash scripts/install.sh`                  | `.\install.ps1`                |
| Preview                      | `bash scripts/install.sh verify --dry-run` | `.\install.ps1 verify -DryRun` |
| Uninstall                    | `bash scripts/uninstall.sh`                | `.\uninstall.ps1`              |

Edits to linked checkout skills take effect immediately. Rerun installation after
adding or removing skills. The existing update scripts are compatibility entrypoints.

## Deliver a change

Install the workflow and its companion skills with `bash scripts/install.sh deliver`
or `.\install.ps1 deliver`. In a new session, use `$deliver <implementation task>` to
implement, verify, open a Ready for review PR, and follow CI and review. Add
`draft` or a narrower stopping point to the request when you want one.

## Documentation

| Topic                                                                                         | Purpose                                                                          |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Setup guide](docs/setup.md)                                                                  | Commands, flags, prerequisites, installed paths, migration, and troubleshooting. |
| [Deployment](docs/deployment.md)                                                              | Verified releases, VPS runner, Nginx, and recovery.                              |
| [Installer verification](docs/deployment.md#installer-checks)                                 | Focused checks for selected install, preview, and release updates.               |
| [Skills](skill/)                                                                              | Shared agent workflows.                                                          |
| [Neovim](nvim/)                                                                               | Configuration and setup guides.                                                  |
| [PowerShell](powershell/)                                                                     | Profile and terminal theme.                                                      |
| [Zsh](.zshrc)                                                                                 | Shell configuration.                                                             |
| [Windows helpers](scripts/windows/)                                                           | Node/pnpm through WSL and system cleanup.                                        |
| [Colima](scripts/macos/setup-colima.sh)                                                       | Docker setup on Apple Silicon.                                                   |
| [Maestro installer](scripts/install-maestro.sh) / [uninstaller](scripts/uninstall-maestro.sh) | Manual Maestro CLI and MCP setup.                                                |
| [MCP tools](scripts/mcp/)                                                                     | Manual Exa and Codex Claude Code plugin setup.                                   |
