# export GITHUB_TOKEN=<your_github_token_here>

# ── Powerlevel10k instant prompt ────────────────────────────────────────────
# Must stay at the very top. Anything that may print or ask for input goes above.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# ── PATH & environment ──────────────────────────────────────────────────────
export PATH="$HOME/.local/bin:$PATH"

# pnpm
export PNPM_HOME="$HOME/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Android SDK
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools"

# Java (JetBrains Runtime bundled with Android Studio)
if [[ -d "/Applications/Android Studio.app/Contents/jbr/Contents/Home" ]]; then
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export PATH="$JAVA_HOME/bin:$PATH"
fi

# pyenv (only if installed)
export PYENV_ROOT="$HOME/.pyenv"
if [[ -d $PYENV_ROOT/bin ]]; then
  export PATH="$PYENV_ROOT/bin:$PATH"
  eval "$(pyenv init -)"
fi

# ── Completion search path ──────────────────────────────────────────────────
# Must run BEFORE oh-my-zsh, which calls compinit.
if type brew &>/dev/null; then
  FPATH="$(brew --prefix)/share/zsh-completions:$FPATH"
fi

# ── oh-my-zsh ───────────────────────────────────────────────────────────────
export ZSH="$HOME/.oh-my-zsh"
ZSH_THEME="robbyrussell"
plugins=(git)
source $ZSH/oh-my-zsh.sh

# ── Tool integrations ───────────────────────────────────────────────────────
# fzf: local install script, or the Homebrew shell integration
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

if [[ -d /opt/homebrew/opt/fzf ]]; then
  FZF_PREFIX="/opt/homebrew/opt/fzf"
  if [[ ":$PATH:" != *":${FZF_PREFIX}/bin:"* ]]; then
    export PATH="${FZF_PREFIX}/bin:${PATH}"
  fi
  [[ -f "${FZF_PREFIX}/shell/completion.zsh"   ]] && source "${FZF_PREFIX}/shell/completion.zsh"
  [[ -f "${FZF_PREFIX}/shell/key-bindings.zsh" ]] && source "${FZF_PREFIX}/shell/key-bindings.zsh"
fi

# pipenv completions
if command -v pipenv >/dev/null 2>&1; then
  eval "$(_PIPENV_COMPLETE=zsh_source pipenv)"
fi

# bun completions
[ -s "$BUN_INSTALL/_bun" ] && source "$BUN_INSTALL/_bun"

# ── zinit plugins ───────────────────────────────────────────────────────────
if [[ ! -f $HOME/.local/share/zinit/zinit.git/zinit.zsh ]]; then
  print -P "%F{33} %F{220}Installing %F{33}ZDHARMA-CONTINUUM%F{220} Initiative Plugin Manager (%F{33}zdharma-continuum/zinit%F{220})…%f"
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

# ── Aliases ─────────────────────────────────────────────────────────────────
alias ambar="cd ~/Projects/ambar"
alias personal="cd ~/Projects/personal"

# ── Prompt ──────────────────────────────────────────────────────────────────
# To use powerlevel10k instead of robbyrussell: brew install powerlevel10k,
# unset ZSH_THEME above, then uncomment both lines and run `p10k configure`.
# source /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme
# [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
