-- [[ Core Editor Keymaps ]]
-- This file defines the core keybindings for the editor, focusing on navigation,
-- window management, and essential editing commands. For plugin-specific keymaps,
-- see the corresponding plugin configuration file.
--  See `:help vim.keymap.set()`

-- Clears search highlights when <Esc> is pressed in normal mode.
-- See `:help hlsearch` for more information.
vim.keymap.set("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Quick replace mappings for efficient text substitution
vim.keymap.set("n", "<Leader>r", ":%s/<C-r><C-w>//g<Left><Left>", { desc = "Replace word under cursor" })
vim.keymap.set("v", "<Leader>r", "\"ay:%s/<C-r>a//g<Left><Left>", { desc = "Replace selected text" })

-- Diagnostic keymaps for quick access to problem lists.
vim.keymap.set("n", "<leader>q", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- Provides a more intuitive way to exit terminal mode using <Esc><Esc>.
-- The default <C-\"><C-n> can be hard to remember.
-- NOTE: This mapping may not work in all terminal emulators or tmux sessions.
-- If it fails, the default keybinding should be used.
vim.keymap.set("t", "<Esc><Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Sends a line continuation character in terminal mode, mimicking VSCode's behavior.
vim.keymap.set("t", "<S-CR>", "\\<CR>", { desc = "Send line continuation in terminal" })

-- Facilitates seamless navigation between window splits using CTRL+<hjkl>.
-- See `:help wincmd` for a comprehensive list of window commands.
vim.keymap.set("n", "<C-h>", "<C-w><C-h>", { desc = "Move focus to the left window" })
vim.keymap.set("n", "<C-l>", "<C-w><C-l>", { desc = "Move focus to the right window" })
vim.keymap.set("n", "<C-j>", "<C-w><C-j>", { desc = "Move focus to the lower window" })
vim.keymap.set("n", "<C-k>", "<C-w><C-k>", { desc = "Move focus to the upper window" })

-- Simplifies window management with a straightforward keybinding to close the current window.
vim.keymap.set("n", "<leader>w", "<cmd>close<CR>", { desc = "Close current [W]indow" })

-- Allows moving the current line or visual selection up and down using Option+Up/Down.
vim.keymap.set("n", "<C-S-Down>", "<cmd>m .+1<CR>==", { desc = "Move current line down" })
vim.keymap.set("n", "<C-S-Up>", "<cmd>m .-2<CR>==", { desc = "Move current line up" })
vim.keymap.set("v", "<C-S-Up>", ":m '<-2<CR>gv=gv", { desc = "Move selected lines up" })
vim.keymap.set("v", "<C-S-Down>", ":m '>+1<CR>gv=gv", { desc = "Move selected lines down" })

-- Binds Option+Backspace to delete the word backward in insert mode.
vim.keymap.set("i", "<M-BS>", "<C-w>", { desc = "Delete word backward" })

-- Visual mode indentation using Tab and Shift+Tab for intuitive block indenting.
-- The 'gv' suffix re-selects the visual area after indentation for consecutive operations.
vim.keymap.set("v", "<Tab>", ">gv", { desc = "Indent selected block" })
vim.keymap.set("v", "<S-Tab>", "<gv", { desc = "Unindent selected block" })

-- Normal mode indentation using Tab and Shift+Tab for current line.
-- Uses '>>' and '<<' commands which respect shiftwidth settings.
vim.keymap.set("n", "<Tab>", ">>", { desc = "Indent current line" })
vim.keymap.set("n", "<S-Tab>", "<<", { desc = "Unindent current line" })