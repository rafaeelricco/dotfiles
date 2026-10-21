# Setup guide

[Back to the README](../README.md) · [Deployment](deployment.md)

## Requirements

Remote Bash installation supports macOS Bash 3.2 and Linux. It needs a download
tool, `tar`, and SHA-256 verification (`shasum` or `sha256sum`). The published
examples use `curl`. PowerShell installation requires PowerShell 7, with its
built-in download, ZIP, and hashing facilities. Git is needed to obtain or develop
a checkout, not to install a published bundle.

The scripts configure agent instructions and skills. They do not install,
remove, or authenticate agent CLIs. Claude Code, Codex, Grok, and Hermes are
configured when detected on `PATH` and not skipped; PowerShell also recognizes
existing agent configuration directories. Cursor is detected through `~/.cursor`. Claude explicit-only skills remain available through explicit invocation.
Windows symlinks require Developer Mode or suitable privileges. Run as your normal user.

## Commands

Install or update one skill and its companions:

```bash
curl -fsSL https://r1cco.com/skills/orchestrate | bash
```

```powershell
irm https://r1cco.com/skills/orchestrate.ps1 | iex
```

Choose several skills, preview, or show the available skills and options:

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

No skill names, or `all`, selects full setup: all skills plus agent instructions
and Windows terminal setup. Named skills install only skill links and companions;
they preserve existing instruction files and terminal settings. Other installed
skills remain linked. Duplicate dependencies are installed once.

### Companion skills

The source of truth is [`skill/dependencies.txt`](../skill/dependencies.txt).

| Selected skill   | Direct companions                            |
| ---------------- | -------------------------------------------- |
| `orchestrate`    | `scope-and-plan`, `verify`, `commit-message` |
| `scope-and-plan` | `plan-format`, `model-tiers`, `implement`    |
| `implement`      | `model-tiers`                                |
| `babysit`        | `verify`, `commit-message`                   |
| `create-pr`      | `plan-format`, `commit-message`, `pr-body`   |
| `pr-body`        | `commit-message`                             |

Transitive resolution makes a fresh `orchestrate` install contain exactly seven
skills. Companion installation includes conditional workflow steps such as commits.

## Options and confirmation

| Bash            | PowerShell      | Meaning                                          |
| --------------- | --------------- | ------------------------------------------------ |
| `--dry-run`     | `-DryRun`       | Preview installation or removal.                 |
| `-h`, `--help`  | `-Help`         | Show commands, available skills, and options.    |
| `--skip-claude` | `-SkipClaude`   | Skip Claude Code during installation.            |
| `--skip-codex`  | `-SkipCodex`    | Skip Codex during installation.                  |
| `--skip-grok`   | `-SkipGrok`     | Skip Grok during installation.                   |
| `--skip-cursor` | `-SkipCursor`   | Skip Cursor during installation.                 |
| `--skip-hermes` | `-SkipHermes`   | Skip Hermes during installation.                 |
| —               | `-SkipTerminal` | Skip Windows profile, theme, and terminal setup. |

Every installation prints its plan first. A normal terminal asks `[Y/n]`; piped
execution applies the displayed plan. Existing unrelated paths block unattended
replacement. Interactive replacement requires typing `yes` after seeing the paths.
Exact managed links are no-ops. Existing copied profiles are preserved.

Dry-run and cancellation leave active bundle contents, links, and lifecycle records
unchanged. A remote preview may download and extract a temporary release for validation.
Help and invalid arguments do not install a bundle.

## Bundle and checkout installation

The remote fetcher stages and validates a commit-addressed release before changing
the active bundle. The default cache is `${XDG_DATA_HOME:-$HOME/.local/share}/dotfiles`
on macOS/Linux and `${XDG_DATA_HOME:-$USERPROFILE/.local/share}/dotfiles` on Windows.
Set an absolute `DOTFILES_HOME` to use another cache location. Keep the cache while
skills are linked into it. Failed cache replacement restores the previous bundle.

Repeat the same remote install command to update. The complete bundle is refreshed,
so already-linked skills using that cache receive updated contents too. Selection
controls which links are installed, not which files are downloaded.

For a checkout, run `bash scripts/install.sh orchestrate` or `.\install.ps1 orchestrate`.
The script uses its own checkout location and never changes Git state. Full setup
uses the same command without skill names. Edits to existing linked skills take
effect immediately; rerun installation to reconcile added or removed skills.
The existing update scripts reconcile a checkout or fetch a fresh installed bundle.

