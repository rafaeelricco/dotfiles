-- [[ Vim Configurator ]]
-- This file contains core editor settings that define the default behavior of Neovim.
-- Each option is configured to create a modern and efficient editing experience.
-- For more details on any option, see `:help vim.opt`.
-- NOTE: You can change these options as you wish!
--  For more options, you can see `:help option-list`

-- Ensures buffer state is consistent with the file system by automatically
-- reloading files when they are changed externally.
vim.opt.autoread = true

-- Displays line numbers in the gutter, which is essential for navigation.
vim.opt.number = true
-- You can also add relative line numbers, to help with jumping.
--  Experiment for yourself to see if you like it!
-- vim.opt.relativenumber = true

-- Enables mouse support in all modes, allowing for intuitive window resizing
-- and text selection.
vim.opt.mouse = "a"

-- Hides the default mode indicator, as this information is already provided
-- by the statusline.
vim.opt.showmode = false

-- Integrates the system clipboard with Neovim's registers, allowing for seamless
-- copy-paste operations between Neovim and other applications.
--  Remove this option if you want your OS clipboard to remain independent.
--  See `:help 'clipboard'`
vim.opt.clipboard = "unnamedplus"

-- Preserves indentation for wrapped lines, maintaining code structure.
vim.opt.breakindent = true

-- Configures indentation to use two spaces, promoting a consistent code style.
vim.opt.tabstop = 2
vim.opt.shiftwidth = 2
vim.opt.softtabstop = 2
vim.opt.expandtab = true
vim.opt.smartindent = true
vim.opt.autoindent = true

-- Persists the undo history to a file, allowing undo operations to be
-- performed even after closing and reopening Neovim.
vim.opt.undofile = true

-- Configures search to be case-insensitive by default, unless the search
-- query contains an uppercase letter.
vim.opt.ignorecase = true
vim.opt.smartcase = true

-- Always displays the sign column, preventing the editor from shifting when
-- diagnostics or Git signs appear.
vim.opt.signcolumn = "yes"

-- Reduces the delay for writing swap files to disk, improving performance.
vim.opt.updatetime = 250

-- Shortens the timeout for mapped key sequences, making the editor feel more responsive.
-- Displays which-key popup sooner
vim.opt.timeoutlen = 300

-- Defines the default behavior for creating new splits, ensuring a predictable
-- window layout.
vim.opt.splitright = true
vim.opt.splitbelow = true

-- Makes whitespace characters visible, which helps in identifying and
-- correcting formatting issues.
--  See `:help 'listchars'`
vim.opt.listchars = { tab = "» ", trail = "·", nbsp = "␣" }

-- Provides a live preview for substitutions, allowing you to see the changes
-- before they are applied.
vim.opt.inccommand = "split"

-- Highlights the current line, improving cursor visibility.
vim.opt.cursorline = true

-- Maintains a consistent number of lines above and below the cursor when
-- scrolling, which improves context awareness.
vim.opt.scrolloff = 8

-- Prevents accidental data loss by requiring confirmation before quitting
-- with unsaved changes.
vim.opt.confirm = true

-- Disables paste mode, as modern terminals handle bracketed paste correctly.
vim.opt.paste = false

-- Customizes the format options to control automatic formatting behavior.
vim.opt.formatoptions:remove({ "c", "r", "o" })

-- Disables line wrapping to prevent unintended line breaks in code.
vim.opt.wrap = false
vim.opt.textwidth = 0

-- [[ Core Autocommands ]]
-- Defines fundamental autocommands that enhance the editing experience.
--  See `:help lua-guide-autocommands`

-- Provides visual feedback when yanking text by briefly highlighting the
-- selected region.
--  Try it with `yap` in normal mode
--  See `:help vim.highlight.on_yank()`
vim.api.nvim_create_autocmd("TextYankPost", {
  desc = "Highlight when yanking (copying) text",
  group = vim.api.nvim_create_augroup("kickstart-highlight-yank", { clear = true }),
  callback = function()
    vim.highlight.on_yank()
  end,
})