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
}