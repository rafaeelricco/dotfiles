-- [[ Global Environment Configuration ]]
-- This file configures global settings and variables that affect the editor's behavior.

-- Sets the leader key to <space>, which is a common convention.
-- This must be configured before plugins are loaded to ensure they recognize the correct leader key.
-- See `:help mapleader` for more details.
vim.g.mapleader = " "
vim.g.maplocalleader = " "

-- Informs the editor that a Nerd Font is installed and active in the terminal.
-- This enables the use of special icons and glyphs in the UI.
vim.g.have_nerd_font = true

-- Adds the Homebrew-installed fzf scripts to Neovim's runtime path so that
-- command-line fuzzy finders (e.g., :Files) are available.
local fzf_runtime = "/opt/homebrew/opt/fzf"
if vim.fn.isdirectory(fzf_runtime) == 1 then
  vim.opt.rtp:append(fzf_runtime)
end
