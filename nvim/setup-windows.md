# Neovim Setup — Windows 11

Use this guide to set up Neovim on a clean Windows 11 machine.
This is the Windows version of `setup.md` for macOS.
It uses [scoop](https://scoop.sh), which does not require admin access.

## 1. Install Neovim

```powershell
scoop install neovim
```

`nvim` is then on `PATH` via `~\scoop\shims`.

## 2. Link the config dir to this repo

Neovim reads its configuration from `%LOCALAPPDATA%\nvim`.
Point that directory at this repository with a junction.
Unlike a symlink, a junction works without admin access or Developer Mode:

```cmd
cmd /c mklink /J "%LOCALAPPDATA%\nvim" "D:\Personal\dotfiles\nvim"
```

Check that it points to the repository:

```powershell
nvim --headless "+lua io.stderr:write(vim.fn.stdpath('config'))" +qa
# -> C:\Users\<you>\AppData\Local\nvim   (junction -> D:\Personal\dotfiles\nvim)
```

## 3. Install dependencies

```powershell
scoop install tree-sitter gcc make ripgrep fd
scoop install lazygit            # optional (snacks.lazygit integration)
```

The `tree-sitter` CLI defaults to MSVC (`cl.exe`) and does not find the mingw compiler automatically.
Set gcc/g++ as the compiler for new shells:

```powershell
setx CC gcc
setx CXX g++
```

> Without `CC`/`CXX`, parser builds fail with _"Failed to execute the C
> compiler — program not found"_. scoop already adds gcc's `bin` to `PATH`.

| Dep           | Why it's needed                                                         |
| ------------- | ----------------------------------------------------------------------- |
| `tree-sitter` | `nvim-treesitter` (branch `main`) compiles its parsers via the CLI      |
| `gcc`         | C compiler used by tree-sitter and by `make` for `telescope-fzf-native` |
| `make`        | `telescope-fzf-native.nvim` builds with `make`                          |
| `ripgrep`     | Telescope `live_grep` / snacks grep                                     |
| `fd`          | Telescope / snacks file finding                                         |
| `lazygit`     | Optional; `snacks.lazygit`                                              |

Also required at runtime (not via scoop):

Node.js (`scoop install nodejs`) is required for GitHub Copilot and is usually already installed.

gcc builds treesitter parsers and satisfies `make`'s `cc`/`gcc` invocation for `telescope-fzf-native`.
zig builds the parsers but does not satisfy `make`, leaving fzf-native unbuilt.

## 4. First launch

`lazy.nvim` installs plugins on first start.
Then treesitter compiles its parsers using `gcc` from step 3.

```powershell
nvim                              # let Lazy + Mason finish, then restart nvim
nvim --headless "+TSUpdate" +qa   # or force the parser build headlessly
```

## 5. Verify

Inside Neovim:

```vim
:checkhealth
```

Check that treesitter parsers and `telescope-fzf-native` compiled.
Neovim should also find `ripgrep`, `fd`, and `git`, plus `win32yank` for clipboard support.

You can ignore `python3` / `ruby` / `perl` / `node` provider warnings, `luarocks`/`hererocks`, and the `opencode` binary.
You can also ignore warnings for snacks image tools (`magick`, `gs`, `mmdc`).
To silence the provider warnings, add these lines to your configuration:

```lua
vim.g.loaded_python3_provider = 0
vim.g.loaded_ruby_provider = 0
vim.g.loaded_perl_provider = 0
```
