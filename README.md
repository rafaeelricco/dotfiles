# Personal Dotfiles

Domain-driven Neovim and Windows Terminal configuration focused on reproducible workflows across macOS and Windows.

## Features
- **Modular Neovim Architecture**: `lazy.nvim` loads plugins by domain (AI, completion, LSP, UI, Git) for predictable startup and maintenance.
- **Smart Editing Defaults**: Custom keymaps, Treesitter, Conform formatting, and Blink completion tuned to coexist with GitHub Copilot.
- **Custom Dark Theme**: Hand-crafted colorscheme with Nerd Font icons, mini.statusline, Neo-tree, and Telescope integrations.
- **Integrated Developer Tooling**: Mason auto-installs Pyright and TypeScript LS, while Neogit, Gitsigns, and diagnostics bindings streamline Git and LSP tasks.
- **PowerShell Session Intelligence**: Oh My Posh prompt, PSReadLine tweaks, and tab-aware directory persistence designed for Windows Terminal.

## Quick Start

### Prerequisites
- **Neovim 0.9+** with clipboard support and Git available in `PATH`
- **Node.js 18+** (required for GitHub Copilot and TypeScript tooling)
- **PowerShell 7+** and **Windows Terminal 1.18+** on Windows
- **oh-my-posh**, **posh-git**, **DockerCompletion**, **Get-ChildItemColor**, **PSReadLine** modules installed
- **JetBrainsMono Nerd Font** (or any Nerd Font 3.2+) selected in your terminal

### Installation

```bash
git clone git@github.com:r1cco/dotfiles.git
cd dotfiles
```

### Link Configuration

```bash
# macOS / Linux
ln -s "$(pwd)/nvim/init.lua" "$HOME/.config/nvim/init.lua"
ln -s "$(pwd)/nvim/lua" "$HOME/.config/nvim/lua"

# Optional: keep lazy.nvim lock file in sync if you generate one
# ln -s "$(pwd)/nvim/lazy-lock.json" "$HOME/.config/nvim/lazy-lock.json"
```

On Windows Terminal, reference `powershell/in_testing_profile.ps1` in your profile command line or import the bundled settings template:

```powershell
Copy-Item powershell/required_config.json `
  "$env:LOCALAPPDATA\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json"
```

Set the profile command line to:

```text
"C:\Program Files\PowerShell\7\pwsh.exe" -NoLogo -NoExit -ExecutionPolicy RemoteSigned -File "D:\personal\projects\dotfiles\powershell\in_testing_profile.ps1"
```

Adjust the path to match where you cloned the repository.

### Environment Configuration

**Neovim (`~/.config/nvim`)**

- Ensure the terminal uses a Nerd Font so icon providers stay enabled.
- Launch Neovim and run `:Lazy sync` to bootstrap plugins.
- Run `:MasonToolsUpdate` after the first sync to install language servers.
- Toggle optional AI helpers via `domains/ai.lua` (Claude bindings are ready but disabled by default).

**PowerShell / Windows Terminal**

- Set `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` if scripts are blocked.
- Verify the modules listed in `in_testing_profile.ps1` are installed (`Install-Module posh-git`, etc.).
- The profile stores tab state under `%APPDATA%\terminal_dirs`; delete this directory to reset saved locations.
- `recovery_last_session_profile.ps1` provides a lean variant that immediately restores the last tab directory.

## Development

### Neovim

```bash
# Sync and validate plugins headlessly
nvim --headless "+Lazy sync" "+MasonToolsUpdate" +qa

# Regenerate plugin metadata after edits
nvim --headless "+Lazy reload" +qa
```

Inside Neovim:

- `:Lazy` opens the plugin manager dashboard.
- `:Mason` manages installed language servers and formatters.
- `<leader>f` formats using Conform with LSP fallback.

### PowerShell

```powershell
# Test the profile without altering your default session
pwsh -NoLogo -NoProfile -File .\powershell\in_testing_profile.ps1

# Inspect saved tab directories
pwsh -Command "Import-Module .\powershell\in_testing_profile.ps1; tabs"
```

### Available Components

| Component | Path | Description |
|-----------|------|-------------|
| Neovim Config | `nvim/` | Modular Lua configuration with custom theme, domain-based plugins, and Blink completion. |
| PowerShell Profile | `powershell/in_testing_profile.ps1` | Full session automation: Oh My Posh prompt, PSReadLine tweaks, directory persistence. |
| Recovery Profile | `powershell/recovery_last_session_profile.ps1` | Lightweight profile that prioritizes restoring the last working directory. |
| Terminal Template | `powershell/required_config.json` | Windows Terminal settings with JetBrainsMono, acrylic, and custom keybindings. |

### Type Checking

```bash
# Run Neovim health checks
nvim --headless "+checkhealth" +qa

# Validate Treesitter parsers
nvim --headless "+TSUpdateSync" +qa
```

### Production Build

```bash
# Freeze plugin versions (creates/updates lazy-lock.json)
nvim --headless "+Lazy lock" +qa

# Clean unused plugins after deletions
nvim --headless "+Lazy clean" +qa
```

### Other Commands

```bash
# Reset plugin state (forces a fresh bootstrap on next start)
rm -rf "$HOME/.local/share/nvim/lazy" "$HOME/.local/state/nvim"

# Remove cached tab directories (PowerShell)
Remove-Item "$env:APPDATA\terminal_dirs" -Recurse -Force
```

## License

Personal configuration files. All rights reserved unless explicit permission is granted.

## Support

Open an issue in this repository for bugs or enhancements, or contact @rafaeelricco directly for access requests.

---

Crafted for my daily workflow—modify freely for yours.
