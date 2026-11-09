# Linux server zsh setup

How the VPS (`srv1599171`, Ubuntu 24.04) got its zsh configuration, written so
the same approach can be repeated on another server. Done 2026-09-04/05.

The idea: one tracked file per concern, symlinked into `$HOME`, mirroring the
macOS `.zshrc` section by section so the two configs stay comparable.

| Tracked file        | Linked to                 | Purpose                                             |
| ------------------- | ------------------------- | --------------------------------------------------- |
| `zsh/linux.zshenv`  | `~/.zshenv`               | Stops Ubuntu's global `compinit` from running early |
| `zsh/linux.zsh`     | `~/.zshrc`                | The actual shell config                             |
| `zsh/starship.toml` | `~/.config/starship.toml` | Prompt config (copied, currently unused)            |

## 1. Prerequisites

Install in this order. Everything in `linux.zsh` is guarded, so a missing tool
is skipped rather than breaking the shell.

```bash
# zsh itself and make it the login shell for the user
apt-get update && apt-get install -y zsh git curl
chsh -s "$(command -v zsh)" "$USER"

# oh-my-zsh (unattended, do not let it overwrite or switch shells again)
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended --keep-zshrc

# Homebrew on Linux (see ../infra notes: install as a non-root user, prefix
# /home/linuxbrew/.linuxbrew). Then the tools the config looks for:
brew install fzf fd zsh-completions neovim
```

zinit is **not** installed by hand. The first interactive shell clones it into
`~/.local/share/zinit/zinit.git` and then pulls `zsh-autosuggestions` and
`zsh-syntax-highlighting` itself. The Ubuntu `zsh-autosuggestions` /
`zsh-syntax-highlighting` apt packages are present on the VPS but unused.

## 2. Clone the dotfiles and link the files

```bash
git clone https://github.com/rafaeelricco/dotfiles ~/personal/dotfiles
cd ~/personal/dotfiles

# back up anything already there, then link
[[ -f ~/.zshenv && ! -L ~/.zshenv ]] && mv ~/.zshenv ~/.zshenv.bak
[[ -f ~/.zshrc  && ! -L ~/.zshrc  ]] && mv ~/.zshrc  ~/.zshrc.pre-dotfiles.bak
ln -sfn "$PWD/zsh/linux.zshenv" ~/.zshenv
ln -sfn "$PWD/zsh/linux.zsh"    ~/.zshrc

mkdir -p ~/.config ~/.cache/zsh
cp zsh/starship.toml ~/.config/starship.toml   # optional, see §5
```

Adjust the clone path if the server keeps repos elsewhere. The `personal` and
`dots` aliases at the bottom of `linux.zsh` hard-code `/root/personal`; change
them for a non-root user.

## 3. Why the config is ordered the way it is

`linux.zsh` is split into sections. The order is not cosmetic.

1. **`.zshenv` sets `skip_global_compinit=1`.** Ubuntu's `/etc/zsh/zshrc`
   runs `compinit` on every startup unless that variable is set in
   `$ZDOTDIR/.zshenv`. Without it, completions get initialised before our
   `fpath` additions exist, so brew and grok completions are missing and
   oh-my-zsh runs a second `compinit` anyway.
2. **PATH before `oh-my-zsh.sh`.** No system file adds Homebrew for zsh
   logins on this box (`/etc/zsh/zprofile` is empty, so
   `/etc/profile.d/homebrew.sh` never runs). The fzf plugin and completions
   resolve binaries at source time, so linuxbrew must already be on `PATH`.
   `typeset -U path` keeps it deduplicated.
3. **`fpath` additions before `oh-my-zsh.sh`.** oh-my-zsh calls `compinit`;
   anything added to `fpath` after that is not in the completion dump.
4. **oh-my-zsh** with `ZSH_THEME="robbyrussell"` and `plugins=(git)` only.
5. **Tool integrations** (fzf key bindings and completion from the linuxbrew
   prefix, pipenv, bun) each guarded by a directory or `command -v` check.
6. **zinit** self-installs if absent, loads autosuggestions then
   syntax-highlighting (highlighting must be last), then `zinit cdreplay -q`
   replays the `compdef` calls the plugins made, since `compinit` already ran.
7. **History after `oh-my-zsh.sh`.** OMZ's `lib/history.zsh` caps
   `SAVEHIST` at 10000, so the 50000 values must come after it.
   `SHARE_HISTORY`, `HIST_IGNORE_ALL_DUPS`, `HIST_IGNORE_SPACE`,
   `HIST_REDUCE_BLANKS`, `HIST_VERIFY`, `EXTENDED_HISTORY`.
8. **Completion `zstyle`s** (menu select, case-insensitive matching, colours,
   group headers, cache in `~/.cache/zsh/zcompcache`).
9. **fzf options** and `FZF_DEFAULT_COMMAND=fd …` when fd exists.
10. **`COLORTERM=truecolor`.** sshd only accepts `LANG LC_*` from the client
    (`AcceptEnv` in `sshd_config`), so the client's `COLORTERM` never arrives
    and nvim/fzf fall back to 256 colours without this line.
11. **Aliases.** `ll`/`la`/`l` already come from OMZ. The Mac-side
    `tunel`/`untunel` helpers are omitted because they point at this host.

The Powerlevel10k instant-prompt block at the top is a no-op kept only for
parity with the macOS file; p10k is not installed anywhere.

## 4. Verify

```bash
exec zsh                      # first run clones zinit and the two plugins
echo $skip_global_compinit    # 1
print -l $path | head          # ~/.local/bin, ~/.grok/bin, linuxbrew first
command -v fzf fd nvim        # resolve to /home/linuxbrew/.linuxbrew/bin
ls ~/.local/share/zinit/plugins   # zsh-users---zsh-autosuggestions, ...-syntax-highlighting
echo $SAVEHIST                # 50000
```

Typing a known command should show grey autosuggestions; a valid command
turns green, an invalid one red; `Ctrl-R` opens the fzf history picker.

## 5. Starship (optional, not active)

`zsh/starship.toml` was copied to `~/.config/starship.toml` and the binary
lives at `/usr/local/bin/starship`, but `linux.zsh` never runs
`eval "$(starship init zsh)"`, so the prompt is still OMZ `robbyrussell`.
To switch, set `ZSH_THEME=""` and add the `eval` line after the zinit block.
The file before the starship experiment is kept at `~/.zshrc.pre-starship.bak`.

## 6. Keep out of the tracked file

The tracked `linux.zsh` must stay free of host secrets. On the VPS the live
`~/.zshrc` drifted into a plain file (not a symlink) carrying two extra lines:
an exported API key and `. "$HOME/.local/bin/env"` (the uv installer's PATH
shim, redundant with the `path=(…)` block). Put secrets in a separate,
untracked file and source it:

```zsh
[[ -r ~/.zshrc.local ]] && source ~/.zshrc.local
```

On a fresh server, re-link `~/.zshrc` to `zsh/linux.zsh` rather than copying
it, so later edits in the repo are live immediately.
