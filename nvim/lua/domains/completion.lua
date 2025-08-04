-- [[ Completion Domain ]]
-- This file configures autocompletion, snippets, and related UI elements to create
-- a modern, VSCode-like completion experience.

return {
  -- Configures `blink.cmp`, a powerful and extensible completion engine.
  -- It integrates with various sources like LSP, snippets, and buffer text.
  {
    "saghen/blink.cmp",
    event = "VimEnter",
    version = "1.*",
    dependencies = {
      -- Configures `LuaSnip`, the snippet engine responsible for expanding text snippets.
      -- It includes a build step for regex support and can be extended with snippet libraries.
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
    -- Defines the main configuration for `blink.cmp`.
    opts = {
      keymap = {
        -- Sets up keymaps for a VSCode-like completion experience, including
        -- navigation, acceptance, and documentation scrolling.
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
        -- Configures the appearance to use a monospaced Nerd Font, ensuring icons are aligned correctly.
        nerd_font_variant = "mono",
      },

      completion = {
        -- Configures the completion documentation to appear automatically, mimicking VSCode's behavior.
        -- The window style is customized for a clean, modern look.
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
          -- Defines the appearance and behavior of the completion menu to resemble VSCode.
          -- This includes custom drawing for columns and a rounded border.
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
        },
        -- Configures completion acceptance behavior, such as automatically adding brackets.
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
        -- Enables inline ghost text for completion suggestions, providing a preview of the completed code.
        ghost_text = {
          enabled = true,
        },
      },

      sources = {
        -- Defines the sources for completion suggestions, including LSP, paths, snippets, and buffer text.
        -- Each source is configured with a priority and specific options.
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

      -- Configures completion sources for the command line, providing suggestions for commands and searches.
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

      -- Configures the fuzzy matching algorithm used for filtering completion items.
      -- This setup uses the Lua implementation for better performance.
      -- You can also use "fzf" implementation which automatically downloads a prebuilt binary.
      --
      -- See :h blink-cmp-config-fuzzy for more information
      fuzzy = {
        implementation = "lua",
      },

      -- Enables and configures the signature help window, which displays function parameter information.
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