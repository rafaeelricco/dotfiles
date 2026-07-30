# Windows helpers

Terminal / WSL pieces live here and in `powershell/Microsoft.PowerShell_profile.ps1`
(copied by `install.ps1` → `$PROFILE`; re-install keeps the existing file unless `-Override`).

| Topic | Goal |
| ----- | ---- |
| [Node / pnpm via WSL](#node--pnpm-via-wsl-pc-reset-runbook) | `bash …` from PowerShell uses **Linux** node/pnpm, not Windows shims |

**Docker:** install **Docker Desktop** on Windows. This repo no longer installs or
shims docker-ce inside WSL.

---

## Node / pnpm via WSL (PC reset runbook)

### Why this approach

Windows and WSL share `PATH` via interop. A Windows Node install appears inside
WSL as `/mnt/*/Program Files/nodejs/`. Its `pnpm` shim is a POSIX script that
runs `exec node`, but WSL only has `node.exe` → **`exec: node: not found`**.

That breaks any **non-interactive** bash started from PowerShell, e.g.:

```powershell
bash utils.sh install
bash -c 'pnpm install'
```

Non-interactive bash does **not** load `~/.bashrc`, so Homebrew (where Linux
Node/pnpm live) never enters `PATH`, and the Windows shim wins.

**Chosen fix (global, not per-repo):**

1. Keep real Node/pnpm **inside WSL** via Homebrew (`/home/linuxbrew/...`).
2. One env file: `~/.wsl_dev_env` → `eval "$(brew shellenv)"` (template in this folder).
3. PowerShell `$PROFILE` sets `BASH_ENV` + `WSLENV` so **every** non-interactive
   bash from Windows sources that file first.
4. Interactive WSL shells source the same file from `~/.bashrc` / `~/.profile`.
5. Same profile lists `GITHUB_TOKEN` and `GH_TOKEN` on `WSLENV` so project
   `.npmrc` lines like `_authToken=${GITHUB_TOKEN}` expand inside WSL bash/pnpm
   (WSL does not inherit arbitrary Windows process env vars otherwise).

**Rejected alternatives:**

| Idea | Why not |
| ---- | ------- |
| Patch each project `utils.sh` | Not portable; forgotten on every new repo |
| PowerShell `pnpm` wrapper with silent WSL retry | Never runs for `pnpm` *inside* a bash script |
| Uninstall Windows Node | Optional; Windows tooling can keep its own Node |
| Filter Windows paths out of WSL `PATH` | Breaks on spaces (`Program Files`); brew-first is enough |
| Rely on Windows User env alone for tokens | Still missing in WSL unless listed on `WSLENV` |

Windows `pnpm` / `node` in a pure PowerShell session stay unchanged. Only bash
launched from Windows is steered toward Linux toolchain.

### Assumptions (match current profile)

| Item | Value |
| ---- | ----- |
| Distro | `Ubuntu-24.04` |
| Linux user home | `/home/administrator` |
| `BASH_ENV` in profile | `/home/administrator/.wsl_dev_env` |
| `WSLENV` extras | `BASH_ENV/u`, `GITHUB_TOKEN`, `GH_TOKEN` |
| Homebrew | `/home/linuxbrew/.linuxbrew` |

If the Linux username differs after a reset, change `$env:BASH_ENV` in
`powershell/Microsoft.PowerShell_profile.ps1` to match `$HOME/.wsl_dev_env`.

### After a clean Windows install

1. **Prereqs:** Windows 11, PowerShell 7, Git, Developer Mode (symlinks).
2. **Dotfiles:** `.\install.ps1 -Local` (profile + Windows Terminal keys).
3. **WSL2 + distro** (Admin; reboot if needed):

   ```powershell
   wsl --install -d Ubuntu-24.04
   ```

4. **Homebrew + Node/pnpm + wire env** (once, as Linux user — not root):

   ```powershell
   wsl -d Ubuntu-24.04 -- bash /mnt/<drive>/.../dotfiles/scripts/windows/setup-wsl-node.sh
   ```

   Script will fail fast if brew is missing. Install Homebrew first
   ([brew.sh](https://brew.sh)), then re-run.

   Manual equivalent:

   ```bash
   # inside WSL
   brew install node pnpm
   cp /mnt/<drive>/.../dotfiles/scripts/windows/wsl_dev_env ~/.wsl_dev_env
   # ensure ~/.bashrc and ~/.profile source ~/.wsl_dev_env (setup script does this)
   ```

5. **Reload PowerShell profile** (install copies it once; secrets only on live `$PROFILE`; new session or):

   ```powershell
   . $PROFILE
   ```

### Files

| Path | Role |
|------|------|
| `setup-wsl-node.sh` | Install/wire Linux node+pnpm + `~/.wsl_dev_env` |
| `wsl_dev_env` | Template sourced via `BASH_ENV` |
| `system-cleanup.bat` | Unrelated disk/DISM cleanup |
