# Neovim Symbolic Links Setup

## Step 1: Remove existing files

Remove existing Neovim configuration files to avoid conflicts:

```bash
rm -f ~/.config/nvim/init.lua
rm -rf ~/.config/nvim/lua
rm -f ~/.config/nvim/lazy-lock.json
```

## Step 2: Create symbolic links

Create symbolic links that point to your dotfiles folder. Run from the root of your dotfiles clone:

```bash
mkdir -p ~/.config/nvim
ln -s "$PWD/nvim/init.lua" ~/.config/nvim/init.lua
ln -s "$PWD/nvim/lua" ~/.config/nvim/lua
ln -s "$PWD/nvim/lazy-lock.json" ~/.config/nvim/lazy-lock.json
```
