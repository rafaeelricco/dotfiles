-- [[ UI Domain ]]
-- This file configures plugins that define the visual appearance and user interface
-- of Neovim, including the colorscheme, statusline, file explorer, and more.

return {
  -- Useful plugin to show you pending keybinds.
  {
    "folke/which-key.nvim",
    event = "VimEnter", -- Sets the loading event to 'VimEnter'
    config = function() -- This is the function that runs, AFTER loading
      require("which-key").setup({
        icons = {
          mappings = vim.g.have_nerd_font,
          keys = vim.g.have_nerd_font and {} or {
            Up = "<Up> ",
            Down = "<Down> ",
            Left = "<Left> ",
            Right = "<Right> ",
            C = "<C-…> ",
            M = "<M-…> ",
            D = "<D-…> ",
            S = "<S-…> ",
            CR = "<CR> ",
            Esc = "<Esc> ",
            ScrollWheelDown = "<ScrollWheelDown> ",
            ScrollWheelUp = "<ScrollWheelUp> ",
            NL = "<NL> ",
            BS = "<BS> ",
            Space = "<Space> ",
            Tab = "<Tab> ",
            F1 = "<F1>",
            F2 = "<F2>",
            F3 = "<F3>",
            F4 = "<F4>",
            F5 = "<F5>",
            F6 = "<F6>",
            F7 = "<F7>",
            F8 = "<F8>",
            F9 = "<F9>",
            F10 = "<F10>",
            F11 = "<F11>",
            F12 = "<F12>",
          },
        },

        -- Document existing key chains
        spec = {
          { "<leader>c", group = "[C]ode", mode = { "n", "x" } },
          { "<leader>d", group = "[D]ocument" },
          { "<leader>r", group = "[R]ename" },
          { "<leader>s", group = "[S]earch" },
          { "<leader>w", group = "[W]orkspace" },
          { "<leader>t", group = "[T]oggle" },
          { "<leader>h", group = "Git [H]unk", mode = { "n", "v" } },
        },
      })
    end,
  },

  -- Fuzzy Finder (files, lsp, etc)
  {
    "nvim-telescope/telescope.nvim",
    event = "VimEnter",
    branch = "master",
    dependencies = {
      "nvim-lua/plenary.nvim",
      { -- If encountering errors, see telescope-fzf-native README for installation instructions
        "nvim-telescope/telescope-fzf-native.nvim",

        -- `build` is used to run some command when the plugin is installed/updated.
        -- This is only run then, not every time Neovim starts up.
        build = "make",

        -- `cond` is a condition used to determine whether this plugin should be
        -- installed and loaded.
        cond = function()
          return vim.fn.executable("make") == 1
        end,
      },
      { "nvim-telescope/telescope-ui-select.nvim" },

      -- Icons are now configured in the dedicated icons domain
      { "DaikyXendo/nvim-material-icon", enabled = vim.g.have_nerd_font },
    },
    config = function()
      require("telescope").setup({
        defaults = {
          mappings = {
            i = {
              -- Preview scrolling in insert mode (non-conflicting keys)
              ["<M-u>"] = require("telescope.actions").preview_scrolling_up,
              ["<M-d>"] = require("telescope.actions").preview_scrolling_down,
              ["<M-k>"] = require("telescope.actions").preview_scrolling_up,
              ["<M-j>"] = require("telescope.actions").preview_scrolling_down,
              -- Mouse wheel scrolling
              ["<ScrollWheelUp>"] = require("telescope.actions").preview_scrolling_up,
              ["<ScrollWheelDown>"] = require("telescope.actions").preview_scrolling_down,
            },
            n = {
              -- Preview scrolling in normal mode (default C-u/C-d should work)
              ["<C-u>"] = require("telescope.actions").preview_scrolling_up,
              ["<C-d>"] = require("telescope.actions").preview_scrolling_down,
              -- Additional preview scrolling
              ["<M-u>"] = require("telescope.actions").preview_scrolling_up,
              ["<M-d>"] = require("telescope.actions").preview_scrolling_down,
              ["<M-k>"] = require("telescope.actions").preview_scrolling_up,
              ["<M-j>"] = require("telescope.actions").preview_scrolling_down,
              -- Mouse wheel scrolling
              ["<ScrollWheelUp>"] = require("telescope.actions").preview_scrolling_up,
              ["<ScrollWheelDown>"] = require("telescope.actions").preview_scrolling_down,
            },
          },
        },
        extensions = {
          ["ui-select"] = {
            require("telescope.themes").get_dropdown(),
          },
        },
      })

      -- Enable Telescope extensions if they are installed
      pcall(require("telescope").load_extension, "fzf")
      pcall(require("telescope").load_extension, "ui-select")

      -- See `:help telescope.builtin`
      local builtin = require("telescope.builtin")
      vim.keymap.set("n", "<leader>sh", builtin.help_tags, { desc = "[S]earch [H]elp" })
      vim.keymap.set("n", "<leader>sk", builtin.keymaps, { desc = "[S]earch [K]eymaps" })
      vim.keymap.set("n", "<leader>sf", builtin.find_files, { desc = "[S]earch [F]iles" })
      vim.keymap.set("n", "<leader>ss", builtin.builtin, { desc = "[S]earch [S]elect Telescope" })
      vim.keymap.set("n", "<leader>sw", builtin.grep_string, { desc = "[S]earch current [W]ord" })
      vim.keymap.set("n", "<leader>sg", builtin.live_grep, { desc = "[S]earch by [G]rep" })
      vim.keymap.set("n", "<leader>sd", builtin.diagnostics, { desc = "[S]earch [D]iagnostics" })
      vim.keymap.set("n", "<leader>sr", builtin.resume, { desc = "[S]earch [R]esume" })
      vim.keymap.set("n", "<leader>s.", builtin.oldfiles, { desc = '[S]earch Recent Files ("." for repeat)' })
      vim.keymap.set("n", "<leader><leader>", builtin.buffers, { desc = "[ ] Find existing buffers" })

      -- Slightly advanced example of overriding default behavior and theme
      vim.keymap.set("n", "<leader>/", function()
        -- You can pass additional configuration to Telescope to change the theme, layout, etc.
        builtin.current_buffer_fuzzy_find(require("telescope.themes").get_dropdown({
          winblend = 10,
          previewer = false,
        }))
      end, { desc = "[/] Fuzzily search in current buffer" })

      -- It's also possible to pass additional configuration options.
      --  See `:help telescope.builtin.live_grep()` for information about particular keys
      vim.keymap.set("n", "<leader>s/", function()
        builtin.live_grep({
          grep_open_files = true,
          prompt_title = "Live Grep in Open Files",
        })
      end, { desc = "[S]earch [/] in Open Files" })

      -- Shortcut for searching your Neovim configuration files
      vim.keymap.set("n", "<leader>sn", function()
        builtin.find_files({ cwd = vim.fn.stdpath("config") })
      end, { desc = "[S]earch [N]eovim files" })

      -- Search for selected text in visual mode
      vim.keymap.set("v", "<leader>sw", function()
        local text = vim.fn.getregion(vim.fn.getpos("v"), vim.fn.getpos("."), { type = vim.fn.mode() })
        builtin.grep_string({ search = table.concat(text, "\n") })
      end, { desc = "[S]earch selected [W]ord" })
      
    end,
  },



  { -- Collection of various small independent plugins/modules
    "echasnovski/mini.nvim",
    config = function()
      -- Better Around/Inside textobjects
      --
      -- Examples:
      --  - va)  - [V]isually select [A]round [)]paren
      --  - yinq - [Y]ank [I]nside [N]ext [']quote
      --  - ci'  - [C]hange [I]nside [']quote
      -- require("mini.ai").setup({ n_lines = 500 })

      -- -- Add/delete/replace surroundings (brackets, quotes, etc.)
      -- --
      -- -- - saiw) - [S]urround [A]dd [I]nner [W]ord [)]Paren
      -- -- - sd'   - [S]urround [D]elete [']quotes
      -- -- - sr)'  - [S]urround [R]eplace [)] [']
      -- require("mini.surround").setup()

      -- Configures `mini.statusline`, a lightweight and customizable statusline.
      -- It displays information about the current buffer, Git status, and more.
      local statusline = require("mini.statusline")
      -- set use_icons to true if you have a Nerd Font
      statusline.setup({ use_icons = vim.g.have_nerd_font })

      -- You can configure sections in the statusline by overriding their
      -- default behavior. For example, here we set the section for
      -- cursor location to LINE:COLUMN
      ---@diagnostic disable-next-line: duplicate-set-field
      statusline.section_location = function()
        return "%2l:%-2v"
      end

      -- ... and there is more!
      --  Check out: https://github.com/echasnovski/mini.nvim
    end,
  },

  -- Configures `neo-tree.filesystem`, a modern file explorer that replaces `netrw`.
  -- It provides a better user experience for navigating the file system.
  {
    "nvim-neo-tree/neo-tree.nvim",
    branch = "v3.x",
    dependencies = {
      "nvim-lua/plenary.nvim",
      "DaikyXendo/nvim-material-icon",
      "MunifTanjim/nui.nvim",
    },
    keys = {
      { "<leader>e", "<cmd>Neotree toggle<cr>", desc = "Toggle file explorer" },
    },
    opts = {
      -- Closes Neo-tree if it's the last open window in Neovim
      close_if_last_window = false,
      -- Automatically refresh the tree when buffers are written/created
      enable_refresh_on_write = true,
      -- Tracks open buffers to keep up with new files
      buffers = {
        follow_current_file = {
          enabled = true,
          leave_dirs_open = false,
        },
        group_empty_dirs = true,
        show_unloaded = true,
      },
      -- Filesystem configuration
      filesystem = {
        -- Filtered items in the filesystem
        filtered_items = {
          -- Hide dotfiles (hidden files starting with a dot); false shows everything
          hide_dotfiles = false,
          -- Hide Git-ignored files; false shows everything
          hide_gitignored = false,
        },
        -- Automatically follows the current file in the explorer
        follow_current_file = {
          -- Enables tracking of the current file
          enabled = true,
        },
        -- Use system (libuv) watchers to detect new files directly from disk
        use_libuv_file_watcher = true,
      },
      -- Neo-tree window settings
      window = {
        -- Custom key mappings for the window
        mappings = {
          -- Navigate to the parent directory
          [","] = "navigate_up",
          -- Copy absolute path of the item under cursor to system clipboard
          ["Y"] = "copy_full_path",
        },
      },
      -- Custom commands available inside Neo-tree
      commands = {
        copy_full_path = function(state)
          local node = state.tree:get_node()
          local path = node:get_id()
          vim.fn.setreg("+", path)
          vim.notify("Copied: " .. path)
        end,
      },
    },
    config = function(_, opts)
      require("neo-tree").setup(opts)

      -- Refresh git status when Neovim gains focus (catches external commits)
      vim.api.nvim_create_autocmd("FocusGained", {
        group = vim.api.nvim_create_augroup("NeoTreeGitRefresh", { clear = true }),
        callback = function()
          if package.loaded["neo-tree.sources.manager"] then
            require("neo-tree.sources.manager").refresh("filesystem")
          end
        end,
      })
    end,
  },

  -- Smooth scrolling plugin for both horizontal and vertical movement
  --[[
  {
    "karb94/neoscroll.nvim",
    config = function()
      require('neoscroll').setup({
        -- All these keys will be mapped to their corresponding default scrolling animation
        mappings = {'<C-u>', '<C-d>', '<C-b>', '<C-f>',
                    '<C-y>', 'zt', 'zz', 'zb'},
        hide_cursor = false,          -- Hide cursor while scrolling
        stop_eof = true,             -- Stop at <EOF> when scrolling downwards
        respect_scrolloff = false,   -- Stop scrolling when the cursor reaches the scrolloff margin of the file
        cursor_scrolls_alone = true, -- The cursor will keep on scrolling even if the window cannot scroll further
        easing_function = "quadratic", -- Smoother easing function
        pre_hook = nil,              -- Function to run before the scrolling animation starts
        post_hook = nil,             -- Function to run after the scrolling animation ends
        performance_mode = false,    -- Disable "Performance Mode" on all buffers.
      })

      -- Add horizontal scrolling mappings
      -- Use Alt+h/l to avoid conflict with window navigation (<C-h>/<C-l>)
      local keymap = {
        ["<M-h>"] = function()
          if vim.v.count > 0 then
            return vim.v.count .. "zh"
          else
            return "zh"
          end
        end,
        ["<M-l>"] = function()
          if vim.v.count > 0 then
            return vim.v.count .. "zl"
          else
            return "zl"
          end
        end,
      }

      for key, func in pairs(keymap) do
        vim.keymap.set('n', key, function()
          local cmd = func()
          require('neoscroll').scroll(cmd, { move_cursor = false, duration = 110 })
        end, { desc = "Smooth horizontal scroll" })
      end
    end,
  },
  ]]

  -- Animated cursor trail (smear effect) on cursor movement
  --
  -- Alternative presets to try (swap into `opts` below). The first two come
  -- straight from the plugin author's docs.
  --
  -- 1. Snappy / responsive (recommended alternative): short, fast trail. Good
  --    for fast navigation/typing without distraction. Opposite of the current
  --    smooth/long trail.
  --      stiffness = 0.8,
  --      trailing_stiffness = 0.6,
  --      stiffness_insert_mode = 0.7,
  --      trailing_stiffness_insert_mode = 0.7,
  --      damping = 0.95,
  --      damping_insert_mode = 0.95,
  --      distance_stop_animating = 0.5,
  --      time_interval = 7,  -- ~144fps, smoother animation
  --
  -- 2. Smooth cursor without trail: keeps the rectangular cursor and only eases
  --    its movement (no smear). More subtle, like a gliding cursor.
  --      stiffness = 0.5,
  --      trailing_stiffness = 0.5,
  --      matrix_pixel_threshold = 0.5,
  --
  -- 3. Plugin default: author's balance, midway between the current config and
  --    the snappy preset.
  --      stiffness = 0.6,
  --      trailing_stiffness = 0.45,
  --      damping = 0.85,
  --
  -- Parameter guide:
  --   stiffness            cursor head: higher = reaches the target faster.
  --   trailing_stiffness   tail: lower = longer/more visible trail; higher = shorter.
  --   damping              higher = less overshoot/oscillation.
  --   time_interval        ms between frames; lower = smoother, costs a bit of CPU
  --                        (7 ~ 144fps, 17 ~ 60fps).
  --   distance_stop_animating  cells before the animation stops; higher = cuts
  --                            earlier, drier feel.
  -- smear-cursor disabled: its per-frame floating-window redraws (~120fps) made
  -- Neogit/diffview commit views laggy. Re-enable by uncommenting this block.
  --[[
  {
    "sphamba/smear-cursor.nvim",
    event = "VeryLazy", -- load shortly after startup so the smear is active without a trigger
    opts = {
      -- Snappy / responsive: short, fast trail. Good for fast navigation/typing
      -- without distraction.
      stiffness = 0.8,
      trailing_stiffness = 0.6,
      damping = 0.95,
      distance_stop_animating = 0.5,
      time_interval = 8, -- ~120fps (8ms; nearest integer ms to 1000/120 ≈ 8.33)

      -- Insert mode: keep the smear, slightly snappier so typing stays legible
      smear_insert_mode = false,
      stiffness_insert_mode = 0.7,
      trailing_stiffness_insert_mode = 0.7,
      damping_insert_mode = 0.95,

      -- Cover the common cases
      smear_between_buffers = true,
      smear_between_neighbor_lines = true,
      scroll_buffer_space = true,

      -- No particle effect
      particles_enabled = false,
    },
    keys = {
      { "<leader>ts", "<cmd>SmearCursorToggle<cr>", desc = "[T]oggle [S]mear cursor" },
    },
  },
  --]]
}
