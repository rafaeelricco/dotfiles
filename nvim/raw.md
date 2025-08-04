02-08-init.lua
-- Set <space> as the leader key
-- See :help mapleader
--  NOTE: Must happen before plugins are loaded (otherwise wrong leader will be used)
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- Enable auto-reloading of files when they change on disk
vim.o.autoread = true

-- Debug function to show highlight groups under cursor
-- local function show_highlight_groups()
-- 	local result = vim.treesitter.get_captures_at_cursor(0)
-- 	if #result == 0 then
-- 		print("No TreeSitter captures found")
-- 		return
-- 	end

-- 	print("TreeSitter captures at cursor:")
-- 	for _, capture in ipairs(result) do
-- 		print("  @" .. capture)
-- 	end

-- 	-- Also show traditional syntax groups
-- 	local synID = vim.fn.synID(vim.fn.line('.'), vim.fn.col('.'), 1)
-- 	local synName = vim.fn.synIDattr(synID, 'name')
-- 	if synName ~= '' then
-- 		print("Syntax group: " .. synName)
-- 	end
-- end

-- Map this to a key for easy access
-- vim.keymap.set('n', '<leader>hi', show_highlight_groups, { desc = 'Show highlight groups under cursor' })

-- Additional function to show all applied highlight groups
-- local function show_all_highlight_groups()
-- 	local line = vim.fn.line('.')
-- 	local col = vim.fn.col('.')

-- 	-- Get TreeSitter captures
-- 	local ts_captures = vim.treesitter.get_captures_at_cursor(0)
-- 	print("=== TreeSitter Captures ===")
-- 	if #ts_captures > 0 then
-- 		for _, capture in ipairs(ts_captures) do
-- 			print("  @" .. capture)
-- 		end
-- 	else
-- 		print("  None")
-- 	end

-- 	-- Get syntax groups
-- 	print("\n=== Syntax Groups ===")
-- 	local synID = vim.fn.synID(line, col, 1)
-- 	local synName = vim.fn.synIDattr(synID, 'name')
-- 	if synName ~= '' then
-- 		print("  " .. synName)
-- 		local transID = vim.fn.synIDtrans(synID)
-- 		local transName = vim.fn.synIDattr(transID, 'name')
-- 		if transName ~= synName then
-- 			print("  -> " .. transName .. " (translated)")
-- 		end
-- 	else
-- 		print("  None")
-- 	end

-- 	-- Get effective highlight group
-- 	print("\n=== Applied Highlight ===")
-- 	local hl_name = vim.fn.synIDattr(vim.fn.synIDtrans(synID), 'name')
-- 	if hl_name ~= '' then
-- 		local hl = vim.api.nvim_get_hl(0, { name = hl_name })
-- 		print("  Group: " .. hl_name)
-- 		if hl.fg then print("  fg: #" .. string.format("%06x", hl.fg)) end
-- 		if hl.bg then print("  bg: #" .. string.format("%06x", hl.bg)) end
-- 	end
-- end

-- vim.keymap.set('n', '<leader>Ha', show_all_highlight_groups, { desc = 'Show all highlight info under cursor' })

-- Set to true if you have a Nerd Font installed and selected in the terminal
-- Bufferline is a plugin that provides a way to show and manage buffers.
-- {
-- 	"akinsho/bufferline.nvim",
-- 	version = "*",
-- 	dependencies = "nvim-tree/nvim-web-devicons",
-- 	opts = {
-- 		options = {
-- 			mode = "buffers",
-- 			diagnostics = "nvim_lsp",
-- 			offsets = {
-- 				{
-- 					filetype = "neo-tree",
-- 					text = "File Explorer",
-- 					separator = true,
-- 				},
-- 			},
-- 		},
-- 	},
-- },
vim.g.have_nerd_font = true

-- [[ Setting options ]]
-- See :help vim.o
-- NOTE: You can change these options as you wish!
--  For more options, you can see :help option-list

-- Make line numbers default
vim.o.number = true
-- You can also add relative line numbers, to help with jumping.
--  Experiment for yourself to see if you like it!
-- vim.o.relativenumber = true

