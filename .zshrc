# export GITHUB_TOKEN=<your_github_token>

# Enable Powerlevel10k instant prompt. Should stay close to the top of ~/.zshrc.
# Initialization code that may require console input (password prompts, [y/n]
# confirmations, etc.) must go above this block; everything else may go below.
if [[ -r "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh" ]]; then
  source "${XDG_CACHE_HOME:-$HOME/.cache}/p10k-instant-prompt-${(%):-%n}.zsh"
fi

# Fuzzy Finder
[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

# fzf shell integration (key bindings + completion)
if [[ -d /opt/homebrew/opt/fzf ]]; then
  FZF_PREFIX="/opt/homebrew/opt/fzf"

  # Ensure the Homebrew fzf binaries are available on PATH
  if [[ ":$PATH:" != *":${FZF_PREFIX}/bin:"* ]]; then
    export PATH="${FZF_PREFIX}/bin:${PATH}"
  fi

  # Load completion and key bindings shipped with fzf
  if [[ -f "${FZF_PREFIX}/shell/completion.zsh" ]]; then
    source "${FZF_PREFIX}/shell/completion.zsh"
  fi
  if [[ -f "${FZF_PREFIX}/shell/key-bindings.zsh" ]]; then
    source "${FZF_PREFIX}/shell/key-bindings.zsh"
  fi
fi

# ZSH Syntax Highlighting
# Initialize pipenv completions if pipenv is available
if command -v pipenv >/dev/null 2>&1; then
    eval "$(_PIPENV_COMPLETE=zsh_source pipenv)"
fi

function change_directory_to_ambar() {
    cd ~/Projects/ambar
}

function change_directory_to_personal_projects() {
    cd ~/Projects/r1cco
}

alias ambar="change_directory_to_ambar"
alias personal="change_directory_to_personal_projects"
alias cc="launch_claude_code"
alias fugu="launch_codex_fugu"


# Initialize pyenv
export PYENV_ROOT="$HOME/.pyenv"
[[ -d $PYENV_ROOT/bin ]] && export PATH="$PYENV_ROOT/bin:$PATH"
eval "$(pyenv init -)"

# Added by Zinit's installer
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

# Add in zsh plugins (deferred for faster startup)
# zinit light marlonrichert/zsh-autocomplete
zinit light zsh-users/zsh-autosuggestions
zinit light zsh-users/zsh-syntax-highlighting

if type brew &>/dev/null; then
    FPATH=$(brew --prefix)/share/zsh-completions:$FPATH
fi

# Initialize completion once and replay intercepted compdefs
autoload -Uz compinit
compinit -C
zinit cdreplay -q

# To customize prompt, run `p10k configure` or edit ~/.p10k.zsh.
# [[ ! -f ~/.p10k.zsh ]] || source ~/.p10k.zsh
# source /opt/homebrew/share/powerlevel10k/powerlevel10k.zsh-theme

# . "$HOME/.local/bin/env"

# pnpm
export PNPM_HOME="/Users/rafaelricco/Library/pnpm"
case ":$PATH:" in
  *":$PNPM_HOME:"*) ;;
  *) export PATH="$PNPM_HOME:$PATH" ;;
esac
# pnpm end
export PATH="$HOME/.local/bin:$PATH"

# bun completions
[ -s "/Users/rafaelricco/.bun/_bun" ] && source "/Users/rafaelricco/.bun/_bun"

# bun
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Android SDK
export ANDROID_HOME="$HOME/Library/Android/sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"

# Java (JetBrains Runtime bundled with Android Studio)
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"

