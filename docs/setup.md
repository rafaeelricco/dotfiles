# Setup guide

[Back to the README](../README.md).

## Agent setup

AI tools share one `INSTRUCTIONS.md` and one `skill/` tree through symlinks.
There are no generated skill or plugin copies.
Repeated runs leave exact links alone. Conflicts can be backed up or explicitly overridden.

A skill's body loads when the skill is used.
Explicit-only skills carry `disable-model-invocation: true` for Claude Code and remain available through explicit invocation.

Git is required. Bash scripts support macOS and Linux; Windows requires PowerShell 7.
Claude Code 2.1.203+, Codex, Grok, and Hermes are optional.
Each is configured only when its CLI is on `PATH`.
Cursor is configured when `~/.cursor` exists, since it ships no CLI.
Windows requires Developer Mode or an elevated shell when agent or terminal setup needs symlinks.

These scripts configure agent instructions and skills.
They do not install, remove, or authenticate Claude Code, Codex, Grok, Cursor, or Hermes.
Windows setup also copies the PowerShell profile, links the theme, and merges managed Windows Terminal keys.
Use `-SkipTerminal` to skip this setup.

## Installer options

The default managed clone is `~/.dotfiles`.

| Bash            | PowerShell      | Purpose                                               |
| --------------- | --------------- | ----------------------------------------------------- |
| `--dir PATH`    | `-Dir PATH`     | Override the clone path. `DOTFILES_DIR` also sets it. |
| `--yes`         | `-Yes`          | Back up conflicts without prompting.                  |
| `--override`    | `-Override`     | Permanently remove conflicts without backups.         |
| `--skip-claude` | `-SkipClaude`   | Skip Claude Code.                                     |
| `--skip-codex`  | `-SkipCodex`    | Skip Codex.                                           |
| `--skip-grok`   | `-SkipGrok`     | Skip Grok.                                            |
| `--skip-cursor` | `-SkipCursor`   | Skip Cursor.                                          |
| `--skip-hermes` | `-SkipHermes`   | Skip Hermes.                                          |
|                 | `-SkipTerminal` | Skip PowerShell profile and Windows Terminal setup.   |

Skip flags can be combined. Backup and override modes cannot be used together.
Install and update preserve existing configuration for absent or skipped CLIs.

## Local and managed installs

