# Windows helpers

These files configure PowerShell and WSL.
`install.ps1` copies `powershell/Microsoft.PowerShell_profile.ps1` to `$PROFILE`.
Reinstalling keeps the existing profile unless you use `-Override`.

| Topic                                                       | Purpose                                            |
| ----------------------------------------------------------- | -------------------------------------------------- |
| [Node / pnpm via WSL](#node--pnpm-via-wsl-pc-reset-runbook) | Use Linux Node/pnpm with `bash …` from PowerShell. |

On Windows, install Docker Desktop. This repository no longer installs or shims docker-ce inside WSL.

## Node / pnpm via WSL (PC reset runbook)

### After a clean Windows install

1. Install Windows 11, PowerShell 7, and Git. Enable Developer Mode for symlinks.
2. Run `.\install.ps1 -Local` to set up the PowerShell profile and Windows Terminal keys.
3. Install WSL2 and the distro as Admin. Reboot if needed:

   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

4. Set up Homebrew, Node/pnpm, and the environment once as the Linux user, not root:

   ```powershell
   wsl -d Ubuntu-24.04 -- bash /mnt/<drive>/.../dotfiles/scripts/windows/setup-wsl-node.sh
   ```

   The script stops if brew is missing. Install Homebrew first ([brew.sh](https://brew.sh)), then run it again.

   The manual equivalent is:

   ```bash
   # inside WSL
   brew install node pnpm
   cp /mnt/<drive>/.../dotfiles/scripts/windows/wsl_dev_env ~/.wsl_dev_env
   # ensure ~/.bashrc and ~/.profile source ~/.wsl_dev_env (setup script does this)
   ```

5. Reload the PowerShell profile. The installer copies it once; keep secrets only in the live `$PROFILE`.
   Start a new session or run:

   ```powershell
   . $PROFILE
   ```

### Assumptions (match current profile)

| Item                  | Value                                    |
| --------------------- | ---------------------------------------- |
| Distro                | `Ubuntu-24.04`                           |
| Linux user home       | `/home/administrator`                    |
| `BASH_ENV` in profile | `/home/administrator/.wsl_dev_env`       |
| `WSLENV` extras       | `BASH_ENV/u`, `GITHUB_TOKEN`, `GH_TOKEN` |
| Homebrew              | `/home/linuxbrew/.linuxbrew`             |

If the Linux username changes after a reset, update `$env:BASH_ENV` in `powershell/Microsoft.PowerShell_profile.ps1` to match `$HOME/.wsl_dev_env`.

### Why this approach

Windows and WSL share `PATH` through interop.
A Windows Node installation appears inside WSL as `/mnt/*/Program Files/nodejs/`.
Its `pnpm` shim is a POSIX script that runs `exec node`.
WSL only has `node.exe`, so the shim fails with `exec: node: not found`.

This breaks non-interactive Bash started from PowerShell, for example:

```powershell
bash utils.sh install
bash -c 'pnpm install'
```

Non-interactive Bash does not load `~/.bashrc`.
Linux Homebrew Node/pnpm never enters `PATH`, so the Windows shim runs instead.

### How it works

This setup applies globally:

1. Node/pnpm runs inside WSL through Homebrew (`/home/linuxbrew/...`).
2. The `~/.wsl_dev_env` file runs `eval "$(brew shellenv)"`. Its template lives in this folder.
3. PowerShell `$PROFILE` sets `BASH_ENV` and `WSLENV` so every non-interactive Bash from Windows loads that file first.
4. Interactive WSL shells load the same file from `~/.bashrc` / `~/.profile`.
5. The profile also lists `GITHUB_TOKEN` and `GH_TOKEN` on `WSLENV`.
   This lets project `.npmrc` lines such as `_authToken=${GITHUB_TOKEN}` expand inside WSL Bash/pnpm.
   WSL does not otherwise inherit arbitrary Windows process environment variables.

Windows `pnpm` / `node` in a plain PowerShell session stay unchanged.
Only Bash launched from Windows uses the Linux toolchain.

### Rejected alternatives

| Idea                                              | Why it was rejected                                               |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| Patch each project `utils.sh`                     | Not portable and easy to miss in new repositories.                |
| PowerShell `pnpm` wrapper with silent WSL retry   | Does not run for `pnpm` inside a Bash script.                     |
| Uninstall Windows Node                            | Optional; Windows tooling can keep its own Node.                  |
| Filter Windows paths out of WSL `PATH`            | Breaks on spaces (`Program Files`); putting brew first is enough. |
| Rely on Windows User environment alone for tokens | Tokens are missing in WSL unless listed on `WSLENV`.              |

### Files

| Path                 | Purpose                                                 |
| -------------------- | ------------------------------------------------------- |
| `setup-wsl-node.sh`  | Install Linux node+pnpm and configure `~/.wsl_dev_env`. |
| `wsl_dev_env`        | Template loaded through `BASH_ENV`.                     |
| `system-cleanup.bat` | Disk/DISM cleanup, separate from WSL setup.             |
