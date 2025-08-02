return {
  -- Autocompletion
  {
    "saghen/blink.cmp",
    event = "VimEnter",
    version = "1.*",
    dependencies = {
      -- Snippet Engine
      {
        "L3MON4D3/LuaSnip",
        version = "2.*",
        build = (function()
          -- Build Step is needed for regex support in snippets.
          -- This step is not supported in many windows environments.
          -- Remove the below condition to re-enable on windows.
          if vim.fn.has("win32") == 1 or vim.fn.executable("make") == 0 then
            return
          end
          return "make install_jsregexp"
        end)(),
        dependencies = {
          -- `friendly-snippets` contains a variety of premade snippets.
          --    See the README about individual language/framework/plugin snippets:
          --    https://github.com/rafamadriz/friendly-snippets
          -- {
          --   'rafamadriz/friendly-snippets',
          --   config = function()
          --     require('luasnip.loaders.from_vscode').lazy_load()
          --   end,
          -- },
        },
        opts = {},
      },
      "folke/lazydev.nvim",
    },
    --- @module 'blink.cmp'
    --- @type blink.cmp.Config
    opts = {
      keymap = {
        -- Enhanced completion keymaps for VSCode-like experience
        -- 'default' (recommended) for mappings similar to built-in completions
        --   <c-y> to accept ([y]es) the completion.
        --    This will auto-import if your LSP supports it.
        --    This will expand snippets if the LSP sent a snippet.
        -- 'super-tab' for tab to accept
        -- 'enter' for enter to accept
        -- 'none' for no mappings
        preset = "enter",

        -- Additional custom keymaps for better experience
        ['<C-space>'] = { 'show', 'show_documentation', 'hide_documentation' },
        ['<C-e>'] = { 'hide' },
        ['<C-y>'] = { 'select_and_accept' },

        -- Navigation
        ['<Up>'] = { 'select_prev', 'fallback' },
        ['<Down>'] = { 'select_next', 'fallback' },
        ['<C-p>'] = { 'select_prev', 'fallback' },
        ['<C-n>'] = { 'select_next', 'fallback' },

        -- Scroll documentation
        ['<C-b>'] = { 'scroll_documentation_up', 'fallback' },
        ['<C-f>'] = { 'scroll_documentation_down', 'fallback' },

        -- Tab completion behavior
        ['<Tab>'] = { 'snippet_forward', 'fallback' },
        ['<S-Tab>'] = { 'snippet_backward', 'fallback' },

        -- Accept with detailed import information
        ['<CR>'] = { 'accept', 'fallback' },
      },

      appearance = {
        -- 'mono' (default) for 'Nerd Font Mono' or 'normal' for 'Nerd Font'
        -- Adjusts spacing to ensure icons are aligned
        nerd_font_variant = "mono",
      },

      completion = {
        -- Enable auto-show documentation for VSCode-like experience
        documentation = {
          auto_show = true,
          auto_show_delay_ms = 200,
          window = {
            border = "rounded",
            winhighlight = "Normal:BlinkCmpDoc,FloatBorder:BlinkCmpDocBorder,EndOfBuffer:BlinkCmpDoc",
            min_width = 15,
            max_width = 60,
            max_height = 20,
          }
        },
        menu = {
          -- VSCode-style completion menu configuration
          draw = {
            -- Modified columns to focus on path information
            columns = {
              { "kind_icon" },
              { "label",    "label_description", gap = 1 },
              -- Removed the kind/source display
            },
            components = {
              -- Keep other components...
              -- Modified label_description to focus on showing paths
              label_description = {
                width = { max = 40 },
                text = function(ctx)
                  -- Focus on showing import paths
                  local detail = ""
                  if ctx.item.labelDetails and ctx.item.labelDetails.description then
                    detail = ctx.item.labelDetails.description
                  elseif ctx.item.detail then
                    detail = ctx.item.detail
                  end
                  return detail
                end,
                highlight = 'BlinkCmpLabelDescription',
              },
              -- Keep other components...
            },
          },
          border = "rounded",
          winhighlight =
          "Normal:BlinkCmpMenu,FloatBorder:BlinkCmpMenuBorder,CursorLine:BlinkCmpMenuSelection,Search:None",
          -- VSCode-style behavior
          scrollbar = false,
          direction_priority = { 's', 'n' },
          max_items = 200,
        },
        -- VSCode-style completion behavior
        accept = {
          auto_brackets = {
            enabled = true,
            default_brackets = { '(', ')' },
            override_brackets_for_filetypes = {},
            force_allow_filetypes = {},
            blocked_filetypes = {},
          },
        },
        list = {
          max_items = 200,
          selection = {
            preselect = function(ctx)
              return ctx.mode ~= 'cmdline'
            end,
            auto_insert = function(ctx)
              return ctx.mode == 'cmdline'
            end,
          },
        },
        -- Enhanced ghost text (inline suggestions)
        ghost_text = {
          enabled = true,
        },
      },

      sources = {
        -- Enhanced source configuration for comprehensive autocomplete
        default = { "lsp", "path", "snippets", "lazydev", "buffer" },
        providers = {
          -- LSP with enhanced capabilities
          lsp = {
            name = "LSP",
            module = "blink.cmp.sources.lsp",
            score_offset = 100, -- Prioritize LSP suggestions
            fallbacks = { "buffer" },
            async = true,
            timeout_ms = 500,
            enabled = function()
              -- Enable LSP for all file types except specific ones
              return vim.bo.buftype ~= "prompt" and vim.bo.buftype ~= "nofile"
            end,
          },
          -- Path completion for file paths
          path = {
            name = "Path",
            module = "blink.cmp.sources.path",
            score_offset = 50,
            fallbacks = { "buffer" },
            opts = {
              trailing_slash = false,
              label_trailing_slash = true,
              get_cwd = function(context) return vim.fn.expand(('#%d:p:h'):format(context.bufnr)) end,
              show_hidden_files_by_default = false,
            },
          },
          -- Enhanced snippet support
          snippets = {
            name = "snippets",
            module = "blink.cmp.sources.snippets",
            score_offset = 25,
            -- Only show snippets when specifically triggered
            min_keyword_length = 1,
            fallbacks = { "buffer" },
          },
          -- Buffer completion as fallback
          buffer = {
            name = "Buffer",
            module = "blink.cmp.sources.buffer",
            score_offset = 10,
            min_keyword_length = 3, -- Only suggest after 3 characters
            max_items = 20,
            fallbacks = {},
          },
          -- LazyDev for Neovim Lua development
          lazydev = {
            name = "lazydev",
            module = "lazydev.integrations.blink",
            score_offset = 100,
            enabled = function()
              return vim.bo.filetype == "lua"
            end,
          },
        },
      },

      -- Command line completion (moved from sources.cmdline)
      cmdline = {
        sources = function()
          local type = vim.fn.getcmdtype()
          if type == '/' or type == '?' then
            return { 'buffer' }
          end
          if type == ':' then
            return { 'cmdline' }
          end
          return {}
        end,
      },

      snippets = { preset = "luasnip" },

      -- Blink.cmp includes an optional, recommended rust fuzzy matcher,
      -- which automatically downloads a prebuilt binary when enabled.
      --
      -- By default, we use the Lua implementation instead, but you may enable
      -- the rust implementation via `'prefer_rust_with_warning'`
      --
      -- See :h blink-cmp-config-fuzzy for more information
      fuzzy = {
        implementation = "lua",
        -- Enhanced fuzzy matching for better Python completions
        use_typo_resistance = true,
        use_proximity = true,
        use_frecency = true,
      },

      -- Enhanced signature help for VSCode-like parameter hints
      signature = {
        enabled = true,
        window = {
          border = "rounded",
          winhighlight = "Normal:BlinkCmpSignatureHelp,FloatBorder:BlinkCmpSignatureHelpBorder",
          scrollbar = false,
          direction_priority = { 'n', 's' },
          max_width = 80,
          max_height = 20,
        },
      },
    },
  },
}