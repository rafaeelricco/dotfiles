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

  -- Treesitter for syntax highlighting and indentation.
  -- Uses the new `main` branch API (post-rewrite). The legacy
  -- `nvim-treesitter.configs` module no longer exists.
  {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    lazy = false,
    build = ":TSUpdate",
    init = function()
      local ensure_installed = {
        "bash",
        "c",
        "diff",
        "html",
        "lua",
        "luadoc",
        "markdown",
        "markdown_inline",
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
      }

      local installed = require("nvim-treesitter.config").get_installed()
      local to_install = vim.iter(ensure_installed)
        :filter(function(p) return not vim.tbl_contains(installed, p) end)
        :totable()
      if #to_install > 0 then
        require("nvim-treesitter").install(to_install)
      end

      vim.api.nvim_create_autocmd("FileType", {
        callback = function(args)
          if pcall(vim.treesitter.start, args.buf) then
            vim.bo[args.buf].indentexpr =
              "v:lua.require'nvim-treesitter'.indentexpr()"
          end
        end,
      })
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

  -- Inline color swatches for hex, rgb/hsl, CSS vars, named colors, and Tailwind.
  -- Uses virtual symbol rendering so the original source text stays untouched.
  {
    "brenoprata10/nvim-highlight-colors",
    event = { "BufReadPost", "BufNewFile" },
    cmd = "HighlightColors",
    keys = {
      { "<leader>tc", "<cmd>HighlightColors Toggle<cr>", desc = "[T]oggle [C]olor highlights" },
    },
    opts = {
      render = "virtual",
      virtual_symbol = "■",
      virtual_symbol_prefix = "",
      virtual_symbol_suffix = " ",
      virtual_symbol_position = "inline",
      enable_hex = true,
      enable_short_hex = true,
      enable_rgb = true,
      enable_hsl = true,
      enable_hsl_without_function = true,
      enable_ansi = true,
      enable_xterm256 = true,
      enable_var_usage = true,
      enable_named_colors = true,
      enable_tailwind = true,
      exclude_filetypes = {},
      exclude_buftypes = {},
    },
  },

  -- VSCode-style multicursor. Ctrl-N selects the word under the cursor and,
  -- when repeated, adds cursors on the next occurrences (like Cmd-D in VSCode).
  --
  -- Cheat sheet (VM has its OWN leader = "\", separate from <Space>):
  --   Start (normal):  Ctrl-N          word under cursor; repeat = next match
  --                    Ctrl-Down/Up    add cursor on line below/above (column)
  --                    \A              select ALL occurrences in the file
  --                    \/              start cursors from a regex search
  --                    Ctrl/Cmd+click  add a cursor with the mouse
  --   Start (visual):  Ctrl-N          turn the selection into the first cursor
  --   In VM mode:      n / N           add next / previous occurrence
  --                    q               skip this occurrence, go to next
  --                    Q               remove the cursor under the caret
  --                    [ / ]           jump to previous / next cursor
  --                    Tab             toggle cursor <-> extend (visual) mode
  --                    c / i / a       change / insert / append at ALL cursors
  --                    Esc             leave multicursor mode
  -- {
  --   "mg979/vim-visual-multi",
  --   branch = "master",
  --   -- Load on opening a real buffer so the global mappings (Ctrl-N, etc.) are
  --   -- ready, without paying a startup cost. Same load strategy used by
  --   -- nvim-highlight-colors in this file.
  --   event = { "BufReadPost", "BufNewFile" },
  --   init = function()
  --     -- Keep the plugin's default mappings (Ctrl-N, Ctrl-Up/Down,
  --     -- Shift-Left/Right, \A to select all occurrences, \/ regex). Note the "\"
  --     -- here is VM's own leader (g:VM_leader), not the global <Space> leader.
  --     vim.g.VM_default_mappings = 1
  --     -- Enable multicursor via mouse click (Ctrl/Cmd + click).
  --     vim.g.VM_mouse_mappings = 1
  --     -- Less noise when leaving multicursor mode.
  --     vim.g.VM_silent_exit = 1
  --     vim.g.VM_show_warnings = 0
  --     -- Highlight theme for cursors/selections (optional; values: codedark,
  --     -- iceblue, neon, ocean, etc.).
  --     vim.g.VM_theme = "iceblue"
  --   end,
  -- },
}
