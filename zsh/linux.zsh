# Linux server zsh (VPS). macOS counterpart: ../.zshrc
# Symlinked: ~/.zshrc -> this file
# Section order mirrors the macOS config so the two stay comparable.

# ── Powerlevel10k instant prompt ────────────────────────────────────────────
# Kept for parity with the macOS config. p10k is not installed on either
# machine, so the cache file never exists and this is a no-op.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# ── PATH & environment ──────────────────────────────────────────────────────
# No system file adds Homebrew for zsh logins (/etc/zsh/zprofile is empty, so
# /etc/profile.d/homebrew.sh never runs). Must precede oh-my-zsh.sh: the fzf
# integration and completions resolve binaries at source time.
typeset -U path                      # dedupe
path=(
  "$HOME/.local/bin"
  "$HOME/.grok/bin"
  /home/linuxbrew/.linuxbrew/bin
  /home/linuxbrew/.linuxbrew/sbin
  $path
)
export PATH
[[ -r /usr/local/env ]] && . /usr/local/env

# pnpm — Linux global dir, not ~/Library/pnpm
export PNPM_HOME="$HOME/.local/share/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# bun (guarded — not installed here yet)
export BUN_INSTALL="$HOME/.bun"
[[ -d $BUN_INSTALL/bin ]] && export PATH="$BUN_INSTALL/bin:$PATH"

# pyenv (guarded — not installed here)
export PYENV_ROOT="$HOME/.pyenv"
if [[ -d $PYENV_ROOT/bin ]]; then
  export PATH="$PYENV_ROOT/bin:$PATH"
  eval "$(pyenv init -)"
fi

# ── Completion search path ──────────────────────────────────────────────────
# Must run BEFORE oh-my-zsh, which calls compinit.
if [[ -d /home/linuxbrew/.linuxbrew/share/zsh-completions ]]; then
  FPATH="/home/linuxbrew/.linuxbrew/share/zsh-completions:$FPATH"
fi
[[ -d $HOME/.grok/completions/zsh ]] && fpath=($HOME/.grok/completions/zsh $fpath)

# ── oh-my-zsh ───────────────────────────────────────────────────────────────
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git)
source $ZSH/oh-my-zsh.sh

# ── Tool integrations ───────────────────────────────────────────────────────
# fzf: Linuxbrew prefix, mirroring the macOS /opt/homebrew block
if [[ -d /home/linuxbrew/.linuxbrew/opt/fzf ]]; then
  FZF_PREFIX="/home/linuxbrew/.linuxbrew/opt/fzf"
  [[ -f "${FZF_PREFIX}/shell/completion.zsh"   ]] && source "${FZF_PREFIX}/shell/completion.zsh"
  [[ -f "${FZF_PREFIX}/shell/key-bindings.zsh" ]] && source "${FZF_PREFIX}/shell/key-bindings.zsh"
fi

# pipenv completions
if command -v pipenv >/dev/null 2>&1; then
  eval "$(_PIPENV_COMPLETE=zsh_source pipenv)"
fi

# bun completions
[[ -s "$BUN_INSTALL/_bun" ]] && source "$BUN_INSTALL/_bun"

# ── zinit plugins ───────────────────────────────────────────────────────────
if [[ ! -f $HOME/.local/share/zinit/zinit.git/zinit.zsh ]]; then
  print -P "%F{33} %F{220}Installing %F{33}zinit%F{220}…%f"
  command mkdir -p "$HOME/.local/share/zinit" && command chmod g-rwX "$HOME/.local/share/zinit"
  command git clone https://github.com/zdharma-continuum/zinit "$HOME/.local/share/zinit/zinit.git" && \
    print -P "%F{33} %F{34}Installation successful.%f%b" || \
    print -P "%F{160} The clone has failed.%f%b"
fi

source "$HOME/.local/share/zinit/zinit.git/zinit.zsh"
autoload -Uz _zinit
(( ${+_comps} )) && _comps[zinit]=_zinit

# zsh-syntax-highlighting must be loaded last of the two.
zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-syntax-highlighting

# Replay compdefs the plugins registered (oh-my-zsh already ran compinit).
zinit cdreplay -q

# ── History ─────────────────────────────────────────────────────────────────
# After oh-my-zsh.sh: OMZ's lib/history.zsh caps SAVEHIST at 10000.
HISTFILE="$HOME/.zsh_history"
HISTSIZE=50000
SAVEHIST=50000
setopt SHARE_HISTORY HIST_IGNORE_ALL_DUPS HIST_IGNORE_SPACE
setopt HIST_REDUCE_BLANKS HIST_VERIFY EXTENDED_HISTORY

# ── Completion styling (OMZ already ran compinit) ───────────────────────────
zstyle ':completion:*' menu select
zstyle ':completion:*' matcher-list 'm:{a-z}={A-Za-z}' 'r:|=*' 'l:|=* r:|=*'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' group-name ''
zstyle ':completion:*:descriptions' format '%F{yellow}-- %d --%f'
zstyle ':completion:*' use-cache on
zstyle ':completion:*' cache-path "$HOME/.cache/zsh/zcompcache"

# ── fzf options ─────────────────────────────────────────────────────────────
export FZF_DEFAULT_OPTS='--height 40% --layout=reverse --border'
command -v fd >/dev/null && export FZF_DEFAULT_COMMAND='fd --type f --hidden --exclude .git'

# COLORTERM is not forwarded over SSH (sshd_config:119 AcceptEnv LANG LC_*).
export COLORTERM=truecolor

# ── Aliases ─────────────────────────────────────────────────────────────────
# ll/la/l come from OMZ's lib/directories.zsh.
# tunel/untunel are Mac→VPS helpers; 76.13.169.200 is THIS host. Omitted.
alias personal='cd /root/personal'
alias dots='cd /root/personal/dotfiles'
