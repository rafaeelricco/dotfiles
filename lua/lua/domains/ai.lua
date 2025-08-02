return {
  -- AI/Claude Code integration
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

  -- GitHub Copilot
  {
    "github/copilot.vim",
    event = "InsertEnter",
    config = function()
      -- Disable default tab mapping
      vim.g.copilot_no_tab_map = true
      vim.g.copilot_assume_mapped = true

      -- Disable Copilot as LSP server to avoid conflicts
      local node_path = vim.fn.exepath("node")
      if node_path == "" then
        vim.notify("Node.js not found in PATH", vim.log.levels.ERROR)
      end
      vim.g.copilot_node_command = node_path

      -- Copilot filetypes
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

       -- Enhanced keymaps
      vim.keymap.set("i", "<Tab>", 'copilot#Accept("<CR>")', {
        expr = true,
        silent = true,
        desc = "Accept Copilot suggestion",
      })
      
      -- Additional useful keymaps
      vim.keymap.set("i", "<C-L>", "<Plug>(copilot-accept-word)", { desc = "Accept word" })
      vim.keymap.set("i", "<C-]>", "<Plug>(copilot-dismiss)", { desc = "Dismiss suggestion" })
      vim.keymap.set("i", "<M-]>", "<Plug>(copilot-next)", { desc = "Next suggestion" })
      vim.keymap.set("i", "<M-[>", "<Plug>(copilot-previous)", { desc = "Previous suggestion" })
    end,
  },
}