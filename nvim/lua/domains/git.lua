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
    cmd = "Neogit", -- Lazy load on command
    keys = {
      { "<leader>gs", "<cmd>Neogit<cr>", desc = "Git Status (Neogit)" },
    },
    opts = {
      -- Configure Neogit to open in a split window
      kind = "split",
      
      -- Disable hints at the top for a cleaner interface
      disable_hint = false,
      
      -- Enable context highlighting for better visual feedback
      disable_context_highlighting = false,
      
      -- Keep signs enabled for visual indicators
      disable_signs = false,
      
      -- Configure signs for sections, items, and hunks
      signs = {
        -- { CLOSED, OPENED }
        section = { "", "" },
        item = { "", "" },
        hunk = { "", "" },
      },
      
      -- Integration with other plugins
      integrations = {
        diffview = true, -- Enable diffview integration if available
        telescope = true, -- Enable telescope integration if available
      },
      
      -- Use default keymaps for consistency
      use_default_keymaps = true,
      
      -- Auto-refresh the status buffer
      auto_refresh = true,
      
      -- Remember settings across sessions
      remember_settings = true,
      use_per_project_settings = true,
      
      -- Configure commit editor
      commit_editor = {
        kind = "tab",
        show_staged_diff = true,
        staged_diff_split_kind = "split",
      },
      
      -- Status buffer configuration
      status = {
        recent_commit_count = 10,
        HEAD_folded = false,
      },
    },
  },
}