-- [[ Plugin Loader ]]
-- This file is responsible for bootstrapping the `lazy.nvim` plugin manager and
-- loading all the plugins defined in the `domains` directory.
-- It ensures that `lazy.nvim` is installed before attempting to load any plugins.
-- For more information, see `:help lazy.nvim.txt` or https://github.com/folke/lazy.nvim.
local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"
if not (vim.uv or vim.loop).fs_stat(lazypath) then
  local lazyrepo = "https://github.com/folke/lazy.nvim.git"
  local out = vim.fn.system({ "git", "clone", "--filter=blob:none", "--branch=stable", lazyrepo, lazypath })
  if vim.v.shell_error ~= 0 then
    error("Error cloning lazy.nvim:\n" .. out)
  end
end ---@diagnostic disable-next-line: undefined-field
vim.opt.rtp:prepend(lazypath)

-- Configures `lazy.nvim` to load all plugins from the `domains` directory.
-- Each domain represents a specific area of functionality, such as UI, LSP, or Git.
require("lazy").setup({
  -- Imports all plugin configurations from their respective domain files.
  { import = "domains.ai" },
  { import = "domains.completion" },
  { import = "domains.editor" },
  { import = "domains.git" },
  { import = "domains.icons" },
  { import = "domains.lsp" },
  { import = "domains.ui" },
}, {
  ui = {
    -- Configures the UI for `lazy.nvim`, including custom icons that adapt based
    -- on whether a Nerd Font is available.
    icons = vim.g.have_nerd_font and {} or {
      cmd = "⌘",
      config = "🛠",
      event = "📅",
      ft = "📂",
      init = "⚙",
      keys = "🗝",
      plugin = "🔌",
      runtime = "💻",
      require = "🌙",
      source = "📄",
      start = "🚀",
      task = "📌",
      lazy = "💤 ",
    },
  },
})
