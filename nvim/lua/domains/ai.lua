-- [[ AI Domain ]]
-- This file configures AI-powered code assistance plugins.
-- Currently configured with Augment Code for context-aware code suggestions.

return {
  --[[
  {
    "rafaeelricco/claude-code.nvim",
    name = "claude",
    dependencies = {
      {
        "folke/snacks.nvim",
        opts = {
          input = {},
          picker = { ui_select = false },
          terminal = {},
        },
      },
    },
    cmd = {
      "ClaudeCode",
      "ClaudeCodeFocus",
      "ClaudeCodeAdd",
      "ClaudeCodeSend",
      "ClaudeCodeTreeAdd",
      "ClaudeCodeDiffAccept",
      "ClaudeCodeDiffDeny",
    },
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
      { "<leader>aa", "<cmd>ClaudeCodeDiffAccept<cr>",  desc = "Accept diff" },
      { "<leader>ad", "<cmd>ClaudeCodeDiffDeny<cr>",    desc = "Deny diff" },
    },
  },
  ]]
  {
    "rafaeelricco/copy.nvim",
    lazy = false,
    config = true,
    opts = {
      send = {
        -- Disable plugin auto-map; lazy.keys owns visual <leader>ac
        -- (avoids double-bind warn vs Claude normal-mode <leader>ac).
        keymap = false,
      },
    },
    keys = {
      {
        "<leader>ac",
        ":CopySendSelection<CR>",
        mode = "x",
        desc = "Copy selection as @file#L ref",
      },
    },
  },
  -- {
  --   "NickvanDyke/opencode.nvim",
  --   dependencies = {
  --     -- Recommended for `ask()` and `select()`.
  --     -- Add a snacks dependency here if this block is re-enabled alone.
  --     ---@module 'snacks' <- Loads `snacks.nvim` types for configuration intellisense.
  --     "folke/snacks.nvim",
  --   },
  --   config = function()
  --     ---@type opencode.Opts
  --     vim.g.opencode_opts = {
  --       -- Your configuration, if any — see `lua/opencode/config.lua`, or "goto definition" on the type or field.
  --     }
  --
  --     -- Required for `opts.events.reload`.
  --     vim.o.autoread = true
  --
  --     -- Recommended/example keymaps.
  --     -- vim.keymap.set({ "n", "x" }, "<C-s>", function() require("opencode").ask("@this: ", { submit = true }) end, { desc = "Ask opencode…" })
  --     vim.keymap.set({ "n", "x" }, "<C-x>", function() require("opencode").select() end,
  --       { desc = "Execute opencode action…" })
  --     vim.keymap.set({ "n", "t" }, "<C-.>", function() require("opencode").toggle() end, { desc = "Toggle opencode" })
  --
  --     vim.keymap.set({ "n", "x" }, "go", function() return require("opencode").operator("@this ") end,
  --       { desc = "Add range to opencode", expr = true })
  --     vim.keymap.set("n", "goo", function() return require("opencode").operator("@this ") .. "_" end,
  --       { desc = "Add line to opencode", expr = true })
  --
  --     -- You may want these if you stick with the opinionated "<C-a>" and "<C-x>" above — otherwise consider "<leader>o…".
  --     vim.keymap.set("n", "+", "<C-a>", { desc = "Increment under cursor", noremap = true })
  --     vim.keymap.set("n", "-", "<C-x>", { desc = "Decrement under cursor", noremap = true })
  --   end,
  -- },
  {
    "github/copilot.vim",
    -- Load Copilot together with nvim instead of deferring to the first
    -- InsertEnter, so the agent connects and `:Copilot` is ready at startup.
    lazy = false,
    init = function()
      -- These globals must be set BEFORE copilot.vim loads.
      -- Prevents Copilot from mapping <Tab> itself (we map it in config below).
      vim.g.copilot_no_tab_map = true
      vim.g.copilot_assume_mapped = true

      -- Ensures Copilot does not register as an LSP server, which could cause
      -- conflicts with other language servers. It also sets the correct Node.js path.
      -- local node_path = vim.fn.exepath("node")
      -- if node_path == "" then
      --   vim.notify("Node.js not found in PATH", vim.log.levels.ERROR)
      -- end
      -- vim.g.copilot_node_command = node_path

      -- Defines which filetypes Copilot should be active in, disabling it for
      -- specific buffers like git commits, help pages, and file explorers.
      vim.g.copilot_filetypes = { ["*"] = true }
    end,
    config = function()
      -- <Tab> accepts the Copilot suggestion when one is shown; otherwise inserts a
      -- real <Tab>. Explicit check avoids the literal "<Tab>" fallback bug and the
      -- "nothing happens" case. replace_keycodes=false keeps the suggestion text
      -- verbatim; the fallback is termcode-expanded manually.
      vim.keymap.set("i", "<Tab>", function()
        local suggestion = vim.fn["copilot#Accept"]("")
        if suggestion ~= "" then
          return suggestion
        end
        return vim.api.nvim_replace_termcodes("<Tab>", true, true, true)
      end, {
        expr = true,
        silent = true,
        replace_keycodes = false,
        desc = "Accept Copilot suggestion or indent",
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
