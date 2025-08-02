-- [[ Core Editor Keymaps ]]
-- This file defines the core keybindings for the editor, focusing on navigation,
-- window management, and essential editing commands. For plugin-specific keymaps,
-- see the corresponding plugin configuration file.
--  See `:help vim.keymap.set()`

-- Clears search highlights when <Esc> is pressed in normal mode.
-- See `:help hlsearch` for more information.
vim.keymap.set("n", "<Esc>", "<cmd>nohlsearch<CR>")

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
vim.keymap.set("n", "<M-Down>", "<cmd>m .+1<CR>==", { desc = "Move current line down" })
vim.keymap.set("n", "<M-Up>", "<cmd>m .-2<CR>==", { desc = "Move current line up" })
vim.keymap.set("v", "<M-Up>", ":m '<-2<CR>gv=gv", { desc = "Move selected lines up" })
vim.keymap.set("v", "<M-Down>", ":m '>+1<CR>gv=gv", { desc = "Move selected lines down" })

-- Binds Option+Backspace to delete the word backward in insert mode.
vim.keymap.set("i", "<M-BS>", "<C-w>", { desc = "Delete word backward" })

-- Triggers omni-completion suggestions using Control+Backspace in insert mode.
vim.keymap.set("i", "<C-BS>", "<C-x><C-o>", { desc = "Show suggestions" })

-- Sets up Command+Z for undo and Command+Shift+Z for redo across modes.
vim.keymap.set({ "n", "v", "i" }, "<D-z>", "<Esc>ua", { desc = "Undo" })
vim.keymap.set({ "n", "v", "i" }, "<D-S-z>", "<Esc><C-r>a", { desc = "Redo" })