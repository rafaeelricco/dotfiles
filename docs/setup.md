# Setup guide

[Back to the README](../README.md).

## Agent setup

AI tools share one `INSTRUCTIONS.md` and one `skill/` tree through symlinks.
There are no generated skill or plugin copies.
Exact links are left alone on repeated runs. Conflicts can be backed up or explicitly overridden.

A skill's body loads when the skill is used.
Explicit-only skills carry `disable-model-invocation: true` for Claude Code and remain available through explicit invocation.

Git is required. Bash scripts support macOS and Linux; Windows requires PowerShell 7.
Claude Code 2.1.203+, Codex, Grok, and Hermes are optional.
Each is configured only when its CLI is on `PATH`.
Cursor is configured when `~/.cursor` exists, since it ships no CLI.
Windows requires Developer Mode or an elevated shell when agent or terminal setup needs symlinks.

These scripts configure agent instructions and skills.
They do not install, remove, or authenticate Claude Code, Codex, Grok, Cursor, or Hermes.
Windows setup also copies the PowerShell profile, links the theme, and merges managed Windows Terminal keys unless `-SkipTerminal` is used.

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

Remote install uses managed mode. Local mode uses the primary checkout without creating another clone or changing Git state.
Edits to existing skills take effect immediately. After adding or removing a skill, run local update to reconcile the global links.
See the [README commands](../README.md#development).

Managed update fetches GitHub `main`, forces local `main` to that commit, and removes untracked, ignored, and nested-repository paths with `git clean -ffdx`.
Invoking update authorizes this cleanup. The `--yes` / `-Yes` flag still means to back up installer conflicts without prompting.

Local update only reconciles links from the checkout that created the installation.
It never fetches, pulls, checks out, resets, cleans, commits, or changes the index or working tree.

Managed mode records link destinations, backups, and directories in
`<clone>/.git/dotfiles-lifecycle-state`. Local mode records the same data plus
its source checkout in `${XDG_STATE_HOME:-~/.local/state}/dotfiles/local-install-state`
on macOS/Linux and `%LOCALAPPDATA%\dotfiles\local-install-state` on Windows.

Managed and local modes cannot coexist. To migrate, uninstall the managed
installation first, then run the checked-out installer with `--local` / `-Local`.
No install command automatically deletes an existing repository.

Managed state survives update and is deleted with the clone.
Older installations may have used a custom `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GROK_HOME`, or `HERMES_HOME`.
Supply that variable once when running the updated installer, updater, or uninstaller.
This lets the script record or safely clean that location.

Managed clones must use the official GitHub HTTPS or SSH origin, be standalone
checkouts at the exact path passed through `--dir` / `-Dir`, and have no linked
worktrees. Local mode requires the primary checkout but permits other linked
worktrees to exist. A linked worktree itself cannot be the local source.

## Uninstall behavior

Local uninstall removes recorded links and backups while preserving the checkout.
For an existing installation, remote uninstall requires `--yes` / `-Yes`.
For an existing installation, interactive execution without that flag requires typing the exact token `UNINSTALL`.
Any other response cancels without changes. A noninteractive run without the flag exits with status 2.
An already-absent installation exits successfully before confirmation.

Uninstall removes only verified managed links, state-recorded backups, empty
installer-created directories, and finally the verified clone. Recorded
backups are deleted, not restored, even if their contents changed later. Move a
backup elsewhere before uninstall if it should be retained. Unmanaged paths,
nonempty directories, and backups created before state tracking are preserved.

Help, cancellation, successful cleanup, and an already-absent clone exit 0.
Repository validation and filesystem failures exit 1; Bash argument errors exit
2, while PowerShell parameter-binding errors use PowerShell's nonzero status.

On Windows, uninstall also removes recorded managed Windows Terminal settings.

## Installed paths

| Source            | Claude Code               | Codex                     | Grok                    | Cursor                    | Hermes                    |
| ----------------- | ------------------------- | ------------------------- | ----------------------- | ------------------------- | ------------------------- |
| `INSTRUCTIONS.md` | `~/.claude/CLAUDE.md`     | `~/.codex/AGENTS.md`      | `~/.grok/AGENTS.md`     | not installed             | not installed             |
| `skill/<name>`    | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` | `~/.grok/skills/<name>` | `~/.cursor/skills/<name>` | `~/.hermes/skills/<name>` |

Each column is created or synchronized only when its CLI is detected on `PATH`
and not explicitly skipped; Cursor is keyed on `~/.cursor` existing instead.
Existing managed links remain untouched otherwise.
Hermes is skills-only: per-skill links into the existing `$HERMES_HOME/skills`
directory (never replace that tree; bundled/hub skills stay). Windows default
home is `%LOCALAPPDATA%\hermes` instead of `~/.hermes`.

Cursor gets skills only. Its user-global rules live in application settings
rather than on disk, so there is no destination for `INSTRUCTIONS.md`. Cursor
also reads `~/.claude/skills/` and `~/.agents/skills/` for compatibility, so the
`~/.cursor/skills/` set matters most when Claude Code and Codex are skipped or
absent.

`CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GROK_HOME`, and `HERMES_HOME` are honored; Cursor has no
equivalent override and always uses `~/.cursor`. The former Claude
marketplace is retired; existing marketplace installations are not removed
automatically.

## Windows terminal

Windows `install.ps1` sets up the following unless `-SkipTerminal` is used.

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

Keep secrets only in the live `$PROFILE`; the repository profile is a template.

## Optional tools

### Node/pnpm via WSL

Non-interactive `bash` from PowerShell can use Linux Homebrew node/pnpm via
`BASH_ENV` → `~/.wsl_dev_env` (avoids Windows Node shims that fail with
`exec: node: not found`). See [`scripts/windows/README.md`](../scripts/windows/README.md).

```powershell
wsl -d Ubuntu-24.04 -- bash /mnt/<drive>/.../dotfiles/scripts/windows/setup-wsl-node.sh
```

Docker: install **Docker Desktop** on Windows (not docker-ce inside the distro).
On Apple Silicon macOS, use Colima via [`scripts/macos/setup-colima.sh`](../scripts/macos/setup-colima.sh), not Docker Desktop.

- [`scripts/windows/`](../scripts/windows/): Windows helpers: Node/pnpm-via-WSL
  (`setup-wsl-node.sh`, `wsl_dev_env` + profile `BASH_ENV`), and system cleanup.
- [`scripts/macos/setup-colima.sh`](../scripts/macos/setup-colima.sh): Colima +
  Docker CLI on Apple Silicon (vz, virtiofs, Rosetta; 4 CPU / 8 GiB / 50 GiB).
  Hand-run; writes the template only (`colima start` later). Not hooked into
  the main installer. Teardown: `colima delete` then
  `brew uninstall colima docker docker-compose docker-buildx`.
- [`scripts/install-maestro.sh`](../scripts/install-maestro.sh) /
  [`scripts/uninstall-maestro.sh`](../scripts/uninstall-maestro.sh): Maestro CLI +
  Maestro MCP (Java 17+ required; brew or curl; registers/removes on detected
  claude/codex/grok). Hand-run. Not hooked into the main installer.
- [`scripts/mcp/`](../scripts/mcp/): `install-mcp.sh` / `install-mcp.ps1` register
  selected tools (Exa MCP server and the OpenAI Codex Claude Code plugin) with
  every detected agent CLI. Run by hand. Interactive mode shows a
  checkbox list (toggle by number, Enter to confirm). Non-interactive:
  `--mcp exa,codex-cc` / `-Mcp all`. Exa prompts for an optional API key
  (or `--exa-key` / `-ExaKey`); blank = free tier.
  `codex-cc` runs `claude plugin marketplace add
openai/codex-plugin-cc` and `claude plugin install codex@openai-codex -s user`
  (Claude-only; not an MCP). Optional Codex runtime: `npm i -g @openai/codex`.
  Not hooked into the main installer.

## Troubleshooting

If a previous command created `~/.agents` as root, restore user ownership
before installing:

```bash
sudo chown -R "$(id -un):$(id -gn)" "$HOME/.agents"
```

Run the installer as your normal user, not with `sudo`.
