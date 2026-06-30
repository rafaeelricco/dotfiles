-- [[ Git Domain ]]
-- This file configures plugins and tools related to Git version control, providing
-- seamless integration for staging, committing, diffing, and more.

return {
  -- Configures `gitsigns.nvim`, a plugin that provides Git decorations in the sign column.
  -- It shows which lines have been added, modified, or deleted.
  {
    "lewis6991/gitsigns.nvim",
    opts = {
      signs = {
        add = { text = "+" },
        change = { text = "~" },
        delete = { text = "_" },
        topdelete = { text = "‾" },
        changedelete = { text = "~" },
      },
    },
  },

  -- Configures `neogit`, an interactive and powerful Git interface for Neovim.
  -- Inspired by Magit, it provides a comprehensive Git workflow within Neovim.
  {
    "NeogitOrg/neogit",
    dependencies = {
      "nvim-lua/plenary.nvim", -- Required dependency
      "sindrets/diffview.nvim", -- Optional: enhanced diff viewing
      "nvim-telescope/telescope.nvim", -- Optional: telescope integration
    },
    lazy = false, -- Load at startup for instant `:Neogit` open
    keys = {
      { "<leader>gs", "<cmd>Neogit<cr>", desc = "Git Status (Neogit)" },
    },
    opts = {
      -- Use Neogit defaults (kind = "tab"); avoids the floating window
      -- overlapping commit/diff views when reviewing past commits.
    },
  },
}