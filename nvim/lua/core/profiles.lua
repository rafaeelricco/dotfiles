-- [[ Custom Dark Colorscheme ]]
-- This file defines a custom dark colorscheme inspired by modern code editors.
-- It includes a detailed color palette and a comprehensive set of highlight groups
-- for core Neovim UI, syntax, plugins, and diagnostics.
-- Resets all existing highlight groups to their default values to ensure a clean slate.
vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") then
  vim.cmd("syntax reset")
end

-- Enables 24-bit RGB color support for a richer color experience in compatible terminals.
vim.opt.termguicolors = true

-- Defines the color palette used throughout the colorscheme.
-- Each color is mapped to a specific UI element or syntax token.
local colors = {
  -- Main UI colors from your VS Code theme
  bg = "#181818",   -- editor.background
  fg = "#cccccc",   -- editor.foreground / foreground

  -- Line numbers (your specific customization)
  line_nr = "#2e3038",          -- editorLineNumber.foreground
  line_nr_active = "#f8f8f2",   -- editorLineNumber.activeForeground (without alpha)

  -- UI Elements
  status_bg = "#181818",      -- statusBar.background
  panel_bg = "#181818",       -- panel.background
  menu_bg = "#181818",        -- menu.background / dropdown.listBackground
  widget_bg = "#181818",      -- editorWidget.background
  input_bg = "#313131",       -- input.background
  button_bg = "#0078d4",      -- button.background
  border = "#2b2b2b",         -- various borders
  focus_border = "#0078d4",   -- focusBorder

  -- Selection and highlights
  selection = "#264f78",             -- editor.selectionBackground
  visual = "#3a3d41",                -- editor.inactiveSelectionBackground
  search = "#9e6a03",                -- editor.findMatchBackground
  search_highlight = "#ea5c00",      -- editor.findMatchHighlightBackground (solid color)
  cursor_line = "#222222",           -- Custom cursor line (slightly lighter than bg)
  selection_highlight = "#add6ff",   -- editor.selectionHighlightBackground (solid color)

  -- Syntax highlighting colors from tokenColors
  comment = "#6A9955",         -- comment
  keyword = "#C586C0",         -- keyword.control (import/export/from etc)
  storage = "#569CD6",         -- storage keywords (const, let, var, function)
  string = "#CE9178",          -- string
  number = "#B5CEA8",          -- constant.numeric
  boolean = "#569CD6",         -- constant.language
  function_name = "#DCDCAA",   -- entity.name.function
  type = "#4EC9B0",            -- support.class, entity.name.type
  variable = "#9CDCFE",        -- variable, entity.name.variable
  constant = "#4FC1FF",        -- variable.other.constant
  operator = "#D4D4D4",        -- keyword.operator
  punctuation = "#D4D4D4",     -- general punctuation
  property = "#9CDCFE",        -- support.type.property-name

  -- Special syntax colors
  regex = "#D16969",       -- string.regexp
  escape = "#D7BA7D",      -- constant.character.escape
  preproc = "#569CD6",     -- meta.preprocessor
  tag = "#569CD6",         -- entity.name.tag
  attribute = "#9CDCFE",   -- entity.other.attribute-name

  -- Diagnostics and messages
  error = "#F44747",     -- invalid, token.error-token
  warning = "#CD9731",   -- token.warn-token
  info = "#6796E6",      -- token.info-token
  hint = "#B267E6",      -- token.debug-token

  -- Git colors
  git_add = "#2ea043",      -- editorGutter.addedBackground
  git_change = "#0078d4",   -- editorGutter.modifiedBackground
  git_delete = "#f85149",   -- editorGutter.deletedBackground

  -- Diff colors
  diff_add = "#2d4a2b",      -- diffEditor.insertedLineBackground (darker green for better readability)
  diff_delete = "#4a2d2d",   -- diffEditor.removedLineBackground (darker red for better readability)
  diff_change = "#569CD6",   -- markup.changed

  -- Activity and status
  activity_fg = "#d7d7d7",      -- activityBar.foreground
  inactive_fg = "#868686",      -- activityBar.inactiveForeground
  description_fg = "#9d9d9d",   -- descriptionForeground

  -- Tabs
  tab_active_fg = "#ffffff",           -- tab.activeForeground
  tab_inactive_fg = "#9d9d9d",         -- tab.inactiveForeground
  tab_border = "#2b2b2b",              -- tab.border
  tab_active_border_top = "#0078d4",   -- tab.activeBorderTop

  -- Additional colors from JSON
  activity_border = "#0078d4",         -- activityBar.activeBorder
  panel_border = "#2b2b2b",            -- panel.border
  sidebar_bg = "#181818",              -- sideBar.background
  sidebar_fg = "#cccccc",              -- sideBar.foreground
  badge_bg = "#616161",                -- badge.background
  badge_fg = "#f8f8f8",                -- badge.foreground
  menu_selection = "#0078d4",          -- menu.selectionBackground
  dropdown_bg = "#313131",             -- dropdown.background
  dropdown_fg = "#cccccc",             -- dropdown.foreground
  editor_group_border = "#ffffff17",   -- editorGroup.border

  -- Floating elements
  notification_bg = "#1f1f1f",       -- notifications.background
  notification_fg = "#cccccc",       -- notifications.foreground
  notification_border = "#2b2b2b",   -- notifications.border

  -- Indentation guides
  indent_guide = "#404040",          -- editorIndentGuide.background1
  indent_guide_active = "#707070",   -- editorIndentGuide.activeBackground1

  -- Terminal colors
  terminal_fg = "#cccccc",   -- terminal.foreground
}