The scripts continue to honor `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `GROK_HOME`, and
`HERMES_HOME`. Cursor always uses `~/.cursor`. Agent skip flags can be combined;
absent and skipped agents retain their existing configuration.

## State and migration

Version-2 tab-separated lifecycle state lives outside the bundle:

- macOS/Linux: `${XDG_STATE_HOME:-$HOME/.local/state}/dotfiles/install-state`
- Windows: `%LOCALAPPDATA%\dotfiles\install-state`

It records source roots, owned links, preserved backups, created directories,
imports, and terminal changes. A shared mutation lock serializes lifecycle operations.
Validated sources from both a checkout and a bundle can remain recorded together.

### Upgrade from the legacy clone installer

Use the new hosted installer for the first upgrade. Legacy updaters reset and
clean their clone before invoking the newer installer, so do not use a saved old
updater to perform this migration.

The importer recognizes the old `~/.dotfiles` clone, custom legacy locations from
`DOTFILES_DIR`, managed `.git/dotfiles-lifecycle-state`, and user
`local-install-state` records. Imports are validated and tracked once. Old checkouts,
local edits, backups, and unselected skill links are preserved.

Legacy `--yes`/`-y`, `--override`, `--local`, and `--dir` options, and PowerShell
`-Yes`, `-Override`, `-Local`, and `-Dir`, are no longer accepted. Select skills
positionally, invoke a checkout installer directly, and use `DOTFILES_HOME` for
the bundle cache. `DOTFILES_DIR` is used only to locate legacy state during migration.

Legacy terminal records contain only a settings path and cannot prove the previous
values. They remain informational. New terminal changes record originals and
installed values for conditional restoration.

## Uninstall

```bash
curl -fsSL https://r1cco.com/dotfiles/install.sh | bash -s -- uninstall
```

```powershell
& ([scriptblock]::Create((irm 'https://r1cco.com/dotfiles/install.ps1'))) uninstall
```

From a checkout or installed bundle, use its `scripts/uninstall.sh` or root
`uninstall.ps1`. Add `--dry-run` or `-DryRun` to preview. Removal follows the same
terminal-versus-pipe confirmation behavior as installation.

Uninstall removes only verified owned links, empty created directories, and new
terminal changes whose current values still match the recorded installed values.
It uses the recorded terminal settings path. User changes are preserved.
Checkouts, caches, copied profiles, unrelated paths, and backups are retained.
An already-absent installation succeeds.

## Installed paths

| Source            | Claude Code               | Codex                     | Grok                    | Cursor                    | Hermes                    |
| ----------------- | ------------------------- | ------------------------- | ----------------------- | ------------------------- | ------------------------- |
| `INSTRUCTIONS.md` | `~/.claude/CLAUDE.md`     | `~/.codex/AGENTS.md`      | `~/.grok/AGENTS.md`     | —                         | —                         |
| `skill/<name>`    | `~/.claude/skills/<name>` | `~/.agents/skills/<name>` | `~/.grok/skills/<name>` | `~/.cursor/skills/<name>` | `~/.hermes/skills/<name>` |

Instruction links are part of full setup only. Agent environment overrides apply.
PowerShell also maintains Codex compatibility links in `~/.codex/skills`.
Hermes uses per-skill links without replacing its skills tree; bundled and hub
skills stay. Its Windows home defaults to `%LOCALAPPDATA%\hermes`.
Cursor gets skills only, and also reads Claude/shared-agent skills for compatibility.
The retired Claude marketplace is not removed automatically.

## Windows terminal

Full Windows setup, unless `-SkipTerminal` is supplied:

| Source                                        | Destination                                             |
| --------------------------------------------- | ------------------------------------------------------- |
| `powershell/Microsoft.PowerShell_profile.ps1` | `$PROFILE`, copied when absent; existing file preserved |
| `powershell/themes/robbyrussell.omp.json`     | `<profile-dir>/themes/robbyrussell.omp.json`, linked    |
| Managed terminal values                       | Recorded Windows Terminal `settings.json`               |

Managed values are background `#141414` and `ctrl+shift+t` → `duplicateTab` in the
current tab's directory. The profile emits OSC 9;9. New installations record
before/after values rather than replacing the complete settings file.
`powershell/required_config.json` is a reference snapshot, not a complete installer input.
Keep secrets only in the live `$PROFILE`; the repository file is a template.

## Optional tools

These are separate from agent installation and retain their own options:

- [Windows helpers](../scripts/windows/README.md): WSL Node/pnpm setup and system cleanup.
- [Colima](../scripts/macos/setup-colima.sh): Apple Silicon Docker tooling. Run the
  setup script by hand, then `colima start`. Teardown uses `colima delete` and Homebrew removal.
- [Maestro install](../scripts/install-maestro.sh) / [uninstall](../scripts/uninstall-maestro.sh):
  Java 17+, CLI and MCP registration for detected agents.
- [MCP tools](../scripts/mcp/): manual Exa MCP and Claude Code Codex plugin setup;
  see their own `--help` output for selection and API-key options.

Install Docker Desktop on Windows. On Apple Silicon macOS, use the Colima helper.

## Troubleshooting

- A foreign destination is preserved over a pipe. Inspect the named path, move it
  yourself, or run the checked-out installer interactively to confirm replacement.
- A busy mutation lock means another lifecycle operation is active. Wait for it.
  If an interrupted process left a stale lock, verify that process has stopped
  before removing the lock directory named in the error.
- A checksum, archive, or download failure leaves the active bundle intact. Retry
  the same public command after checking connectivity.
- For a failed VPS publication, see [deployment recovery](deployment.md#recovery).
- If `~/.agents` was created as root, restore ownership before installation:

  ```bash
  sudo chown -R "$(id -un):$(id -gn)" "$HOME/.agents"
  ```