-- Enable mouse mode, can be useful for resizing splits for example!
vim.o.mouse = "a"

-- Don't show the mode, since it's already in the status line
vim.o.showmode = false

-- Sync clipboard between OS and Neovim.
--  Schedule the setting after UiEnter because it can increase startup-time.
--  Remove this option if you want your OS clipboard to remain independent.
--  See :help 'clipboard'
vim.schedule(function()
vim.o.clipboard = "unnamedplus"
end)

-- Enable break indent
vim.o.breakindent = true

-- Set tab width and indentation (2 spaces, like VSCode)
vim.o.tabstop = 2        -- Number of spaces that a <Tab> in the file counts for
vim.o.shiftwidth = 2     -- Number of spaces to use for each step of (auto)indent
vim.o.softtabstop = 2    -- Number of spaces that a <Tab> counts for while editing
vim.o.expandtab = true   -- Use spaces instead of tabs
vim.o.smartindent = true -- Smart autoindenting when starting a new line
vim.o.autoindent = true  -- Copy indent from current line when starting a new line

-- Save undo history
vim.o.undofile = true

-- Case-insensitive searching UNLESS \C or one or more capital letters in the search term
vim.o.ignorecase = true
vim.o.smartcase = true

-- Keep signcolumn on by default
vim.o.signcolumn = "yes"

-- Decrease update time
vim.o.updatetime = 250

-- Decrease mapped sequence wait time
vim.o.timeoutlen = 300

-- Configure how new splits should be opened
vim.o.splitright = true
vim.o.splitbelow = true

-- Sets how neovim will display certain whitespace characters in the editor.
--  See :help 'list'
--  and :help 'listchars'
--  Notice listchars is set using vim.opt instead of vim.o.
--  It is very similar to vim.o but offers an interface for conveniently interacting with tables.
--   See :help lua-options
--   and :help lua-options-guide
vim.o.list = true

-- Previous vim.opt.listchars = { tab = "» ", trail = "·" }
vim.opt.listchars = { tab = "  ", trail = " " }

-- Preview substitutions live, as you type!
vim.o.inccommand = "split"

-- Show which line your cursor is on
vim.o.cursorline = true

-- Minimal number of screen lines to keep above and below the cursor.
vim.o.scrolloff = 10

-- if performing an operation that would fail due to unsaved changes in the buffer (like :q),
-- instead raise a dialog asking if you wish to save the current file(s)
-- See :help 'confirm'
vim.o.confirm = true

-- Disable paste mode indicators and auto-formatting when pasting
vim.o.paste = false                                         -- Disable paste mode (causes issues in modern terminals)
vim.o.formatoptions = vim.o.formatoptions:gsub("[cro]", "") -- Remove auto-formatting options

-- Disable line wrapping
vim.o.wrap = false
vim.o.textwidth = 0

-- [[ Basic Keymaps ]]
--  See :help vim.keymap.set()

