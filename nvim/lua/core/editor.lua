-- =============================================
-- Basic Operations
-- =============================================

-- Clear search highlights when pressing <Esc> in normal mode
-- Reference: `:help hlsearch`
vim.keymap.set("n", "<Esc>", "<cmd>nohlsearch<CR>")

-- Quick text substitution mappings
-- - Normal mode: Replace word under cursor globally
-- - Visual mode: Replace selected text globally
vim.keymap.set("n", "<Leader>r", ":%s/<C-r><C-w>//g<Left><Left>", { desc = "Replace word under cursor" })
vim.keymap.set("v", "<Leader>r", "\"ay:%s/<C-r>a//g<Left><Left>", { desc = "Replace selected text" })

-- Open diagnostic quickfix list for easy access to problems
vim.keymap.set("n", "<leader>q", vim.diagnostic.setloclist, { desc = "Open diagnostic [Q]uickfix list" })

-- =============================================
-- Terminal Integration
-- =============================================

-- Exit terminal mode with double <Esc> (more intuitive than default)
-- Note: May not work in all terminal emulators or tmux sessions
-- Default fallback: <C-\><C-n>
vim.keymap.set("t", "<Esc><Esc>", "<C-\\><C-n>", { desc = "Exit terminal mode" })

-- Send line continuation character in terminal mode
-- Mimics VSCode's behavior for multi-line input
vim.keymap.set("t", "<S-CR>", "\\<CR>", { desc = "Send line continuation in terminal" })

-- =============================================
-- Window Management
-- =============================================

-- Navigate between window splits using Ctrl + hjkl keys
-- Reference: `:help wincmd` for comprehensive window commands
vim.keymap.set("n", "<C-h>", "<C-w><C-h>", { desc = "Move focus to the left window" })
vim.keymap.set("n", "<C-l>", "<C-w><C-l>", { desc = "Move focus to the right window" })
vim.keymap.set("n", "<C-j>", "<C-w><C-j>", { desc = "Move focus to the lower window" })
vim.keymap.set("n", "<C-k>", "<C-w><C-k>", { desc = "Move focus to the upper window" })

-- Close the current window quickly
vim.keymap.set("n", "<leader>w", "<cmd>close<CR>", { desc = "Close current [W]indow" })

-- =============================================
-- Text Editing and Manipulation
-- =============================================

-- Move lines up and down (works with single lines or visual selections)
-- Normal mode: Move current line
-- Visual mode: Move selected lines while preserving selection
vim.keymap.set("n", "<C-S-Down>", "<cmd>m .+1<CR>==", { desc = "Move current line down" })
vim.keymap.set("n", "<C-S-Up>", "<cmd>m .-2<CR>==", { desc = "Move current line up" })
vim.keymap.set("v", "<C-S-Up>", ":m '<-2<CR>gv=gv", { desc = "Move selected lines up" })
vim.keymap.set("v", "<C-S-Down>", ":m '>+1<CR>gv=gv", { desc = "Move selected lines down" })

-- Delete entire line using Command+Delete
-- Normal mode: Uses 'dd' to delete current line
-- Insert mode: Temporarily exits insert, deletes line, and returns to insert mode
vim.keymap.set("n", "<D-Del>", "dd", { desc = "Delete entire line" })
vim.keymap.set("i", "<D-Del>", "<Esc>ddi", { desc = "Delete entire line" })

-- Indent and unindent selected text blocks
-- Uses 'gv' to re-select visual area after indentation for consecutive operations
vim.keymap.set("v", "<Tab>", ">gv", { desc = "Indent selected block" })
vim.keymap.set("v", "<S-Tab>", "<gv", { desc = "Unindent selected block" })

-- Indent and unindent current line in normal mode
-- Uses '>>' and '<<' commands which respect shiftwidth settings
vim.keymap.set("n", "<Tab>", ">>", { desc = "Indent current line" })
vim.keymap.set("n", "<S-Tab>", "<<", { desc = "Unindent current line" })

