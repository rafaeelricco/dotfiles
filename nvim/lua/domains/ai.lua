-- [[ AI Domain ]]
-- This file configures AI-powered code assistance plugins.
-- Currently configured with Augment Code for context-aware suggestions.

return {
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

  -- -- Configures OpenCode, an AI assistant that integrates with various LLMs
  -- -- to provide code suggestions, explanations, and more directly within Neovim.
  -- {
  --   'NickvanDyke/opencode.nvim',
  --   dependencies = {{ 'folke/snacks.nvim', opts = { input = { enabled = true } } }},
  --   config = function()
  --     -- Required for `opts.auto_reload`
  --     vim.opt.autoread = true
  --
  --     -- Recommended keymaps
  --     vim.keymap.set("n", "<leader>ot", function() require("opencode").toggle() end, { desc = "Toggle embedded" })
  --     vim.keymap.set("n", "<leader>oa", function() require("opencode").ask("@cursor: ") end, { desc = "Ask about this" })
  --     vim.keymap.set("v", "<leader>oa", function() require("opencode").ask("@selection: ") end, { desc = "Ask about selection" })
  --     vim.keymap.set("n", "<leader>o+", function() require("opencode").prompt("@buffer", { append = true }) end, { desc = "Add buffer to prompt" })
  --     vim.keymap.set("v", "<leader>o+", function() require("opencode").prompt("@selection", { append = true }) end, { desc = "Add selection to prompt" })
  --     vim.keymap.set("n", "<leader>oe", function() require("opencode").prompt("Explain @cursor and its context") end, { desc = "Explain this code" })
  --     vim.keymap.set("n", "<leader>on", function() require("opencode").command("session_new") end, { desc = "New session" })
  --     vim.keymap.set("n", "<S-C-u>",    function() require("opencode").command("messages_half_page_up") end, { desc = "Messages half page up" })
  --     vim.keymap.set("n", "<S-C-d>",    function() require("opencode").command("messages_half_page_down") end, { desc = "Messages half page down" })
  --     vim.keymap.set({ "n", "v" }, "<leader>os", function() require("opencode").select() end, { desc = "Select prompt" })
  --   end,
  -- },
  --
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
      vim.g.copilot_filetypes = { ["*"] = true }

      -- Sets a custom keymap for accepting Copilot suggestions with <C-y> to avoid
      -- conflicts with snippet navigation that uses <Tab>.
      vim.keymap.set("i", "<C-y>", 'copilot#Accept("<CR>")', {
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
