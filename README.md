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

- **Neovim 0.12+** with clipboard support and Git available in `PATH` (required by the rewritten `nvim-treesitter` on the `main` branch)
- **`tree-sitter` CLI 0.26+** — required at runtime to compile parsers; `nvim-treesitter` no longer bundles it
- **C compiler** on `PATH` (Xcode Command Line Tools on macOS: `xcode-select --install`; `build-essential` on Linux; MSVC Build Tools on Windows) — used by `tree-sitter` to build parsers
- **Node.js 18+** (required for GitHub Copilot and TypeScript tooling)
- **PowerShell 7+** and **Windows Terminal 1.18+** on Windows
- **oh-my-posh**, **posh-git**, **DockerCompletion**, **Get-ChildItemColor**, **PSReadLine** modules installed
- **JetBrainsMono Nerd Font** (or any Nerd Font 3.2+) selected in your terminal

#### Install the `tree-sitter` CLI

```bash
# macOS (Homebrew)
brew install tree-sitter-cli

# Linux / generic (requires npm)
npm install -g tree-sitter-cli

# Alternative: cargo
cargo install tree-sitter-cli
```

Verify with `tree-sitter --version` — `nvim`'s `:checkhealth nvim-treesitter` must report it as ✅ before parsers will compile.

### Installation

```bash
git clone git@github.com:rafaeelricco/dotfiles.git
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

#### One-line install (Claude Code + optional Codex)

Clones this repo to `~/.dotfiles` (override with `--dir` / `$DOTFILES_DIR`) and symlinks
`CLAUDE.md` + `skills` + `agents` into `~/.claude` — and, if Codex is present, `AGENTS.md` +
per-skill links into `~/.codex`. Existing real files are backed up to `<name>.backup-<timestamp>` first;
re-running is a safe no-op.

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/install.sh | bash
# flags: ... | bash -s -- --skip-codex   (also --yes, --dir PATH)
```

```powershell
# Windows (PowerShell 7+; needs Developer Mode or an elevated shell for symlinks)
irm https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/install.ps1 | iex
```

Update later (pull + re-link + refresh the skill marketplace if skills changed):

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/update.sh | bash
```

```powershell
irm https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/update.ps1 | iex
```

#### Claude Code Skills

Link the versioned skills directory so Claude Code resolves it via `~/.claude/skills`:

```bash
# macOS / Linux
mkdir -p "$HOME/.claude"
ln -s "$(pwd)/.claude/skills" "$HOME/.claude/skills"