-- Configure horizontal scrolling to only occur when lines exceed window width
vim.opt.sidescroll = 1      -- Smooth horizontal scrolling when needed
vim.opt.sidescrolloff = 5   -- Keep 5 columns visible around cursor horizontally

-- Enable fluid cursor movement across line boundaries and long lines
vim.opt.whichwrap = "b,s,<,>,[,]"  -- Allow cursor to wrap at line boundaries

-- Performance optimizations for smooth scrolling
-- Skip screen redraws during macro execution for smoother performance
vim.opt.lazyredraw = true    -- Don't redraw while executing macros

-- =============================================
-- Ghostty Terminal Line Navigation Support
-- =============================================

-- Navigate to start and end of line using Command+Arrow keys (sent as Ctrl-A/Ctrl-E by terminal)
-- Note: Ghostty translates Command+Left to Ctrl-A and Command+Right to Ctrl-E
vim.keymap.set("n", "<C-A>", "^", { desc = "Move to start of line" })
vim.keymap.set("n", "<C-E>", "$", { desc = "Move to end of line" })

-- Insert mode: temporarily exit insert mode, navigate, return to insert mode
vim.keymap.set("i", "<C-A>", "<Esc>^i", { desc = "Move to start of line" })
vim.keymap.set("i", "<C-E>", "<Esc>$a", { desc = "Move to end of line" })

-- Visual mode: extend selection to line boundaries
vim.keymap.set("v", "<C-A>", "^", { desc = "Extend selection to start of line" })
vim.keymap.set("v", "<C-E>", "$", { desc = "Extend selection to end of line" })

-- Delete word backward using Option+Backspace
vim.keymap.set("i", "<M-BS>", "<C-w>", { desc = "Delete word backward" })

-- =============================================
-- Diagnostic Navigation
-- =============================================

-- Helper function for diagnostic navigation with optional severity filter
local diagnostic_goto = function(next, severity)
  return function()
    vim.diagnostic.jump({
      count = (next and 1 or -1) * vim.v.count1,
      severity = severity and vim.diagnostic.severity[severity] or nil,
      float = true,
    })
  end
end

-- Open floating diagnostic window for current line
vim.keymap.set("n", "<leader>cd", vim.diagnostic.open_float, { desc = "Line [D]iagnostics" })

-- Navigate between all diagnostics
vim.keymap.set("n", "]d", diagnostic_goto(true), { desc = "Next Diagnostic" })
vim.keymap.set("n", "[d", diagnostic_goto(false), { desc = "Prev Diagnostic" })

-- Navigate between errors only
vim.keymap.set("n", "]e", diagnostic_goto(true, "ERROR"), { desc = "Next Error" })
vim.keymap.set("n", "[e", diagnostic_goto(false, "ERROR"), { desc = "Prev Error" })

-- Navigate between warnings only
vim.keymap.set("n", "]w", diagnostic_goto(true, "WARN"), { desc = "Next Warning" })
vim.keymap.set("n", "[w", diagnostic_goto(false, "WARN"), { desc = "Prev Warning" })

-- =============================================
-- Diagnostic Copy to Clipboard
-- =============================================

-- Copy all diagnostics on the current line to clipboard
vim.keymap.set("n", "<leader>yd", function()
  local line = vim.api.nvim_win_get_cursor(0)[1] - 1
  local diagnostics = vim.diagnostic.get(0, { lnum = line })
  if #diagnostics == 0 then
    vim.notify("No diagnostics on current line", vim.log.levels.WARN)
    return
  end
  local messages = vim.tbl_map(function(d)
    local prefix = d.source and ("[" .. d.source .. "] ") or ""
    return prefix .. d.message
  end, diagnostics)
  vim.fn.setreg("+", table.concat(messages, "\n"))
  vim.notify(string.format("Copied %d diagnostic(s) to clipboard", #diagnostics), vim.log.levels.INFO)
end, { desc = "[Y]ank line [D]iagnostics to clipboard" })
