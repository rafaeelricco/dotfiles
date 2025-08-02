-- [[ AI Domain ]]
-- This file configures plugins related to artificial intelligence, including
-- code assistants and other AI-powered tools.

return {
  -- Configures the Claude Code plugin for AI-assisted development.
  -- Provides keymaps for interacting with the Claude AI, managing diffs,
  -- and sending code snippets.
  {
    "rafaeelricco/claude-code.nvim",
    name = "claude",
    dependencies = { "folke/snacks.nvim" },
    lazy = false,
    config = true,
    keys = {
      { "<leader>a",  nil,                              desc = "AI/Claude Code" },
      { "<leader>ac", "<cmd>ClaudeCode<cr>",            desc = "Toggle Claude" },
      { "<leader>af", "<cmd>ClaudeCodeFocus<cr>",       desc = "Focus Claude" },
      { "<leader>ar", "<cmd>ClaudeCode --resume<cr>",   desc = "Resume Claude" },
      { "<leader>aC", "<cmd>ClaudeCode --continue<cr>", desc = "Continue Claude" },
      { "<leader>ab", "<cmd>ClaudeCodeAdd %<cr>",       desc = "Add current buffer" },
      { "<leader>as", "<cmd>ClaudeCodeSend<cr>",        mode = "v",                 desc = "Send to Claude" },
      { "<leader>as", "<cmd>ClaudeCodeTreeAdd<cr>",     desc = "Add file",          ft = { "NvimTree", "neo-tree", "oil" } },
      -- Diff management
      { "<leader>aa", "<cmd>ClaudeCodeDiffAccept<cr>",  desc = "Accept diff" },
      { "<leader>ad", "<cmd>ClaudeCodeDiffDeny<cr>",    desc = "Deny diff" },
    },
  },

  -- Configures GitHub Copilot, a popular AI pair programmer.
  -- This setup disables the default tab mapping to avoid conflicts and sets
  -- custom keybindings for a more integrated experience.
  {
    "github/copilot.vim",
    event = "InsertEnter",
    config = function()
      -- Prevents Copilot from overriding the default <Tab> behavior.
      vim.g.copilot_no_tab_map = true
      vim.g.copilot_assume_mapped = true

      -- Ensures Copilot does not register as an LSP server, which could cause
      -- conflicts with other language servers. It also sets the correct Node.js path.
      local node_path = vim.fn.exepath("node")
      if node_path == "" then
        vim.notify("Node.js not found in PATH", vim.log.levels.ERROR)
      end
      vim.g.copilot_node_command = node_path

      -- Defines which filetypes Copilot should be active in, disabling it for
      -- specific buffers like git commits, help pages, and file explorers.
      vim.g.copilot_filetypes = {
        ["*"] = true,
        gitcommit = false,
        gitrebase = false,
        help = false,
        hgcommit = false,
        svn = false,
        cvs = false,
        ["."] = false,
        TelescopePrompt = false,  -- Disable in Telescope
        ["neo-tree"] = false,     -- Disable in file explorer
      }

       -- Sets a custom keymap for accepting Copilot suggestions, providing a more
      -- familiar and ergonomic experience.
      vim.keymap.set("i", "<Tab>", 'copilot#Accept("<CR>")', {
        expr = true,
        silent = true,
        desc = "Accept Copilot suggestion",
      })
      
      -- Defines extra keymaps for more granular control over Copilot, such as
      -- accepting individual words and navigating between suggestions.
      vim.keymap.set("i", "<C-L>", "<Plug>(copilot-accept-word)", { desc = "Accept word" })
      vim.keymap.set("i", "<C-]>", "<Plug>(copilot-dismiss)", { desc = "Dismiss suggestion" })
      vim.keymap.set("i", "<M-]>", "<Plug>(copilot-next)", { desc = "Next suggestion" })
      vim.keymap.set("i", "<M-[>", "<Plug>(copilot-previous)", { desc = "Previous suggestion" })
    end,
  },
}