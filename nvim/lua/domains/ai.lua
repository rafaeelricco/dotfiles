-- [[ AI Domain ]]
-- This file configures AI-powered code assistance plugins.
-- Currently configured with Augment Code for context-aware suggestions.

return {

  -- ============================================================================
  -- Augment Code Configuration
  -- ============================================================================
  -- Augment Code provides AI-powered code suggestions with workspace context.
  -- It integrates with your project structure to offer more relevant completions.
  {
    "augmentcode/augment.vim",
    config = function()
      -- Configure workspace folders for better context
      vim.g.augment_workspace_folders = { vim.fn.getcwd() }
      
      -- Keep default Tab mapping enabled for accepting suggestions
      -- vim.g.augment_disable_tab_mapping = true
      
      -- Custom completion acceptance mappings (additional options)
      vim.keymap.set("i", "<C-y>", "<cmd>call augment#Accept()<cr>", { desc = "Accept Augment suggestion" })
      
      -- Chat keymaps (existing)
      vim.keymap.set({ "n", "v" }, "<leader>ac", ":Augment chat<CR>", { desc = "Augment chat" })
      vim.keymap.set("n", "<leader>an", ":Augment chat-new<CR>", { desc = "Augment new chat" })
      vim.keymap.set("n", "<leader>at", ":Augment chat-toggle<CR>", { desc = "Augment toggle chat" })
    end,
  },
}