-- Clear highlights on search when pressing <Esc> in normal mode
--  See :help hlsearch
vim.keymap.set("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Diagnostic keymaps
vim.keymap.set("n", "<leader>q", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Exit terminal mode in the builtin terminal with a shortcut that is a bit easier
-- for people to discover. Otherwise, you normally need to press <C-\><C-n>, which
-- is not what someone will guess without a bit more experience.
-- NOTE: This won't work in all terminal emulators/tmux/etc. Try your own mapping
-- or just use <C-\><C-n> to exit terminal mode
vim.keymap.set("t", "<Esc><Esc>", "<C-\><C-n>", { desc = "Exit terminal mode" })

-- Shift+Enter to send line continuation in terminal mode (like VSCode)
vim.keymap.set("t", "<S-CR>", "\<CR>", { desc = "Send line continuation in terminal" })

-- TIP: Disable arrow keys in normal mode
-- vim.keymap.set('n', '<left>', '<cmd>echo "Use h to move!!"<CR>')
-- vim.keymap.set('n', '<right>', '<cmd>echo "Use l to move!!"<CR>')
-- vim.keymap.set('n', '<up>', '<cmd>echo "Use k to move!!"<CR>')
-- vim.keymap.set('n', '<down>', '<cmd>echo "Use j to move!!"<CR>')

-- Keybinds to make split navigation easier.
--  Use CTRL+<hjkl> to switch between windows
--  See :help wincmd for a list of all window commands
vim.keymap.set("n", "<C-h>", "<C-w><C-h>", { desc = "Move focus to the left window" })
vim.keymap.set("n", "<C-l>", "<C-w><C-l>", { desc = "Move focus to the right window" })
vim.keymap.set("n", "<C-j>", "<C-w><C-j>", { desc = "Move focus to the lower window" })
vim.keymap.set("n", "<C-k>", "<C-w><C-k>", { desc = "Move focus to the upper window" })

-- Keybinds to make window management easier.
vim.keymap.set("n", "<leader>w", "<cmd>close<CR>", { desc = "Close current [W]indow" })

-- Keybinds for tab navigation
-- The following keymaps are commented out as they can conflict with word-by-word
-- navigation using Option+Arrow keys in some terminals.
-- vim.keymap.set("n", "<A-l>", "<cmd>tabnext<CR>", { desc = "Next tab" })
-- vim.keymap.set("n", "<A-h>", "<cmd>tabprev<CR>", { desc = "Previous tab" })

-- Move line up and down
vim.keymap.set("n", "<M-Down>", "<cmd>m .+1<CR>==", { desc = "Move current line down" })
vim.keymap.set("n", "<M-Up>", "<cmd>m .-2<CR>==", { desc = "Move current line up" })
vim.keymap.set("v", "<M-Up>", ":m '<-2<CR>gv=gv", { desc = "Move selected lines up" })
vim.keymap.set("v", "<M-Down>", ":m '>+1<CR>gv=gv", { desc = "Move selected lines down" })

-- Delete word with Option+Delete
vim.keymap.set("i", "<M-BS>", "<C-w>", { desc = "Delete word backward" })

-- Show suggestions with Control+Backspace
vim.keymap.set("i", "<C-BS>", "<C-x><C-o>", { desc = "Show suggestions" })

-- Undo and redo keybinds
vim.keymap.set({ "n", "v", "i" }, "<D-z>", "<Esc>ua", { desc = "Undo" })
vim.keymap.set({ "n", "v", "i" }, "<D-S-z>", "<Esc><C-r>a", { desc = "Redo" })

-- Keybind for do and undo things

-- NOTE: Some terminals have colliding keymaps or are not able to send distinct keycodes
-- vim.keymap.set("n", "<C-S-h>", "<C-w>H", { desc = "Move window to the left" })
-- vim.keymap.set("n", "<C-S-l>", "<C-w>L", { desc = "Move window to the right" })
-- vim.keymap.set("n", "<C-S-j>", "<C-w>J", { desc = "Move window to the lower" })
-- vim.keymap.set("n", "<C-S-k>", "<C-w>K", { desc = "Move window to the upper" })

-- [[ Basic Autocommands ]]
--  See :help lua-guide-autocommands

-- Highlight when yanking (copying) text
--  Try it with yap in normal mode
--  See :help vim.hl.on_yank()
vim.api.nvim_create_autocmd("TextYankPost", {
desc = "Highlight when yanking (copying) text",
group = vim.api.nvim_create_augroup("kickstart-highlight-yank", { clear = true }),
callback = function()
vim.hl.on_yank()
end,
})

-- [[ Install lazy.nvim plugin manager ]]
--    See :help lazy.nvim.txt or https://github.com/folke/lazy.nvim for more info
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
local lazyrepo = "https://github.com/folke/lazy.nvim.git"
local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
if vim.v.shell_error ~= 0 then
error("Error cloning lazy.nvim:\n" .. out)
end
end

---@type vim.Option
local rtp = vim.opt.rtp
rtp:prepend(lazypath)

-- [[ Configure and install plugins ]]
--  To check the current status of your plugins, run
--    :Lazy
--  You can press ? in this menu for help. Use :q to close the window
--  To update plugins you can run
--    :Lazy update
-- NOTE: Here is where you install your plugins.
require("lazy").setup({
-- NOTE: Plugins can be added with a link (or for a github repo: 'owner/repo' link).
"NMAC427/guess-indent.nvim", -- Detect tabstop and shiftwidth automatically

-- TreeSitter Playground for debugging highlight groups
{
"nvim-treesitter/playground",
dependencies = { "nvim-treesitter/nvim-treesitter" },
cmd = { "TSPlaygroundToggle", "TSHighlightCapturesUnderCursor" },
},

-- NOTE: Plugins can also be added by using a table,
-- with the first argument being the link and the following
-- keys can be used to configure plugin behavior/loading/etc.
-- Use opts = {} to automatically pass options to a plugin's setup() function, forcing the plugin to be loaded.
-- Alternatively, use config = function() ... end for full control over the configuration.
-- If you prefer to call setup explicitly, use:
--    {
--        'lewis6991/gitsigns.nvim',
--        config = function()
--            require('gitsigns').setup({
--                -- Your gitsigns configuration here
--            })
--        end,
--    }
-- Here is a more advanced example where we pass configuration
-- options to gitsigns.nvim.
-- See :help gitsigns to understand what the configuration keys do
-- LOADER FOR YOUR CUSTOM COLORSCHEME
-- This loads your custom colorscheme directly without a plugin
-- The colorscheme is loaded after lazy.nvim setup
{ -- Adds git related signs to the gutter, as well as utilities for managing changes
"lewis6991/gitsigns.nvim",
opts = {
signs = {
add = { text = "+" },
change = { text = "" },
delete = { text = "_" },
topdelete = { text = "‾" },
changedelete = { text = "" },
},
},
},

-- NOTE: Plugins can also be configured to run Lua code when they are loaded.
-- This is often very useful to both group configuration, as well as handle
-- lazy loading plugins that don't need to be loaded immediately at startup.
-- For example, in the following configuration, we use:
--  event = 'VimEnter'
-- which loads which-key before all the UI elements are loaded. Events can be
-- normal autocommands events (:help autocmd-events).
-- Then, because we use the opts key (recommended), the configuration runs
-- after the plugin has been loaded as require(MODULE).setup(opts).

{                   -- Useful plugin to show you pending keybinds.
"folke/which-key.nvim",
event = "VimEnter", -- Sets the loading event to 'VimEnter'
opts = {
-- delay between pressing a key and opening which-key (milliseconds)
-- this setting is independent of vim.o.timeoutlen
delay = 0,
icons = {
-- set icon mappings to true if you have a Nerd Font
mappings = vim.g.have_nerd_font,
-- If you are using a Nerd Font: set icons.keys to an empty table which will use the
-- default which-key.nvim defined Nerd Font icons, otherwise define a string table
keys = vim.g.have_nerd_font and {} or {
Up = "<Up> ",
Down = "<Down> ",
Left = "<Left> ",
Right = "<Right> ",
C = "<C-…> ",
M = "<M-…> ",
D = "<D-…> ",
S = "<S-…> ",
CR = "<CR> ",
Esc = "<Esc> ",
ScrollWheelDown = "<ScrollWheelDown> ",
ScrollWheelUp = "<ScrollWheelUp> ",
NL = "<NL> ",
BS = "<BS> ",
Space = "<Space> ",
Tab = "<Tab> ",
F1 = "<F1>",
F2 = "<F2>",
F3 = "<F3>",
F4 = "<F4>",
F5 = "<F5>",
F6 = "<F6>",
F7 = "<F7>",
F8 = "<F8>",
F9 = "<F9>",
F10 = "<F10>",
F11 = "<F11>",
F12 = "<F12>",
},
},

  -- Document existing key chains
  spec = {
    { "<leader>s", group = "[S]earch" },
    { "<leader>t", group = "[T]oggle" },
    { "<leader>h", group = "Git [H]unk",     mode = { "n", "v" } },
    { "<leader>c", group = "[C]opilot Chat", mode = { "n", "v" } },
  },
},