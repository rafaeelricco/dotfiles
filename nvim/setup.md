# Neovim Symbolic Links Setup

## Step 1: Remove existing files

Remove existing Neovim configuration files to avoid conflicts:

```bash
rm -f /Users/rafaelricco/.config/nvim/init.lua
rm -rf /Users/rafaelricco/.config/nvim/lua
rm -f /Users/rafaelricco/.config/nvim/lazy-lock.json
```

## Step 2: Create symbolic links

Create symbolic links that point to your dotfiles folder:

```bash
ln -s /Users/rafaelricco/projects/r1cco/dotfiles/nvim/init.lua /Users/rafaelricco/.config/nvim/init.lua
ln -s /Users/rafaelricco/projects/r1cco/dotfiles/nvim/lua /Users/rafaelricco/.config/nvim/lua
ln -s /Users/rafaelricco/projects/r1cco/dotfiles/nvim/lazy-lock.json /Users/rafaelricco/.config/nvim/lazy-lock.json
```
        