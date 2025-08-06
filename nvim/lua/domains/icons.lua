-- [[ Icons Domain ]]
-- This file configures the icon provider for Neovim, using nvim-material-icon
-- which provides 1700+ material design icons for various filetypes and plugins.
-- Requires Nerd Font >= 3.2.0 for proper display.

return {
  {
    "DaikyXendo/nvim-material-icon",
    enabled = vim.g.have_nerd_font,
    lazy = true,
    config = function()
      -- Setup nvim-material-icon with functional configuration
      local setup_icons = function()
        require('nvim-web-devicons').setup {
          -- Enable different highlight colors per icon for file types
          color_icons = true,
          -- Enable default icons for unknown file types
          default = true,
          -- Custom icon overrides to preserve folder colors
          override = {
            ["py"] = {
              icon = "",
              color = "#FDD736",
              cterm_color = "221",
              name = "py",
            },
            ["tsx"] = {
              icon = "",
              color = "#0092E0",
              cterm_color = "38",
              name = "tsx",
            },  
          },
          -- Strict mode to ensure consistent behavior
          strict = true,
          -- Override by filename for exact matches
          override_by_filename = {},
          -- Override by file extension
          override_by_extension = {},
        }
      end

      -- Apply configuration immutably
      setup_icons()
      
      -- Ensure folder colors are applied after colorscheme loads
      vim.api.nvim_create_autocmd("ColorScheme", {
        callback = function()
          -- Force folder icon colors to override colorscheme
          vim.api.nvim_set_hl(0, "NvimTreeFolderIcon", { fg = "#91A3AE" })
          vim.api.nvim_set_hl(0, "NeoTreeDirectoryIcon", { fg = "#91A3AE" })
          vim.api.nvim_set_hl(0, "NeoTreeDirectoryName", { fg = "#91A3AE" })
          vim.api.nvim_set_hl(0, "NeoTreeRootName", { fg = "#91A3AE", bold = true })
        end,
      })
      
      -- Apply immediately for current session
      vim.api.nvim_set_hl(0, "NvimTreeFolderIcon", { fg = "#91A3AE" })
      vim.api.nvim_set_hl(0, "NeoTreeDirectoryIcon", { fg = "#91A3AE" })
      vim.api.nvim_set_hl(0, "NeoTreeDirectoryName", { fg = "#91A3AE" })
      vim.api.nvim_set_hl(0, "NeoTreeRootName", { fg = "#91A3AE", bold = true })
    end,
  },
}