-- Defines the highlight groups that map the color palette to specific Neovim UI elements and syntax tokens.
-- See `:help highlight-groups` for a comprehensive list of standard groups.
local highlights = {
  -- === EDITOR CORE ===
  Normal = { fg = colors.fg, bg = colors.bg },
  NormalFloat = { fg = colors.fg, bg = colors.menu_bg },
  NormalNC = { fg = colors.fg, bg = colors.bg },

  -- === LINE NUMBERS ===
  LineNr = { fg = colors.line_nr, bg = colors.bg },
  CursorLineNr = { fg = colors.line_nr_active, bg = colors.bg, bold = true },

  -- === CURSOR AND LINES ===
  Cursor = { fg = colors.bg, bg = colors.fg },
  CursorLine = { bg = colors.cursor_line },
  CursorColumn = { bg = colors.cursor_line },
  ColorColumn = { bg = colors.cursor_line },

  -- === VISUAL SELECTION ===
  Visual = { bg = colors.selection },
  VisualNOS = { bg = colors.visual },

  -- === SEARCH ===
  Search = { bg = colors.search, fg = colors.bg },
  IncSearch = { bg = colors.search, fg = colors.bg },
  CurSearch = { bg = colors.search, fg = colors.bg },

  -- === SPLITS AND WINDOWS ===
  VertSplit = { fg = colors.border },
  WinSeparator = { fg = colors.border },

  -- === STATUSLINE ===
  StatusLine = { fg = colors.fg, bg = colors.status_bg },
  StatusLineNC = { fg = colors.inactive_fg, bg = colors.status_bg },

  -- === TABS ===
  TabLine = { fg = colors.tab_inactive_fg, bg = colors.bg },
  TabLineFill = { bg = colors.bg },
  TabLineSel = { fg = colors.tab_active_fg, bg = colors.bg, bold = true },

  -- === POPUP MENUS ===
  Pmenu = { fg = colors.fg, bg = colors.menu_bg },
  PmenuSel = { fg = colors.fg, bg = colors.button_bg },
  PmenuSbar = { bg = colors.border },
  PmenuThumb = { bg = colors.fg },
  PmenuKind = { fg = colors.type },
  PmenuKindSel = { fg = colors.fg, bg = colors.button_bg },
  PmenuExtra = { fg = colors.description_fg },
  PmenuExtraSel = { fg = colors.fg, bg = colors.button_bg },

  -- === FOLDING ===
  Folded = { fg = colors.description_fg, bg = colors.cursor_line },
  FoldColumn = { fg = colors.description_fg, bg = colors.bg },

  -- === GUTTER ===
  SignColumn = { bg = colors.bg },

  -- === MATCHING ===
  MatchParen = { fg = colors.search, bold = true, underline = true },

  -- === MESSAGES ===
  ErrorMsg = { fg = colors.error },
  WarningMsg = { fg = colors.warning },
  ModeMsg = { fg = colors.info },
  MoreMsg = { fg = colors.info },
  Question = { fg = colors.info },

  -- === SYNTAX HIGHLIGHTING ===
  Comment = { fg = colors.comment, italic = true },

  -- Constants
  Constant = { fg = colors.constant },
  String = { fg = colors.string },
  Character = { fg = colors.string },
  Number = { fg = colors.number },
  Boolean = { fg = colors.boolean },
  Float = { fg = colors.number },

  -- Identifiers
  Identifier = { fg = colors.variable },
  Function = { fg = colors.function_name },

  -- Statements
  Statement = { fg = colors.keyword },
  Conditional = { fg = colors.keyword },
  Repeat = { fg = colors.keyword },
  Label = { fg = colors.keyword },
  Operator = { fg = colors.operator },
  Keyword = { fg = colors.keyword },
  Exception = { fg = colors.keyword },

  -- Types
  Type = { fg = colors.type },
  StorageClass = { fg = colors.storage },
  Structure = { fg = colors.type },
  Typedef = { fg = colors.type },

  -- Special
  Special = { fg = colors.escape },
  SpecialChar = { fg = colors.escape },
  Tag = { fg = colors.tag },
  Delimiter = { fg = colors.punctuation },
  SpecialComment = { fg = colors.comment, bold = true },
  Debug = { fg = colors.hint },

  -- Preprocessor
  PreProc = { fg = colors.preproc },
  Include = { fg = colors.keyword },
  Define = { fg = colors.preproc },
  Macro = { fg = colors.preproc },
  PreCondit = { fg = colors.preproc },

  -- Underlined and Error
  Underlined = { underline = true },
  Ignore = { fg = colors.bg },
  Error = { fg = colors.error },
  Todo = { fg = colors.warning, bold = true },

  -- === TREE-SITTER HIGHLIGHTS ===
  ["@comment"] = { fg = colors.comment, italic = true },
  ["@comment.documentation"] = { fg = colors.comment, italic = true },

  -- Constants
  ["@constant"] = { fg = colors.constant },
  ["@constant.builtin"] = { fg = colors.boolean },
  ["@constant.macro"] = { fg = colors.constant },
  ["@string"] = { fg = colors.string },
  ["@string.documentation"] = { fg = colors.string },
  ["@string.regex"] = { fg = colors.regex },
  ["@string.escape"] = { fg = colors.escape },
  ["@string.special"] = { fg = colors.escape },
  ["@character"] = { fg = colors.string },
  ["@character.special"] = { fg = colors.escape },
  ["@number"] = { fg = colors.number },
  ["@boolean"] = { fg = colors.boolean },
  ["@float"] = { fg = colors.number },

  -- Functions
  ["@function"] = { fg = colors.function_name },
  ["@function.builtin"] = { fg = colors.function_name },
  ["@function.call"] = { fg = colors.function_name },
  ["@function.macro"] = { fg = colors.function_name },
  ["@method"] = { fg = colors.function_name },
  ["@method.call"] = { fg = colors.function_name },
  ["@constructor"] = { fg = colors.type },
  ["@parameter"] = { fg = colors.variable },

  -- Keywords
  ["@keyword"] = { fg = colors.keyword },
  ["@keyword.function"] = { fg = colors.storage },
  ["@keyword.operator"] = { fg = colors.keyword },
  ["@keyword.return"] = { fg = colors.keyword },
  ["@keyword.conditional"] = { fg = colors.keyword },
  ["@keyword.repeat"] = { fg = colors.keyword },
  ["@keyword.exception"] = { fg = colors.keyword },
  ["@keyword.import"] = { fg = colors.keyword },
  ["@keyword.export"] = { fg = colors.keyword },

  -- Operators
  ["@operator"] = { fg = colors.operator },

  -- Variables
  ["@variable"] = { fg = colors.variable },
  ["@variable.builtin"] = { fg = colors.storage },
  ["@variable.parameter"] = { fg = colors.variable },
  ["@variable.member"] = { fg = colors.property },

  -- Types
  ["@type"] = { fg = colors.type },
  ["@type.builtin"] = { fg = colors.type },
  ["@type.definition"] = { fg = colors.type },
  ["@type.qualifier"] = { fg = colors.storage },

  -- Properties
  ["@property"] = { fg = colors.property },
  ["@field"] = { fg = colors.property },

  -- Punctuation
  ["@punctuation.delimiter"] = { fg = colors.punctuation },
  ["@punctuation.bracket"] = { fg = colors.punctuation },
  ["@punctuation.special"] = { fg = colors.escape },

  -- Tags (HTML/XML)
  ["@tag"] = { fg = colors.tag },
  ["@tag.attribute"] = { fg = colors.attribute },
  ["@tag.delimiter"] = { fg = colors.punctuation },

  -- Namespaces
  ["@namespace"] = { fg = colors.type },
  ["@module"] = { fg = colors.storage },

  -- === LANGUAGE-SPECIFIC HIGHLIGHTS ===
  -- TypeScript/TSX specific highlights
  ["@variable.tsx"] = { fg = "#9CDCFE" },
  ["@type.tsx"] = { fg = "#9CDCFE" },
  ["@constant.tsx"] = { fg = "#9CDCFE" },
  ["@keyword.tsx"] = { fg = "#569CD6" },

  ["@operator.tsx"] = { fg = "#569CD6" },
  ["@character.special.tsx"] = { fg = "#569CD6" },

  ["@_jsx_element.tsx"] = { fg = "#179FFF" },
  ["@_jsx_attribute.tsx"] = { fg = "#179FFF" },
  -- Remove the general bracket highlight to let specific ones take precedence
  ["@tag.builtin.tsx"] = { fg = "#4EC9B0" },
  ["@tag.tsx"] = { fg = "#4EC9B0" },
  ["@variable.member.tsx"] = { fg = "#9CDCFE" },

  -- LSP Semantic Tokens for TypeScript/TSX
  ["@lsp.type.variable.typescriptreact"] = { fg = "#4FC1FF" },
  ["@lsp.type.property.typescriptreact"] = { fg = "#9CDCFE" },
  ["@lsp.mod.declaration.typescriptreact"] = { fg = "#9CDCFE" },
  ["@lsp.mod.local.typescriptreact"] = { fg = "#4FC1FF" },
  ["@lsp.mod.readonly.typescriptreact"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.variable.declaration.typescriptreact"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.variable.local.typescriptreact"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.variable.readonly.typescriptreact"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.property.declaration.typescriptreact"] = { fg = "#9CDCFE" },

  -- Function semantic tokens for TypeScript/TSX
  ["@lsp.type.function.typescriptreact"] = { fg = "#DCDCAA" },
  ["@lsp.typemod.function.declaration.typescriptreact"] = { fg = "#DCDCAA" },
  ["@lsp.typemod.function.local.typescriptreact"] = { fg = "#DCDCAA" },
  ["@lsp.typemod.function.readonly.typescriptreact"] = { fg = "#DCDCAA" },

  -- Also add for TypeScript files (not just TSX)
  ["@variable.typescript"] = { fg = "#9CDCFE" },
  ["@type.typescript"] = { fg = "#9CDCFE" },
  ["@constant.typescript"] = { fg = "#9CDCFE" },
  ["@keyword.typescript"] = { fg = "#569CD6" },
  ["@operator.typescript"] = { fg = "#569CD6" },
  ["@character.special.typescript"] = { fg = "#569CD6" },

  -- LSP Semantic Tokens for TypeScript
  ["@lsp.type.variable.typescript"] = { fg = "#4FC1FF" },
  ["@lsp.mod.declaration.typescript"] = { fg = "#4FC1FF" },
  ["@lsp.mod.local.typescript"] = { fg = "#4FC1FF" },
  ["@lsp.mod.readonly.typescript"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.variable.declaration.typescript"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.variable.local.typescript"] = { fg = "#4FC1FF" },
  ["@lsp.typemod.variable.readonly.typescript"] = { fg = "#4FC1FF" },

  -- Function semantic tokens for TypeScript
  ["@lsp.type.function.typescript"] = { fg = "#DCDCAA" },
  ["@lsp.typemod.function.declaration.typescript"] = { fg = "#DCDCAA" },
  ["@lsp.typemod.function.local.typescript"] = { fg = "#DCDCAA" },
  ["@lsp.typemod.function.readonly.typescript"] = { fg = "#DCDCAA" },

  -- === DIAGNOSTICS ===
  DiagnosticError = { fg = colors.error },
  DiagnosticWarn = { fg = colors.warning },
  DiagnosticInfo = { fg = colors.info },
  DiagnosticHint = { fg = colors.hint },
  DiagnosticOk = { fg = colors.git_add },
  DiagnosticUnnecessary = { fg = colors.inactive_fg },
  DiagnosticDeprecated = { fg = colors.inactive_fg, strikethrough = true },

  DiagnosticVirtualTextError = { fg = colors.error, bg = colors.bg },
  DiagnosticVirtualTextWarn = { fg = colors.warning, bg = colors.bg },
  DiagnosticVirtualTextInfo = { fg = colors.info, bg = colors.bg },
  DiagnosticVirtualTextHint = { fg = colors.hint, bg = colors.bg },
  DiagnosticVirtualTextUnnecessary = { fg = colors.inactive_fg, bg = colors.bg },

  DiagnosticUnderlineError = { undercurl = true, sp = colors.error },
  DiagnosticUnderlineWarn = { undercurl = true, sp = colors.warning },
  DiagnosticUnderlineInfo = { undercurl = true, sp = colors.info },
  DiagnosticUnderlineHint = { undercurl = true, sp = colors.hint },
  DiagnosticUnderlineUnnecessary = { undercurl = true, sp = colors.inactive_fg },

  -- === GIT SIGNS ===
  GitSignsAdd = { fg = colors.git_add },
  GitSignsChange = { fg = colors.git_change },
  GitSignsDelete = { fg = colors.git_delete },
  GitSignsAddNr = { fg = colors.git_add },
  GitSignsChangeNr = { fg = colors.git_change },
  GitSignsDeleteNr = { fg = colors.git_delete },
  GitSignsAddLn = { bg = colors.diff_add },
  GitSignsChangeLn = { bg = colors.cursor_line },
  GitSignsDeleteLn = { bg = colors.diff_delete },

  -- === DIFF ===
  DiffAdd = { bg = colors.diff_add },
  DiffChange = { bg = colors.cursor_line },
  DiffDelete = { bg = colors.diff_delete },
  DiffText = { bg = colors.selection },

  -- === SPELL CHECKING ===
  SpellBad = { fg = colors.error, undercurl = true, sp = colors.error },
  SpellCap = { fg = colors.warning, undercurl = true, sp = colors.warning },
  SpellLocal = { fg = colors.info, undercurl = true, sp = colors.info },
  SpellRare = { fg = colors.hint, undercurl = true, sp = colors.hint },

  -- === TERMINAL ===
  TermCursor = { fg = colors.bg, bg = colors.fg },
  TermCursorNC = { fg = colors.bg, bg = colors.description_fg },

  -- === NEOVIM SPECIFIC ===
  -- FloatBorder for floating windows
  FloatBorder = { fg = colors.border, bg = colors.menu_bg },
  FloatTitle = { fg = colors.fg, bg = colors.menu_bg, bold = true },

  -- WhichKey
  WhichKey = { fg = colors.keyword },
  WhichKeyGroup = { fg = colors.type },
  WhichKeyDesc = { fg = colors.fg },
  WhichKeySeperator = { fg = colors.comment },
  WhichKeyFloat = { bg = colors.menu_bg },
  WhichKeyBorder = { fg = colors.border },

  -- Telescope (if using)
  TelescopeNormal = { fg = colors.fg, bg = colors.menu_bg },
  TelescopeBorder = { fg = colors.border, bg = colors.menu_bg },
  TelescopePromptBorder = { fg = colors.focus_border, bg = colors.menu_bg },
  TelescopeResultsBorder = { fg = colors.border, bg = colors.menu_bg },
  TelescopePreviewBorder = { fg = colors.border, bg = colors.menu_bg },
  TelescopeSelection = { fg = colors.fg, bg = colors.selection },
  TelescopePromptPrefix = { fg = colors.focus_border },
  TelescopeMatching = { fg = colors.search, bold = true },
  
  -- Additional Telescope highlights for better text visibility
  TelescopeTitle = { fg = colors.fg, bg = colors.menu_bg, bold = true },
  TelescopePromptTitle = { fg = colors.focus_border, bg = colors.menu_bg, bold = false },
  TelescopeResultsTitle = { fg = colors.fg, bg = colors.menu_bg, bold = true },
  TelescopePreviewTitle = { fg = colors.fg, bg = colors.menu_bg, bold = true },
  TelescopePromptNormal = { fg = colors.fg, bg = colors.menu_bg },
  TelescopeResultsNormal = { fg = colors.fg, bg = colors.menu_bg },
  TelescopePreviewNormal = { fg = colors.fg, bg = colors.menu_bg },
  TelescopePromptCounter = { fg = colors.description_fg },
  TelescopeMultiSelection = { fg = colors.warning, bold = true },

  -- NvimTree (if using)
  NvimTreeNormal = { fg = colors.fg, bg = colors.bg },
  NvimTreeRootFolder = { fg = colors.focus_border, bold = true },
  NvimTreeGitDirty = { fg = colors.git_change },
  NvimTreeGitNew = { fg = colors.git_add },
  NvimTreeGitDeleted = { fg = colors.git_delete },
  NvimTreeSpecialFile = { fg = colors.warning },
  NvimTreeIndentMarker = { fg = colors.border },
  NvimTreeImageFile = { fg = colors.string },
  NvimTreeSymlink = { fg = colors.info },
  NvimTreeFolderIcon = { fg = colors.focus_border },

  -- Neo-tree
  NeoTreeNormal = { fg = colors.sidebar_fg, bg = colors.sidebar_bg },
  NeoTreeNormalNC = { fg = colors.sidebar_fg, bg = colors.sidebar_bg },
  NeoTreeRootName = { fg = colors.focus_border, bold = true },
  NeoTreeGitAdded = { fg = colors.git_add },
  NeoTreeGitConflict = { fg = colors.error },
  NeoTreeGitDeleted = { fg = colors.git_delete },
  NeoTreeGitModified = { fg = colors.git_change },
  NeoTreeGitUntracked = { fg = "#73c991" },
  NeoTreeIndentMarker = { fg = colors.indent_guide },
  NeoTreeExpander = { fg = colors.indent_guide },
  NeoTreeFloatBorder = { fg = colors.border },
  NeoTreeFloatTitle = { fg = colors.fg, bold = true },

  -- Indentation guides
  IndentBlanklineChar = { fg = colors.indent_guide },
  IndentBlanklineContextChar = { fg = colors.indent_guide_active },

  -- === TROUBLE.NVIM ===
  -- Main Trouble window
  TroubleNormal = { fg = colors.fg, bg = colors.bg },
  TroubleNormalNC = { fg = colors.fg, bg = colors.bg },

  -- Trouble item highlights
  TroubleText = { fg = colors.fg },
  TroubleSource = { fg = colors.comment },
  TroubleCode = { fg = colors.number },
  TroubleDirectory = { fg = colors.type },
  TroubleFilename = { fg = colors.variable, bold = true },
  TroubleLocation = { fg = colors.description_fg },
  TroublePos = { fg = colors.number },
  TroubleCount = { fg = colors.warning, bg = colors.cursor_line, bold = true },

  -- Icons and signs
  TroubleIconArray = { fg = colors.type },
  TroubleIconBoolean = { fg = colors.boolean },
  TroubleIconClass = { fg = colors.type },
  TroubleIconConstant = { fg = colors.constant },
  TroubleIconConstructor = { fg = colors.function_name },
  TroubleIconEnum = { fg = colors.type },
  TroubleIconEnumMember = { fg = colors.constant },
  TroubleIconEvent = { fg = colors.keyword },
  TroubleIconField = { fg = colors.property },
  TroubleIconFile = { fg = colors.fg },
  TroubleIconFunction = { fg = colors.function_name },
  TroubleIconInterface = { fg = colors.type },
  TroubleIconKey = { fg = colors.property },
  TroubleIconMethod = { fg = colors.function_name },
  TroubleIconModule = { fg = colors.storage },
  TroubleIconNamespace = { fg = colors.type },
  TroubleIconNull = { fg = colors.comment },
  TroubleIconNumber = { fg = colors.number },
  TroubleIconObject = { fg = colors.type },
  TroubleIconOperator = { fg = colors.operator },
  TroubleIconPackage = { fg = colors.storage },
  TroubleIconProperty = { fg = colors.property },
  TroubleIconString = { fg = colors.string },
  TroubleIconStruct = { fg = colors.type },
  TroubleIconTypeParameter = { fg = colors.type },
  TroubleIconVariable = { fg = colors.variable },

  -- Diagnostic severity icons
  TroubleIconError = { fg = colors.error },
  TroubleIconWarning = { fg = colors.warning },
  TroubleIconInformation = { fg = colors.info },
  TroubleIconHint = { fg = colors.hint },

  -- Preview window
  TroublePreview = { bg = colors.cursor_line },
  TroublePreviewMatch = { bg = colors.selection, fg = colors.fg },

  -- Signs in sign column
  TroubleSignError = { fg = colors.error },
  TroubleSignWarning = { fg = colors.warning },
  TroubleSignInformation = { fg = colors.info },
  TroubleSignHint = { fg = colors.hint },
  TroubleSignOther = { fg = colors.description_fg },

  -- Text highlights for different severities
  TroubleTextError = { fg = colors.error },
  TroubleTextWarning = { fg = colors.warning },
  TroubleTextInformation = { fg = colors.info },
  TroubleTextHint = { fg = colors.hint },

  -- Indent guides in Trouble
  TroubleIndent = { fg = colors.indent_guide },
  TroubleIndentLast = { fg = colors.indent_guide_active },

  -- Folding in Trouble
  TroubleFoldIcon = { fg = colors.description_fg },
  TroubleFoldIconClosed = { fg = colors.description_fg },
  TroubleFoldIconOpen = { fg = colors.description_fg },
}

