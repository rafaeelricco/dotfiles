# Neovim Setup — Windows 11

Windows counterpart to `setup.md` (macOS). Reproduces this config on a clean
Windows 11 machine. Uses [scoop](https://scoop.sh) (no admin required).

## 1. Install Neovim

```powershell
scoop install neovim
```

`nvim` is then on `PATH` via `~\scoop\shims`.

## 2. Link the config dir to this repo

Neovim reads its config from `%LOCALAPPDATA%\nvim`. Point it at this repo with a
directory **junction** (works without admin / Developer Mode, unlike a symlink):

```cmd
cmd /c mklink /J "%LOCALAPPDATA%\nvim" "D:\Personal\dotfiles\nvim"
```

Verify it resolves to the repo:

```powershell
nvim --headless "+lua io.stderr:write(vim.fn.stdpath('config'))" +qa
# -> C:\Users\<you>\AppData\Local\nvim   (junction -> D:\Personal\dotfiles\nvim)
```

## 3. Install dependencies

```powershell
scoop install tree-sitter gcc make ripgrep fd
scoop install lazygit            # optional (snacks.lazygit integration)
```

The `tree-sitter` CLI defaults to MSVC (`cl.exe`) and won't find the mingw
compiler on its own. Point it at gcc/g++ persistently (new shells pick it up):

```powershell
setx CC gcc
setx CXX g++
```

> Without `CC`/`CXX`, parser builds fail with _"Failed to execute the C
> compiler — program not found"_. scoop already adds gcc's `bin` to `PATH`.

| Dep           | Why it's needed                                                             |
| ------------- | --------------------------------------------------------------------------- |
| `tree-sitter` | `nvim-treesitter` (branch `main`) compiles its parsers via the CLI          |
| `gcc`         | C compiler used by tree-sitter **and** by `make` for `telescope-fzf-native` |
| `make`        | `telescope-fzf-native.nvim` builds with `make`                              |
| `ripgrep`     | Telescope `live_grep` / snacks grep                                         |
| `fd`          | Telescope / snacks file finding                                             |
| `lazygit`     | optional — `snacks.lazygit`                                                 |

Also required at runtime (not via scoop):

- **`claude` CLI** on `PATH` — drives `claude-code.nvim` (`:ClaudeCode*` commands).
- **Node.js** (`scoop install nodejs`) — GitHub Copilot. Usually already present.

> **gcc, not zig:** gcc covers both jobs — building treesitter parsers and
> satisfying `make`'s `cc`/`gcc` invocation for `telescope-fzf-native`. zig would
> build parsers but not satisfy `make`, leaving fzf-native unbuilt.

## 4. First launch

`lazy.nvim` auto-installs plugins on first start; treesitter then compiles its
parsers (needs `gcc` from step 3).

```powershell
nvim                              # let Lazy + Mason finish, then restart nvim
nvim --headless "+TSUpdate" +qa   # or force the parser build headlessly
```

## 5. Verify

Inside Neovim:

```vim
:checkhealth
```

Expected OK: treesitter parsers built, `ripgrep` + `fd` found,
`telescope-fzf-native` compiled, `git` + `win32yank` (clipboard) found.

Safe to ignore: `python3` / `ruby` / `perl` / `node` provider warnings,
`luarocks`/`hererocks`, the `opencode` binary, and snacks image tools
(`magick`, `gs`, `mmdc`). To silence the provider warnings, add to your config:

```lua
vim.g.loaded_python3_provider = 0
vim.g.loaded_ruby_provider = 0
vim.g.loaded_perl_provider = 0
```
