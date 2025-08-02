-- [[ Bootstrap Configuration ]]
-- This file is the main entry point for the Neovim configuration.
-- It is responsible for loading all the core modules in the correct order.

-- Core modules responsible for fundamental editor behavior and appearance.
require("core.environments") -- Sets up global variables and environment-specific settings.
require("core.editor") -- Configures core editor options and keymaps.
require("core.profiles") -- Defines and applies the colorscheme and syntax highlighting.

-- Side-effect modules that enhance the user experience.
require("effects.vim-configurator") -- Applies a wide range of Vim settings for a modern experience.
require("effects.plugin-loader") -- Initializes the plugin manager and loads all plugins.

-- The line beneath this is called `modeline`. See `:help modeline`
-- vim: ts=2 sts=2 sw=2 et