Remote install creates a managed clone.
Local mode uses the primary checkout without cloning or changing Git state.
Edits to existing skills take effect immediately.
After adding or removing a skill, run local update to refresh the global links.
See the [README commands](../README.md#development).

Managed update fetches GitHub `main` and resets local `main` to that commit.
It removes untracked, ignored, and nested-repository paths with `git clean -ffdx`.
Running update authorizes this cleanup.
The `--yes` / `-Yes` flag still means to back up installer conflicts without prompting.

Local update refreshes links from the checkout that created the installation.
It never fetches, pulls, checks out, resets, cleans, commits, or changes the index or working tree.

Managed mode records link destinations, backups, and directories in `<clone>/.git/dotfiles-lifecycle-state`.
Local mode records the same data plus its source checkout. Its state file is:

- macOS/Linux: `${XDG_STATE_HOME:-~/.local/state}/dotfiles/local-install-state`
- Windows: `%LOCALAPPDATA%\dotfiles\local-install-state`

Managed and local modes cannot coexist.
To switch to local mode, uninstall the managed installation first, then run the checked-out installer with `--local` / `-Local`.
No install command automatically deletes an existing repository.

Managed state survives update and is deleted with the clone.
Older installations may have used a custom `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GROK_HOME`, or `HERMES_HOME`.
Supply that variable once when running the updated installer, updater, or uninstaller.
This lets the script record or safely clean that location.

Managed clones must use the official GitHub HTTPS or SSH origin.
They must be standalone checkouts at the exact `--dir` / `-Dir` path, with no linked worktrees.
Local mode requires the primary checkout and permits other linked worktrees.
A linked worktree cannot be the local source.

## Uninstall behavior

Local uninstall removes recorded links and backups while preserving the checkout.
Remote uninstall of an existing installation requires `--yes` / `-Yes`.
When run interactively without that flag, type the exact token `UNINSTALL`.
Any other response cancels without changes. A noninteractive run without the flag exits with status 2.
An already-absent installation exits successfully before confirmation.

Uninstall removes only verified managed links, state-recorded backups, and empty installer-created directories.
Managed uninstall also removes the verified clone.
Recorded backups are deleted, not restored, even if their contents changed later.
Move any backup you want to keep elsewhere before uninstalling.
Unmanaged paths, nonempty directories, and backups created before state tracking are preserved.

Help, cancellation, successful cleanup, and an already-absent clone exit 0.
Repository validation and filesystem failures exit 1; Bash argument errors exit
2, while PowerShell parameter-binding errors use PowerShell's nonzero status.

On Windows, uninstall also removes recorded managed Windows Terminal settings.

## Installed paths

| Source            | Claude Code               | Codex                     | Grok                    | Cursor                    | Hermes                    |
| ----------------- | ------------------------- | ------------------------- | ----------------------- | ------------------------- | ------------------------- |
| `INSTRUCTIONS.md` | `~/.claude/CLAUDE.md`     | `~/.codex/AGENTS.md`      | `~/.grok/AGENTS.md`     | not installed             | not installed             |
| `skill/<name>`    | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` | `~/.grok/skills/<name>` | `~/.cursor/skills/<name>` | `~/.hermes/skills/<name>` |

The paths above are created or updated only when the agent CLI is on `PATH` and is not skipped.
Cursor is detected through `~/.cursor` instead. Otherwise, existing managed links stay untouched.

Hermes gets per-skill links in the existing `$HERMES_HOME/skills` directory.
That directory is never replaced, so bundled and hub skills stay.
The default Hermes home on Windows is `%LOCALAPPDATA%\hermes` instead of `~/.hermes`.

Cursor gets skills only. Its global rules live in application settings, so there is no destination for `INSTRUCTIONS.md`.
It also reads `~/.claude/skills/` and `~/.agents/skills/` for compatibility.
The `~/.cursor/skills/` links matter most when Claude Code and Codex are skipped or absent.

The scripts honor `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GROK_HOME`, and `HERMES_HOME`.
Cursor has no equivalent override and always uses `~/.cursor`.
The former Claude marketplace is retired. Existing marketplace installations are not removed automatically.

## Windows terminal

Windows `install.ps1` sets up the following unless `-SkipTerminal` is used.

| Source                                        | Destination                                                                       |
| --------------------------------------------- | --------------------------------------------------------------------------------- |
| `powershell/Microsoft.PowerShell_profile.ps1` | `$PROFILE` (copy, not symlink; re-install skips existing file unless `-Override`) |
| `powershell/themes/robbyrussell.omp.json`     | `<profile-dir>/themes/robbyrussell.omp.json`                                      |
| managed WT keys                               | live `settings.json` (Store package or unpackaged path)                           |

Managed Windows Terminal keys only:

- `profiles.defaults.background` = `#141414`
- action: `ctrl+shift+t` → `duplicateTab` in the current tab's directory.
  The profile emits OSC 9;9 so Terminal knows that path.

`powershell/required_config.json` is a reference snapshot and is not fully installed.
Install does not replace the whole Windows Terminal settings file.

Keep secrets only in the live `$PROFILE`; the repository profile is a template.

## Optional tools

### Node/pnpm via WSL

Non-interactive `bash` from PowerShell can use Linux Homebrew node/pnpm through `BASH_ENV` and `~/.wsl_dev_env`.
This avoids Windows Node shims that fail with `exec: node: not found`.
See [`scripts/windows/README.md`](../scripts/windows/README.md).

```powershell
wsl -d Ubuntu-24.04 -- bash /mnt/<drive>/.../dotfiles/scripts/windows/setup-wsl-node.sh
```

On Windows, install Docker Desktop rather than docker-ce inside the distro.
On Apple Silicon macOS, use Colima through [`scripts/macos/setup-colima.sh`](../scripts/macos/setup-colima.sh) rather than Docker Desktop.

- [`scripts/windows/`](../scripts/windows/): Node/pnpm through WSL and system cleanup.
  Uses `setup-wsl-node.sh`, `wsl_dev_env`, and the profile's `BASH_ENV` setting.
- [`scripts/macos/setup-colima.sh`](../scripts/macos/setup-colima.sh): Colima and Docker CLI on Apple Silicon.
  Uses vz, virtiofs, and Rosetta with 4 CPU / 8 GiB / 50 GiB.
  Run it by hand; the main installer does not run it.
  It only writes the template. Run `colima start` later.
  To remove it, run `colima delete`, then `brew uninstall colima docker docker-compose docker-buildx`.
- [`scripts/install-maestro.sh`](../scripts/install-maestro.sh) /
  [`scripts/uninstall-maestro.sh`](../scripts/uninstall-maestro.sh): Install or remove Maestro CLI and Maestro MCP.
  Requires Java 17+ and uses brew or curl. Registers or removes Maestro MCP on detected claude/codex/grok.
  Run these scripts by hand; the main installer does not run them.
- [`scripts/mcp/`](../scripts/mcp/): `install-mcp.sh` / `install-mcp.ps1` register
  selected tools (Exa MCP server and the OpenAI Codex Claude Code plugin) with
  every detected agent CLI. Run these scripts by hand; the main installer does not run them.
  Interactive mode shows a checkbox list. Toggle by number and press Enter to confirm.
  Non-interactive:
  `--mcp exa,codex-cc` / `-Mcp all`. Exa prompts for an optional API key
  (or `--exa-key` / `-ExaKey`); blank = free tier.
  `codex-cc` runs `claude plugin marketplace add
openai/codex-plugin-cc` and `claude plugin install codex@openai-codex -s user`.
  It is a Claude-only plugin, not an MCP. Optional Codex runtime: `npm i -g @openai/codex`.

## Troubleshooting

If a previous command created `~/.agents` as root, restore user ownership
before installing:

```bash
sudo chown -R "$(id -un):$(id -gn)" "$HOME/.agents"
```

Run the installer as your normal user, not with `sudo`.
