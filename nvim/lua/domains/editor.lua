-- [[ Editor Domain ]]
-- This file configures plugins that enhance the core editing experience, such as
-- indentation guides, text manipulation tools, and visual aids.

return {
  -- Configures `indent-blankline`, which adds indentation guides to the editor.
  -- This setup uses custom characters for a more visual and modern look.
  {
    "NMAC427/guess-indent.nvim",
    config = function()
      require("guess-indent").setup({})
    end,
  },

  -- Autoformatting
  {
    "stevearc/conform.nvim",
    lazy = false,
    keys = {
      {
        "<leader>f",
        function()
          require("conform").format({ async = true, lsp_fallback = true })
        end,
        mode = "",
        desc = "[F]ormat buffer",
      },
      {
        "fs",
        function()
          require("conform").format({ async = true, lsp_fallback = true })
        end,
        mode = "v",
        desc = "[F]ormat [S]election",
      },
    },
    opts = {
      notify_on_error = false,
      format_on_save = false, -- Disabled: format-on-save functionality
    },
  },

  -- Treesitter for syntax highlighting and more
  {
    "nvim-treesitter/nvim-treesitter",
    build = ":TSUpdate",
    opts = {
      ensure_installed = {
        "bash",
        "c",
        "diff",
        "html",
        "lua",
        "luadoc",
        "markdown",
        "vim",
        "vimdoc",
        "javascript",
        "typescript",
        "tsx",
        "json",
        "yaml",
        "css",
        "python",
        "rust",
        "go",
      },
      auto_install = true,
      highlight = {
        enable = true,
        additional_vim_regex_highlighting = { "ruby" },
      },
      indent = { enable = true, disable = { "ruby" } },
    },
    config = function(_, opts)
      require("nvim-treesitter.install").prefer_git = true
      require("nvim-treesitter.configs").setup(opts)
    end,
  },

  -- Auto-close and auto-rename HTML/XML/JSX tags using Treesitter
  {
    "windwp/nvim-ts-autotag",
    event = "InsertEnter",
    config = function()
      require('nvim-ts-autotag').setup({
        opts = {
          -- Enable automatic tag closing (e.g., typing <div> creates <div></div>)
          enable_close = true,
          -- Enable automatic tag renaming (changing opening tag updates closing tag)
          enable_rename = true,
          -- Disable auto-close on trailing </
          enable_close_on_slash = false,
        },
      })
    end,
  },

  -- Auto-pairing for brackets, quotes, and other characters
  {
    "windwp/nvim-autopairs",
    event = "InsertEnter",
    opts = {
      -- Use Treesitter to avoid adding pairs inside strings or comments
      check_ts = true,
      -- Configure Treesitter integration for specific filetypes
      ts_config = {
        lua = { "string" },
        javascript = { "template_string" },
        java = false,
      },
      -- Disable in specific filetypes
      disable_filetype = { "TelescopePrompt", "spectre_panel" },
      -- Enable smart backspace behavior
      map_bs = true,
      -- Enable smart enter behavior
      map_cr = true,
    },
    config = function(_, opts)
      local npairs = require("nvim-autopairs")
      npairs.setup(opts)
      
      -- Note: This configuration uses blink.cmp instead of nvim-cmp
      -- blink.cmp has built-in auto_brackets functionality that may overlap
      -- with nvim-autopairs. You can disable blink.cmp's auto_brackets
      -- in completion.lua if you prefer nvim-autopairs' behavior.
    end,
  },
}