# Agents link per file: ~/.claude/agents/ also holds agents installed by
# other tools, which a whole-directory symlink would hide.
mkdir -p "$HOME/.claude/agents"
for agent in "$(pwd)"/.claude/agents/*.md; do
  [ -f "$agent" ] || continue
  dest="$HOME/.claude/agents/$(basename "$agent")"
  if [ -e "$dest" ] && [ ! -L "$dest" ]; then
    echo "skip: $dest is a real file, not a link"
    continue
  fi
  ln -sfn "$agent" "$dest"
done
```

On Windows, double-click [`scripts/windows/setup-claude-skills.bat`](scripts/windows/setup-claude-skills.bat) (or right-click → "Run as administrator"). It self-elevates via UAC, creates the skills symlink, and links each `.claude/agents/*.md` into `~/.claude/agents/`. If `~/.claude/skills` already exists as a non-empty real directory, the script aborts so you can move its contents into `./.claude/skills/` first.

> **Note:** agents link per file, so agents installed by other tools stay in place. The `consult-advisor` skill reaches its `opus-advisor` sub-agent through `~/.claude/agents/opus-advisor.md`; without that link the skill cannot resolve it.

#### Claude Code Skill Marketplace

The repo also publishes each `.claude/skills/<skill>` as an individual Claude Code plugin. Add the marketplace once:

```bash
claude plugin marketplace add rafaeelricco/dotfiles
```

Then install only the skills you want:

```bash
claude plugin install create-pr@ricco-skills
claude plugin install prompt-master@ricco-skills
claude plugin install gh-issue-drafter@ricco-skills
```

To install several skills, run one install command per skill. After pulling marketplace updates, refresh the catalog:

```bash
claude plugin marketplace update ricco-skills
```

Marketplace plugin files under `plugins/` are generated from `.claude/skills/`. Regenerate them after editing skills:

```bash
python3 scripts/sync-claude-plugin-marketplace.py
```

After editing a skill:

1. Edit `.claude/skills/<skill>/...`
2. Run `python3 scripts/sync-claude-plugin-marketplace.py`
3. Commit and push `.claude/skills/`, `plugins/`, and `.claude-plugin/`
4. Ask teammates to refresh and update:

```bash
claude plugin marketplace update ricco-skills
claude plugin update <skill>@ricco-skills
```

Claude Code plugins do not load `CLAUDE.md` as global context. To install the global Claude instructions by command, copy them to `~/.claude/CLAUDE.md` with an automatic backup:

```bash
curl -fsSL https://raw.githubusercontent.com/rafaeelricco/dotfiles/main/scripts/install-claude-md.py | python3
```

From a local clone, run:

```bash
python3 scripts/install-claude-md.py
```

#### Codex Skills

Reuse the same `.claude/skills/` directory in the Codex CLI. Codex stores user skills under `~/.codex/skills/`, but its bundled skills live in `~/.codex/skills/.system/`, so we link **per skill** instead of the whole directory:

```bash
# macOS / Linux
mkdir -p "$HOME/.codex/skills"
for dir in .claude/skills/*/; do
  name=$(basename "$dir")
  ln -sfn "$(pwd)/$dir" "$HOME/.codex/skills/$name"
done
```

On Windows, double-click [`scripts/windows/setup-codex-skills.bat`](scripts/windows/setup-codex-skills.bat) (or right-click → "Run as administrator"). It self-elevates via UAC, then loops through `.claude/skills/` and refreshes the per-skill symlinks. Re-run after pulling new skills into the repo.

Both approaches preserve `~/.codex/skills/.system/` (Codex’s bundled skills) by linking per skill instead of symlinking the whole directory.

#### Global Instructions

Link the versioned instruction files so Claude Code and Codex pick them up from the repo:

```bash
# macOS / Linux — verify content first to avoid losing local edits
diff ~/.claude/CLAUDE.md "$(pwd)/.claude/CLAUDE.md"   # expect no output
diff ~/.codex/AGENTS.md  "$(pwd)/.codex/AGENTS.md"    # expect no output