-- Iterates over the `highlights` table and applies each group using `nvim_set_hl`.
-- This function is wrapped in a protected call to prevent errors from halting the script.
for group, settings in pairs(highlights) do
  local success, err = pcall(vim.api.nvim_set_hl, 0, group, settings)
  if not success then
    vim.notify("Error setting highlight group '" .. group .. "': " .. err, vim.log.levels.WARN)
  end
end

-- Sets up an autocommand to apply language-specific and plugin highlights after the colorscheme has loaded.
-- This ensures that custom highlights override any defaults set by the colorscheme or other plugins.
vim.api.nvim_create_autocmd("ColorScheme", {
  callback = function()
    -- TSX-specific bracket highlights that override general ones
    vim.api.nvim_set_hl(0, "@punctuation.bracket.round.tsx", { fg = "#FFD700" }) -- parentheses ()
    vim.api.nvim_set_hl(0, "@punctuation.bracket.curly.tsx", { fg = "#179FFF" }) -- curly braces {}
    vim.api.nvim_set_hl(0, "@punctuation.bracket.square.tsx", { fg = "#D76ED3" }) -- square brackets []

    -- Enhanced completion menu highlights for VSCode-like appearance
    vim.api.nvim_set_hl(0, "BlinkCmpMenu", { bg = "#1e1e1e", fg = "#cccccc" })
    vim.api.nvim_set_hl(0, "BlinkCmpMenuBorder", { bg = "#1e1e1e", fg = "#454545" })
    vim.api.nvim_set_hl(0, "BlinkCmpMenuSelection", { bg = "#264f78", fg = "#ffffff" })
    vim.api.nvim_set_hl(0, "BlinkCmpLabel", { fg = "#cccccc" })
    vim.api.nvim_set_hl(0, "BlinkCmpLabelDescription", { fg = "#9cdcfe", italic = true })
    vim.api.nvim_set_hl(0, "BlinkCmpSource", { fg = "#608b4e", bold = true })

    -- Documentation window highlights
    vim.api.nvim_set_hl(0, "BlinkCmpDoc", { bg = "#252526", fg = "#cccccc" })
    vim.api.nvim_set_hl(0, "BlinkCmpDocBorder", { bg = "#252526", fg = "#454545" })

    -- Completion item kind highlights (VSCode-style icons colors)
    vim.api.nvim_set_hl(0, "BlinkCmpKindFunction", { fg = "#dcdcaa" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindMethod", { fg = "#dcdcaa" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindVariable", { fg = "#9cdcfe" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindField", { fg = "#9cdcfe" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindProperty", { fg = "#9cdcfe" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindClass", { fg = "#4ec9b0" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindInterface", { fg = "#4ec9b0" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindModule", { fg = "#ce9178" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindKeyword", { fg = "#569cd6" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindSnippet", { fg = "#d7ba7d" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindText", { fg = "#cccccc" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindEnum", { fg = "#b5cea8" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindConstant", { fg = "#4fc1ff" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindConstructor", { fg = "#dcdcaa" })
    vim.api.nvim_set_hl(0, "BlinkCmpKindTypeParameter", { fg = "#4ec9b0" })

    -- Apply Trouble.nvim highlights to match VS Code theme
    vim.api.nvim_set_hl(0, "TroubleNormal", { fg = "#cccccc", bg = "#181818" })
    vim.api.nvim_set_hl(0, "TroubleText", { fg = "#cccccc" })
    vim.api.nvim_set_hl(0, "TroubleSource", { fg = "#6A9955", italic = true })
    vim.api.nvim_set_hl(0, "TroubleCode", { fg = "#B5CEA8" })
    vim.api.nvim_set_hl(0, "TroubleDirectory", { fg = "#4EC9B0" })
    vim.api.nvim_set_hl(0, "TroubleFilename", { fg = "#9CDCFE", bold = true })
    vim.api.nvim_set_hl(0, "TroubleLocation", { fg = "#9d9d9d" })
    vim.api.nvim_set_hl(0, "TroublePos", { fg = "#B5CEA8" })
    vim.api.nvim_set_hl(0, "TroubleCount", { fg = "#CD9731", bg = "#222222", bold = true })

    -- Trouble diagnostic icons with VS Code colors
    vim.api.nvim_set_hl(0, "TroubleIconError", { fg = "#F44747" })
    vim.api.nvim_set_hl(0, "TroubleIconWarning", { fg = "#CD9731" })
    vim.api.nvim_set_hl(0, "TroubleIconInformation", { fg = "#6796E6" })
    vim.api.nvim_set_hl(0, "TroubleIconHint", { fg = "#B267E6" })

    -- Trouble text highlights for different severities
    vim.api.nvim_set_hl(0, "TroubleTextError", { fg = "#F44747" })
    vim.api.nvim_set_hl(0, "TroubleTextWarning", { fg = "#CD9731" })
    vim.api.nvim_set_hl(0, "TroubleTextInformation", { fg = "#6796E6" })
    vim.api.nvim_set_hl(0, "TroubleTextHint", { fg = "#B267E6" })

    -- Trouble preview and selection
    vim.api.nvim_set_hl(0, "TroublePreview", { bg = "#222222" })
    vim.api.nvim_set_hl(0, "TroublePreviewMatch", { bg = "#264f78", fg = "#ffffff" })
  end,
})

-- Also apply them immediately for the current session
vim.api.nvim_set_hl(0, "@punctuation.bracket.round.tsx", { fg = "#FFD700" })  -- parentheses ()
vim.api.nvim_set_hl(0, "@punctuation.bracket.curly.tsx", { fg = "#179FFF" })  -- curly braces {}
vim.api.nvim_set_hl(0, "@punctuation.bracket.square.tsx", { fg = "#D76ED3" }) -- square brackets []

-- Enhanced completion menu highlights for immediate application
vim.api.nvim_set_hl(0, "BlinkCmpMenu", { bg = "#1e1e1e", fg = "#cccccc" })
vim.api.nvim_set_hl(0, "BlinkCmpMenuBorder", { bg = "#1e1e1e", fg = "#454545" })
vim.api.nvim_set_hl(0, "BlinkCmpMenuSelection", { bg = "#264f78", fg = "#ffffff" })
vim.api.nvim_set_hl(0, "BlinkCmpLabel", { fg = "#cccccc" })
vim.api.nvim_set_hl(0, "BlinkCmpLabelDescription", { fg = "#454545", italic = true })
vim.api.nvim_set_hl(0, "BlinkCmpSource", { fg = "#608b4e", bold = true })
vim.api.nvim_set_hl(0, "BlinkCmpDoc", { bg = "#252526", fg = "#cccccc" })
vim.api.nvim_set_hl(0, "BlinkCmpDocBorder", { bg = "#252526", fg = "#454545" })

-- Signature help highlights
vim.api.nvim_set_hl(0, "BlinkCmpSignatureHelp", { bg = "#1e1e1e", fg = "#cccccc" })
vim.api.nvim_set_hl(0, "BlinkCmpSignatureHelpBorder", { bg = "#1e1e1e", fg = "#454545" })

-- Apply Trouble.nvim highlights immediately
vim.api.nvim_set_hl(0, "TroubleNormal", { fg = "#cccccc", bg = "#181818" })
vim.api.nvim_set_hl(0, "TroubleText", { fg = "#cccccc" })
vim.api.nvim_set_hl(0, "TroubleSource", { fg = "#6A9955", italic = true })
vim.api.nvim_set_hl(0, "TroubleCode", { fg = "#B5CEA8" })
vim.api.nvim_set_hl(0, "TroubleDirectory", { fg = "#4EC9B0" })
vim.api.nvim_set_hl(0, "TroubleFilename", { fg = "#9CDCFE", bold = true })
vim.api.nvim_set_hl(0, "TroubleLocation", { fg = "#9d9d9d" })
vim.api.nvim_set_hl(0, "TroublePos", { fg = "#B5CEA8" })
vim.api.nvim_set_hl(0, "TroubleCount", { fg = "#CD9731", bg = "#222222", bold = true })

-- Trouble diagnostic icons
vim.api.nvim_set_hl(0, "TroubleIconError", { fg = "#F44747" })
vim.api.nvim_set_hl(0, "TroubleIconWarning", { fg = "#CD9731" })
vim.api.nvim_set_hl(0, "TroubleIconInformation", { fg = "#6796E6" })
vim.api.nvim_set_hl(0, "TroubleIconHint", { fg = "#B267E6" })

-- Trouble text highlights for different severities
vim.api.nvim_set_hl(0, "TroubleTextError", { fg = "#F44747" })
vim.api.nvim_set_hl(0, "TroubleTextWarning", { fg = "#CD9731" })
vim.api.nvim_set_hl(0, "TroubleTextInformation", { fg = "#6796E6" })
vim.api.nvim_set_hl(0, "TroubleTextHint", { fg = "#B267E6" })

-- Trouble preview and selection
vim.api.nvim_set_hl(0, "TroublePreview", { bg = "#222222" })
vim.api.nvim_set_hl(0, "TroublePreviewMatch", { bg = "#264f78", fg = "#ffffff" })

-- Terminal colors (16 ANSI colors) - mapped from your VS Code theme
vim.g.terminal_color_0 = "#000000"  -- Black
vim.g.terminal_color_1 = "#cd3131"  -- Red
vim.g.terminal_color_2 = "#0dbc79"  -- Green
vim.g.terminal_color_3 = "#e5e510"  -- Yellow
vim.g.terminal_color_4 = "#2472c8"  -- Blue
vim.g.terminal_color_5 = "#bc3fbc"  -- Magenta
vim.g.terminal_color_6 = "#11a8cd"  -- Cyan
vim.g.terminal_color_7 = "#e5e5e5"  -- White
vim.g.terminal_color_8 = "#666666"  -- Bright Black
vim.g.terminal_color_9 = "#f14c4c"  -- Bright Red
vim.g.terminal_color_10 = "#23d18b" -- Bright Green
vim.g.terminal_color_11 = "#f5f543" -- Bright Yellow
vim.g.terminal_color_12 = "#3b8eea" -- Bright Blue
vim.g.terminal_color_13 = "#d670d6" -- Bright Magenta
vim.g.terminal_color_14 = "#29b8db" -- Bright Cyan
vim.g.terminal_color_15 = "#e5e5e5" -- Bright White