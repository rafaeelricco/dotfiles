-- [[ Completion Domain ]]
-- Blink.cmp setup tailored for:
-- - Manual Ctrl+Space to show LSP + Path items (great for imports and paths)
-- - Non‑conflicting with Copilot: Tab reserved for snippets; <C-y> accepts Copilot
-- - Clear menu/docs/selection behavior with predictable triggers

return {
  -- blink.cmp completion engine and sources (LSP/snippets/path/buffer)
  {
    "saghen/blink.cmp",
    event = "VimEnter",
    version = "1.*",
    dependencies = {},
    -- Main configuration
    opts = {
      keymap = {
        
        -- Preset: base binding scheme
        --   'enter'    -> Enter accepts (recommended)
        --   'default'  -> C-y accepts
        --   'super-tab'-> Tab accepts
        --   'none'     -> no preset maps
        preset = "enter",

        -- Custom keymaps (kept off Augment's Tab / <C-y>):
        -- Ctrl+Space: show LSP + Path items (clean imports + file paths)
        ['<C-space>'] = {
          function(cmp) cmp.show({ providers = { 'lsp', 'path' } }) end,
          'show_documentation', 'hide_documentation'
        },
        -- Ctrl+Leader: show LSP + Path items (clean imports + file paths)
        ['<C-;>'] = {
          function(cmp) cmp.show({ providers = { 'lsp', 'path' } }) end,
          'show_documentation', 'hide_documentation'
        },
        -- Terminals that send <C-@> for Ctrl+Space
        ['<C-@>'] = {
          function(cmp) cmp.show({ providers = { 'lsp', 'path' } }) end,
          'show_documentation', 'hide_documentation'
        },

        -- Navigation in the menu
        ['<Up>'] = { 'select_prev', 'fallback' },
        ['<Down>'] = { 'select_next', 'fallback' },
        ['<C-p>'] = { 'select_prev', 'fallback' },
        ['<C-n>'] = { 'select_next', 'fallback' },

        -- Scroll documentation
        ['<C-b>'] = { 'scroll_documentation_up', 'fallback' },
        ['<C-f>'] = { 'scroll_documentation_down', 'fallback' },

        -- Snippet navigation
        ['<Tab>'] = { 'snippet_forward', 'fallback' },
        ['<S-Tab>'] = { 'snippet_backward', 'fallback' },

        -- Accept current item
        ['<CR>'] = { 'accept', 'fallback' },
      },

      appearance = {
        use_nvim_cmp_as_default = true,
        nerd_font_variant = "mono",
      },

      completion = {
        -- Keyword matching strategy used by the fuzzy matcher
        keyword = {
          -- 'prefix' -> match only text before cursor; 'full' -> match before & after
          range = 'prefix',
        },
        -- Auto-show behavior when typing or after trigger characters (manual show unaffected)
        trigger = {
          show_on_keyword = true,
          show_on_trigger_character = true,
          show_on_blocked_trigger_characters = { ' ', '\n', '\t' },
          show_on_insert_on_trigger_character = false,
        },
        -- Documentation window behavior and styling
        documentation = {
          auto_show = false,
          auto_show_delay_ms = 200,
          window = {
            border = "none",
            winhighlight = "Normal:BlinkCmpDoc,FloatBorder:BlinkCmpDocBorder,EndOfBuffer:BlinkCmpDoc",
            min_width = 15,
            max_width = 60,
            max_height = 20,
          }
        },
        menu = {
          draw = {
            padding = 0,
            gap=1,
            columns = {{ "kind_icon" }, { "label", "label_description" }},

            components = {
              -- Show import detail/paths when LSP provides them
              label_description = {
                width = { max = 40 },
                text = function(ctx)
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
            },
          },
          border = "none",
          winhighlight = "Normal:BlinkCmpMenu,FloatBorder:BlinkCmpMenuBorder,CursorLine:BlinkCmpMenuSelection,Search:None",
          scrollbar = false,
          direction_priority = { 's', 'n' },
        },
        -- Accept behavior (auto-insert brackets for functions/methods)
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
        -- Inline preview of the selected item
        ghost_text = { enabled = true },
      },

      sources = {
        -- Providers used globally unless overridden
        default = { "lsp", "path", "snippets", "buffer" },
        -- Global min keyword chars for auto triggers (manual show may override)
        min_keyword_length = 3,
        providers = {
          -- LSP provider (primary)
          lsp = {
            name = "LSP",
            module = "blink.cmp.sources.lsp",
            -- Sort boost to favor LSP items
            score_offset = 100,
            -- No fallback to buffer; keep lists clean on manual show
            fallbacks = {},
            -- Wait for LSP response; avoids flashing non-LSP items first
            async = false,
            timeout_ms = 500,
            -- On manual show (Ctrl+Space) allow 0-char prefix; otherwise require 3
            min_keyword_length = function(ctx)
              local trig = ctx and ctx.trigger or {}
              if trig.kind == 'manual' or trig.initial_kind == 'manual' then
                return 0
              end
              return 3
            end,
            -- Disable on special buffers where completion isn't appropriate
            enabled = function() return vim.bo.buftype ~= "prompt" and vim.bo.buftype ~= "nofile" end,
          },
          -- File path provider
          path = {
            name = "Path",
            module = "blink.cmp.sources.path",
            score_offset = 50,
            fallbacks = { "buffer" },
            -- Allow path suggestions on manual show with 0-char prefix
            min_keyword_length = function(ctx)
              local trig = ctx and ctx.trigger or {}
              if trig.kind == 'manual' or trig.initial_kind == 'manual' then
                return 0
              end
              return 3
            end,
            opts = {
              trailing_slash = false,
              label_trailing_slash = true,
              get_cwd = function(context) return vim.fn.expand(('#%d:p:h'):format(context.bufnr)) end,
              show_hidden_files_by_default = false,
            },
          },
          -- Snippet provider
          snippets = {
            name = "snippets",
            module = "blink.cmp.sources.snippets",
            score_offset = 25,
            -- Hide snippets on manual show to keep lists LSP-only
            should_show_items = function(ctx)
              local trig = ctx and ctx.trigger or {}
              return not (trig.kind == 'manual' or trig.initial_kind == 'manual')
            end,
            -- Require 3 characters for auto snippet suggestions
            min_keyword_length = 3,
            fallbacks = { "buffer" },
          },
          -- Buffer words provider (low priority)
          buffer = {
            name = "Buffer",
            module = "blink.cmp.sources.buffer",
            score_offset = 10,
            -- Keep buffer items off manual show to avoid UUID-like noise
            should_show_items = function(ctx)
              local trig = ctx and ctx.trigger or {}
              return not (trig.kind == 'manual' or trig.initial_kind == 'manual')
            end,
            -- Require 3 characters for auto buffer suggestions
            min_keyword_length = 3,
            max_items = 20,
            fallbacks = {},
          },

        },
      },

      -- Cmdline mode configuration (/, ?, :)
      cmdline = {
        -- Inherit top-level mappings; add Ctrl+Space show
        keymap = {
          preset = 'inherit',
          ['<C-space>'] = { 'show', 'fallback' },
          ['<C-@>'] = { 'show', 'fallback' },
          ['<C-;>'] = { 'show', 'fallback' },
        },
        -- Avoid auto-show in cmdline; prefer explicit show
        completion = { menu = { auto_show = false } },
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

      -- Snippet engine preset: 'default' (built-in) / 'luasnip' / 'mini_snippets'
      snippets = { preset = "default" },

      -- Fuzzy matching implementation; see :h blink-cmp-config-fuzzy
      fuzzy = {
        implementation = "lua",
      },

      -- Signature help window (parameter hints)
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