# Then create the symlinks
mkdir -p "$HOME/.claude" "$HOME/.codex"
ln -sfn "$(pwd)/.claude/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
ln -sfn "$(pwd)/.codex/AGENTS.md"  "$HOME/.codex/AGENTS.md"
```

On Windows, the updated [`setup-claude-skills.bat`](scripts/windows/setup-claude-skills.bat) and [`setup-codex-skills.bat`](scripts/windows/setup-codex-skills.bat) handle these links alongside the skills. Re-run them after pulling.

> **Note:** `.claude/CLAUDE.md` is the source. `.codex/AGENTS.md` mirrors it through a symlink.

To verify all setups at any time, run [`scripts/windows/check-skills.bat`](scripts/windows/check-skills.bat) (no elevation needed) — it inspects `~/.claude/skills`, `~/.claude/agents/`, `~/.codex/skills/`, the two instruction files, validates link targets against the repo, and reports any missing entries, orphan skills, or stale agent links.

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

| Component             | Path                                           | Description                                                                                                                                                                                         |
| --------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Neovim Config         | `nvim/`                                        | Modular Lua configuration with custom theme, domain-based plugins, and Blink completion.                                                                                                            |
| PowerShell Profile    | `powershell/in_testing_profile.ps1`            | Full session automation: Oh My Posh prompt, PSReadLine tweaks, directory persistence.                                                                                                               |
| Recovery Profile      | `powershell/recovery_last_session_profile.ps1` | Lightweight profile that prioritizes restoring the last working directory.                                                                                                                          |
| Terminal Template     | `powershell/required_config.json`              | Windows Terminal settings with JetBrainsMono, acrylic, and custom keybindings.                                                                                                                      |
| Windows Cleanup       | `scripts/windows/system-cleanup.bat`           | Elevated maintenance script: clears TEMP, empties Recycle Bin, and runs SFC + DISM repairs.                                                                                                         |
| macOS Cleanup         | `scripts/macos/system-cleanup.sh`              | Maintenance script: clears temp/trash/logs and dev caches (brew/npm/pnpm/yarn/pip), flushes DNS, purges memory, verifies the boot volume, and optionally deletes Time Machine local snapshots.      |
| Claude Skills Setup   | `scripts/windows/setup-claude-skills.bat`      | Self-elevating script that symlinks `.claude/skills/` and `.claude/CLAUDE.md` into `~/.claude/`, and links each `.claude/agents/*.md` into `~/.claude/agents/`.                                     |
| Codex Skills Setup    | `scripts/windows/setup-codex-skills.bat`       | Self-elevating script that links each skill in `.claude/skills/` plus `.codex/AGENTS.md` into `~/.codex/`, preserving `.system/`.                                                                   |
| Skills Check          | `scripts/windows/check-skills.bat`             | Read-only verifier (no elevation) that validates skill links, per-file agent links, and the two instruction-file links against the repo and flags orphans, stale agent links, or missing entries.  |
| Bootstrap Installer   | `scripts/install.sh` / `install.ps1`           | Clone to `~/.dotfiles`, then symlink `CLAUDE.md` / `skills` / `agents` / Codex links into `$HOME` with timestamped backups; idempotent.                                                             |
| Bootstrap Updater     | `scripts/update.sh` / `update.ps1`             | `git pull --ff-only`, re-link, and regenerate the skill marketplace when `.claude/skills` changed.                                                                                                  |
| Claude / Codex Skills | `.claude/skills/`                              | Versioned skills shared between Claude Code (`~/.claude/skills`) and Codex CLI (`~/.codex/skills/<skill>`).                                                                                         |
| Claude Agents         | `.claude/agents/`                              | Sub-agents invoked by skills (e.g. `opus-advisor`, the Opus-model advisor `consult-advisor` escalates hard planning decisions to). Symlinked per-file into `~/.claude/agents/` by the bootstrap installer (macOS/Linux `install.sh`, Windows `install.ps1`), same as skills.                     |
| Claude Instructions   | `.claude/CLAUDE.md`                            | Global Claude Code instructions: quality mode + writing style. Symlinked into `~/.claude/CLAUDE.md`.                                                                                                |
| Codex Instructions    | `.codex/AGENTS.md`                             | Global Codex CLI instructions; identical content to `.claude/CLAUDE.md`. Symlinked into `~/.codex/AGENTS.md`.                                                                                       |

### Available Skills

| Skill | Description |
| --- | --- |
| `babysit` | Keeps a GitHub PR merge-ready: triages conflicts, review feedback, and CI failures in a loop. |
| `caveman` | Ultra-compressed communication mode; cuts token usage ~75%. |
| `coding-standards` | Functional, type-safe implementation style for code creation, refactors, and reviews. |
| `consult-advisor` | Escalates hard planning/architecture decisions to the `opus-advisor` sub-agent (`.claude/agents/`) before executing. |
| `create-pr` | Creates and opens GitHub pull requests from local changes, gated by plan-mode approval. |
| `gh-issue-drafter` | Drafts structured GitHub issues (Situation, Direction, Acceptance Criteria, Validation). |
| `grill-me` | Interviews the user relentlessly to stress-test a plan or design before building. |
| `meeting-notes-and-actions` | Turns meeting transcripts/notes into share-ready recaps and owner-tagged action items. |
| `plan-format` | Formats implementation plans as real before/after diffs, not prose. |
| `pr-generate-description` | Generates structured PR descriptions from git diffs via an interactive questionnaire. |
| `prompt-master` | Writes and optimizes prompts for other AI tools. |
| `stop-slop` | Removes AI writing patterns and tells from prose. |
| `story-mapping` | Jeff Patton-style user story mapping for release planning and backlog sequencing. |

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
