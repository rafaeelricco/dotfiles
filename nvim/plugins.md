# Neovim Plugin Configuration

## Currently Installed Plugins (27 total)

### AI (1 plugin)
- [github/copilot.vim](https://github.com/github/copilot.vim): GitHub Copilot AI pair programmer with custom keybindings for accepting suggestions and navigating completions.

*Note: `claude-code.nvim` is commented out in the AI domain configuration but remains available for future use.*

### Completion (2 plugins)
- [saghen/blink.cmp](https://github.com/saghen/blink.cmp): A powerful and extensible completion engine that integrates with various sources like LSP, snippets, and buffer text.
- [L3MON4D3/LuaSnip](https://github.com/L3MON4D3/LuaSnip): The snippet engine responsible for expanding text snippets with regex support.

### Core Editor Enhancements (5 plugins)
- [NMAC427/guess-indent.nvim](https://github.com/NMAC427/guess-indent.nvim): Automatically guesses and sets indentation settings for files.
- [nvim-treesitter/playground](https://github.com/nvim-treesitter/playground): Provides a playground for debugging Treesitter parsers and queries.
- [stevearc/conform.nvim](https://github.com/stevearc/conform.nvim): Handles auto-formatting of code with support for multiple formatters per filetype.
- [terryma/vim-multiple-cursors](https://github.com/terryma/vim-multiple-cursors): Enables multiple cursors for simultaneous editing operations.
- [nvim-treesitter/nvim-treesitter](https://github.com/nvim-treesitter/nvim-treesitter): Manages Treesitter for advanced syntax highlighting, indentation, and text objects.

### Git (1 plugin)
- [lewis6991/gitsigns.nvim](https://github.com/lewis6991/gitsigns.nvim): Provides Git decorations in the sign column to show added, modified, or deleted lines.

### LSP (Language Server Protocol) (7 plugins)
- [folke/lazydev.nvim](https://github.com/folke/lazydev.nvim): Configures the Lua LSP specifically for Neovim configuration development with luv types.
- [neovim/nvim-lspconfig](https://github.com/neovim/nvim-lspconfig): The core plugin for managing Language Servers with configured servers for TypeScript/JavaScript, Python, and Lua.
- [williamboman/mason.nvim](https://github.com/williamboman/mason.nvim): Automatically installs and manages LSPs and other development tools.
- [williamboman/mason-lspconfig.nvim](https://github.com/williamboman/mason-lspconfig.nvim): A bridge between `mason.nvim` and `nvim-lspconfig`.
- [WhoIsSethDaniel/mason-tool-installer.nvim](https://github.com/WhoIsSethDaniel/mason-tool-installer.nvim): Helps ensure specified tools are installed via Mason.
- [j-hui/fidget.nvim](https://github.com/j-hui/fidget.nvim): Provides useful status updates for LSP actions and progress.
- [folke/trouble.nvim](https://github.com/folke/trouble.nvim): Better diagnostics, references, and quickfix list interface - provides VSCode-like "Problems" panel.

### UI & UX (8 plugins)
- [folke/which-key.nvim](https://github.com/folke/which-key.nvim): Shows pending keybinds with descriptions to help you learn your mappings.
- [nvim-telescope/telescope.nvim](https://github.com/nvim-telescope/telescope.nvim): A highly extensible fuzzy finder for files, LSP definitions, buffers, and more with custom keybindings.
- [nvim-telescope/telescope-fzf-native.nvim](https://github.com/nvim-telescope/telescope-fzf-native.nvim): An extension for Telescope to improve performance using native `fzf`.
- [nvim-telescope/telescope-ui-select.nvim](https://github.com/nvim-telescope/telescope-ui-select.nvim): A Telescope extension that replaces vim.ui.select with Telescope.
- [nvim-tree/nvim-web-devicons](https://github.com/nvim-tree/nvim-web-devicons): Adds file-type icons to enhance the UI when Nerd Font is available.
- [folke/todo-comments.nvim](https://github.com/folke/todo-comments.nvim): Highlights TODO, NOTE, and other keywords in your comments.
- [echasnovski/mini.nvim](https://github.com/echasnovski/mini.nvim): A collection of small, independent plugins. You are using:
    - `mini.ai`: For better around/inside text objects with 500-line scope.
    - `mini.surround`: To add, delete, and replace surroundings like brackets and quotes.
    - `mini.statusline`: A lightweight and customizable statusline with cursor location display.
- [nvim-neo-tree/neo-tree.nvim](https://github.com/nvim-neo-tree/neo-tree.nvim): A modern file explorer that replaces the default `netrw` with toggle functionality.

### Plugin Manager (1 plugin)
- [folke/lazy.nvim](https://github.com/folke/lazy.nvim): Modern plugin manager with lazy loading, custom UI icons, and organized domain-based plugin structure.

### Dependencies (3 plugins)
- [nvim-lua/plenary.nvim](https://github.com/nvim-lua/plenary.nvim): Lua functions library that serves as a dependency for many plugins.
- [MunifTanjim/nui.nvim](https://github.com/MunifTanjim/nui.nvim): UI component library for Neovim plugins.


## Configuration Summary

This setup provides a comprehensive and modern Neovim experience with **27 installed plugins** organized by domain. The configuration emphasizes:

- **Functional Programming Principles**: Pure functions, immutability, and composition
- **Domain-Driven Design**: Clear separation of concerns across domains
- **VSCode-like User Experience**: Modern UI, intelligent completion, and familiar keybindings
- **Performance**: Lazy loading and optimized plugin selection

### Domain Organization
- **AI**: 1 plugin (GitHub Copilot)
- **Completion**: 2 plugins (blink.cmp + LuaSnip)
- **Core Editor**: 5 plugins (formatting, syntax, multiple cursors)
- **Git**: 1 plugin (gitsigns for decorations)
- **LSP**: 7 plugins (comprehensive language server support)
- **UI & UX**: 8 plugins (fuzzy finder, file explorer, statusline)
- **Infrastructure**: 4 plugins (plugin manager + dependencies)

---

## Available Plugin Options & Alternatives

## Available Plugin Options & Alternatives

Here are modern alternatives and enhancements to consider for better performance, popularity, or additional functionality:

### AI Enhancements & Alternatives
- **[supermaven-nvim](https://github.com/supermaven-inc/supermaven-nvim)**: Alternative to Copilot with faster inference and better context understanding
- **[codeium.nvim](https://github.com/Exafunction/codeium.nvim)**: Free alternative to Copilot with competitive performance
- **[avante.nvim](https://github.com/yetone/avante.nvim)**: Cursor-like AI chat interface for in-editor AI conversations
- **[codecompanion.nvim](https://github.com/olimorris/codecompanion.nvim)**: AI-powered coding assistant with multiple provider support

### Completion System Alternatives
- **[nvim-cmp](https://github.com/hrsh7th/nvim-cmp)**: More popular alternative to blink.cmp with extensive ecosystem
- **[friendly-snippets](https://github.com/rafamadriz/friendly-snippets)**: Enhancement to LuaSnip with pre-built snippets for many languages
- **[nvim-snippets](https://github.com/garymjr/nvim-snippets)**: Modern snippet engine alternative built for Neovim 0.10+

### Core Editor Alternatives & Enhancements
- **[flash.nvim](https://github.com/folke/flash.nvim)**: Modern alternative to vim-multiple-cursors with better performance and features
- **[none-ls.nvim](https://github.com/nvimtools/none-ls.nvim)**: More comprehensive alternative to conform.nvim for formatting, linting, and code actions
- **[nvim-treesitter-context](https://github.com/nvim-treesitter/nvim-treesitter-context)**: Enhancement showing current function/class context at top of buffer
- **[indent-blankline.nvim](https://github.com/lukas-reineke/indent-blankline.nvim)**: Enhancement for better indentation visualization

### Git Management Options (VSCode-like functionality)

#### Complete Git Interfaces
- **[neogit](https://github.com/NeogitOrg/neogit)**: Full Git interface with staging area, commit editor, branch management, and log viewing
- **[lazygit.nvim](https://github.com/kdheepak/lazygit.nvim)**: Terminal-based Git UI with intuitive keybindings for all Git operations
- **[fugitive.vim](https://github.com/tpope/vim-fugitive)**: Comprehensive Git wrapper with commands for every Git operation

#### Specialized Git Tools
- **[diffview.nvim](https://github.com/sindrets/diffview.nvim)**: Advanced diff viewer with file history, merge conflict resolution, and side-by-side comparisons
- **[git-conflict.nvim](https://github.com/akinsho/git-conflict.nvim)**: Visual merge conflict resolution with choose-ours/theirs/both actions

#### GitHub/GitLab Integration
- **[octo.nvim](https://github.com/pwntester/octo.nvim)**: Manage GitHub issues, PRs, and reviews without leaving Neovim
- **[gitlinker.nvim](https://github.com/ruifm/gitlinker.nvim)**: Generate and open links to Git hosting services
- **[gh.nvim](https://github.com/ldelossa/gh.nvim)**: GitHub CLI integration for repository management

#### Advanced Git Workflows
- **[git-worktree.nvim](https://github.com/ThePrimeagen/git-worktree.nvim)**: Manage multiple Git worktrees for parallel development
- **[telescope-git-file-history.nvim](https://github.com/isak102/telescope-git-file-history.nvim)**: Browse file history with Telescope integration
- **[git-blame.nvim](https://github.com/f-person/git-blame.nvim)**: Inline Git blame annotations with commit details

### LSP Enhancements
- **[lspsaga.nvim](https://github.com/nvimdev/lspsaga.nvim)**: Enhanced LSP UI with better code actions, hover, and navigation
- **[inc-rename.nvim](https://github.com/smjonas/inc-rename.nvim)**: Live preview for LSP rename operations
- **[lsp-zero.nvim](https://github.com/VonHeikemen/lsp-zero.nvim)**: Simpler LSP setup alternative (if you prefer minimal configuration)

### UI & UX Alternatives & Enhancements
- **[fzf-lua](https://github.com/ibhagwan/fzf-lua)**: Faster alternative to Telescope with native fzf performance
- **[oil.nvim](https://github.com/stevearc/oil.nvim)**: Buffer-based file manager alternative to neo-tree
- **[lualine.nvim](https://github.com/nvim-lualine/lualine.nvim)**: More popular and feature-rich alternative to mini.statusline
- **[noice.nvim](https://github.com/folke/noice.nvim)**: Modern UI for messages, cmdline, and popupmenu
- **[dressing.nvim](https://github.com/stevearc/dressing.nvim)**: Better default UI for vim.ui.select and vim.ui.input
- **[bufferline.nvim](https://github.com/akinsho/bufferline.nvim)**: Enhanced buffer/tab line with modern features
- **[alpha-nvim](https://github.com/goolord/alpha-nvim)**: Customizable start screen for Neovim

### Performance & Workflow Enhancements
- **[nvim-notify](https://github.com/rcarriga/nvim-notify)**: Better notification system
- **[toggleterm.nvim](https://github.com/akinsho/toggleterm.nvim)**: Enhanced terminal management
- **[harpoon](https://github.com/ThePrimeagen/harpoon)**: Quick file navigation and marking system

### Upgrade Considerations

#### Performance Improvements
- **fzf-lua**: Significantly faster than Telescope for large codebases
- **supermaven-nvim**: Faster AI inference than Copilot
- **flash.nvim**: Better performance than vim-multiple-cursors

#### Ecosystem & Community
- **nvim-cmp**: Larger ecosystem with more extensions than blink.cmp
- **lualine.nvim**: More themes and customization options than mini.statusline

#### Modern Features
- **noice.nvim**: Cutting-edge UI improvements
- **oil.nvim**: Buffer-based file editing paradigm
- **avante.nvim**: AI chat interface similar to Cursor

#### Enhanced Functionality
- **none-ls.nvim**: More comprehensive formatting/linting than conform.nvim
- **diffview.nvim**: Advanced Git diff capabilities
- **trouble.nvim**: Enhanced diagnostic management (already installed)
        