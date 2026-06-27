-- [[ Adaptive Colorscheme ]]
-- A custom colorscheme inspired by modern code editors. The accent/syntax colors
-- are shared across light and dark; the neutral surface/text colors switch on
-- `vim.o.background` so the UI stays muted and readable on both light and dark
-- terminals. The mode follows the terminal automatically when it reports its
-- background (OSC 11); a persistent `<leader>tb` toggle covers terminals that don't.
-- Resets all existing highlight groups to their default values to ensure a clean slate.
vim.cmd("highlight clear")
if vim.fn.exists("syntax_on") then
  vim.cmd("syntax reset")
end

-- Enables 24-bit RGB color support for a richer color experience in compatible terminals.
vim.opt.termguicolors = true

-- Builds the color palette for the current `background`. Pure: takes no input
-- beyond `vim.o.background` and returns a fresh table. Accent keys are identical
-- in both modes; neutral keys pick a light or dark value.
local function palette()
  local light = vim.o.background == "light"
  return {
    -- ===== Accent tier (light vs dark) =====
    -- Syntax: dark = VS Code Dark+, light = VS Code Light+ (higher contrast on #f3f3f3)
    comment       = light and "#008000" or "#6A9955",
    keyword       = light and "#AF00DB" or "#C586C0",
    storage       = light and "#0000FF" or "#569CD6",
    string        = light and "#A31515" or "#CE9178",
    number        = light and "#098658" or "#B5CEA8",
    boolean       = light and "#0000FF" or "#569CD6",
    function_name = light and "#795E26" or "#DCDCAA",
    type          = light and "#267F99" or "#4EC9B0",
    variable      = light and "#001080" or "#9CDCFE",
    constant      = light and "#0070C1" or "#4FC1FF",
    operator      = light and "#2e2e2e" or "#D4D4D4",
    punctuation   = light and "#2e2e2e" or "#D4D4D4",
    property      = light and "#001080" or "#9CDCFE",
    regex         = light and "#811F3F" or "#D16969",
    escape        = light and "#B5650D" or "#D7BA7D",
    preproc       = light and "#0000FF" or "#569CD6",
    tag           = light and "#800000" or "#569CD6",
    attribute     = light and "#001080" or "#9CDCFE",

    -- TSX rainbow brackets (decorative)
    bracket_round  = light and "#B8860B" or "#FFD700", -- ()
    bracket_curly  = light and "#0070C1" or "#179FFF", -- {}
    bracket_square = light and "#A626A4" or "#D76ED3", -- []

    -- Diagnostics
    error   = light and "#E51400" or "#F44747",
    warning = light and "#BF8803" or "#CD9731",
    info    = light and "#1A85FF" or "#6796E6",
    hint    = light and "#8250DF" or "#B267E6",

    -- Git / diff
    git_add = light and "#1A7F37" or "#2ea043",
    git_change = "#0078d4",
    git_delete = light and "#CF222E" or "#f85149",
    diff_add = light and "#cdeacf" or "#2d4a2b",      -- bg tint (pale green on light)
    diff_delete = light and "#f6d8d8" or "#4a2d2d",   -- bg tint (pale red on light)
    diff_change = "#569CD6",

    -- Blue accents and search (legible on both modes)
    button_bg = "#0078d4",
    focus_border = "#0078d4",
    menu_selection = "#0078d4",
    activity_border = "#0078d4",
    tab_active_border_top = "#0078d4",
    search = "#9e6a03",
    search_highlight = "#ea5c00",
    selection_highlight = "#add6ff",

    -- Neutral mid-greys that read on both
    inactive_fg = "#868686",
    description_fg = "#9d9d9d",
    tab_inactive_fg = "#9d9d9d",
    badge_bg = "#616161",
    badge_fg = "#f8f8f8",
    editor_group_border = "#ffffff17",
    terminal_fg = "#cccccc",

    -- ===== Neutral tier (light vs dark) =====
    fg = light and "#2e2e2e" or "#cccccc",
    sidebar_fg = light and "#2e2e2e" or "#cccccc",
    dropdown_fg = light and "#2e2e2e" or "#cccccc",
    notification_fg = light and "#2e2e2e" or "#cccccc",
    bg = light and "#f3f3f3" or "#181818", -- fg-contrast (Cursor/Search/Ignore/TermCursor) + remaining bgs
    status_bg = light and "#f3f3f3" or "#181818",
    panel_bg = light and "#f3f3f3" or "#181818",
    menu_bg = light and "#f3f3f3" or "#181818",
    widget_bg = light and "#f3f3f3" or "#181818",
    sidebar_bg = light and "#f3f3f3" or "#181818",
    notification_bg = light and "#f3f3f3" or "#1f1f1f",
    surface_menu = light and "#cacaca" or "#2f2f2f", -- floats + Blink completion menu (matches cursor_line)
    surface_doc = light and "#e4e4e4" or "#252526", -- Blink docs / signature
    input_bg = light and "#e0e0e0" or "#313131",
    dropdown_bg = light and "#e0e0e0" or "#313131",
    border = light and "#c8c8c8" or "#2b2b2b",
    tab_border = light and "#c8c8c8" or "#2b2b2b",
    panel_border = light and "#c8c8c8" or "#2b2b2b",
    notification_border = light and "#c8c8c8" or "#2b2b2b",
    cursor_line = light and "#cacaca" or "#2f2f2f",
    selection = light and "#cfe0f5" or "#264f78",
    visual = light and "#d4d4d4" or "#3a3d41",
    line_nr = light and "#b3b3b3" or "#2e3038",
    line_nr_active = light and "#1f1f1f" or "#f8f8f2",
    activity_fg = light and "#3a3a3a" or "#d7d7d7",
    tab_active_fg = light and "#1f1f1f" or "#ffffff",
    indent_guide = light and "#d0d0d0" or "#404040",
    indent_guide_active = light and "#a8a8a8" or "#707070",
  }
end

-- Sets a highlight group, swallowing errors so one bad group can't halt the rest.
local function set(group, settings)
  local ok, err = pcall(vim.api.nvim_set_hl, 0, group, settings)
  if not ok then
    vim.notify("Error setting highlight group '" .. group .. "': " .. err, vim.log.levels.WARN)
  end
end

-- Paints every highlight group from the current palette. Re-run whenever
-- `background` changes so the whole UI re-themes.
local function apply()
  local colors = palette()

  -- Maps the palette to specific Neovim UI elements and syntax tokens.
  -- See `:help highlight-groups` for the standard groups.
  local highlights = {
    -- === EDITOR CORE ===
    Normal = { fg = colors.fg }, -- bg from terminal (transparent)
    NormalFloat = { fg = colors.fg, bg = colors.surface_menu }, -- subtle lift over bg
    NormalNC = { fg = colors.fg }, -- bg from terminal (transparent)

    -- === LINE NUMBERS ===
    LineNr = { fg = colors.line_nr }, -- transparent
    CursorLineNr = { fg = colors.line_nr_active, bold = true }, -- transparent

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
    StatusLine = { fg = colors.fg }, -- transparent
    StatusLineNC = { fg = colors.inactive_fg }, -- transparent

    -- === TABS ===
    TabLine = { fg = colors.tab_inactive_fg }, -- transparent
    TabLineFill = {}, -- transparent
    TabLineSel = { fg = colors.tab_active_fg, bold = true }, -- transparent

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
    FoldColumn = { fg = colors.description_fg }, -- transparent

    -- === GUTTER ===
    SignColumn = {}, -- transparent

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
    ["@variable.tsx"] = { fg = colors.variable },
    ["@type.tsx"] = { fg = colors.variable },
    ["@constant.tsx"] = { fg = colors.variable },
    ["@keyword.tsx"] = { fg = colors.storage },

    ["@operator.tsx"] = { fg = colors.storage },
    ["@character.special.tsx"] = { fg = colors.storage },

    ["@_jsx_element.tsx"] = { fg = colors.constant },
    ["@_jsx_attribute.tsx"] = { fg = colors.constant },
    -- Remove the general bracket highlight to let specific ones take precedence
    ["@tag.builtin.tsx"] = { fg = colors.type },
    ["@tag.tsx"] = { fg = colors.type },
    ["@variable.member.tsx"] = { fg = colors.property },

    -- LSP Semantic Tokens for TypeScript/TSX
    ["@lsp.type.variable.typescriptreact"] = { fg = colors.constant },
    ["@lsp.type.property.typescriptreact"] = { fg = colors.property },
    ["@lsp.mod.declaration.typescriptreact"] = { fg = colors.variable },
    ["@lsp.mod.local.typescriptreact"] = { fg = colors.constant },
    ["@lsp.mod.readonly.typescriptreact"] = { fg = colors.constant },
    ["@lsp.typemod.variable.declaration.typescriptreact"] = { fg = colors.constant },
    ["@lsp.typemod.variable.local.typescriptreact"] = { fg = colors.constant },
    ["@lsp.typemod.variable.readonly.typescriptreact"] = { fg = colors.constant },
    ["@lsp.typemod.property.declaration.typescriptreact"] = { fg = colors.property },

    -- Function semantic tokens for TypeScript/TSX
    ["@lsp.type.function.typescriptreact"] = { fg = colors.function_name },
    ["@lsp.typemod.function.declaration.typescriptreact"] = { fg = colors.function_name },
    ["@lsp.typemod.function.local.typescriptreact"] = { fg = colors.function_name },
    ["@lsp.typemod.function.readonly.typescriptreact"] = { fg = colors.function_name },

    -- Also add for TypeScript files (not just TSX)
    ["@variable.typescript"] = { fg = colors.variable },
    ["@type.typescript"] = { fg = colors.variable },
    ["@constant.typescript"] = { fg = colors.variable },
    ["@keyword.typescript"] = { fg = colors.storage },
    ["@operator.typescript"] = { fg = colors.storage },
    ["@character.special.typescript"] = { fg = colors.storage },

    -- LSP Semantic Tokens for TypeScript
    ["@lsp.type.variable.typescript"] = { fg = colors.constant },
    ["@lsp.mod.declaration.typescript"] = { fg = colors.constant },
    ["@lsp.mod.local.typescript"] = { fg = colors.constant },
    ["@lsp.mod.readonly.typescript"] = { fg = colors.constant },
    ["@lsp.typemod.variable.declaration.typescript"] = { fg = colors.constant },
    ["@lsp.typemod.variable.local.typescript"] = { fg = colors.constant },
    ["@lsp.typemod.variable.readonly.typescript"] = { fg = colors.constant },

    -- Function semantic tokens for TypeScript
    ["@lsp.type.function.typescript"] = { fg = colors.function_name },
    ["@lsp.typemod.function.declaration.typescript"] = { fg = colors.function_name },
    ["@lsp.typemod.function.local.typescript"] = { fg = colors.function_name },
    ["@lsp.typemod.function.readonly.typescript"] = { fg = colors.function_name },

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
    FloatBorder = { fg = colors.border, bg = colors.surface_menu },
    FloatTitle = { fg = colors.fg, bg = colors.surface_menu, bold = true },

    -- WhichKey
    WhichKey = { fg = colors.keyword },
    WhichKeyGroup = { fg = colors.type },
    WhichKeyDesc = { fg = colors.fg },
    WhichKeySeperator = { fg = colors.comment },
    WhichKeyFloat = { bg = colors.surface_menu },
    WhichKeyBorder = { fg = colors.border },

    -- Telescope (if using)
    TelescopeNormal = { fg = colors.fg }, -- transparent (matches Normal)
    TelescopeBorder = { fg = colors.border },
    TelescopePromptBorder = { fg = colors.focus_border },
    TelescopeResultsBorder = { fg = colors.border },
    TelescopePreviewBorder = { fg = colors.border },
    TelescopeSelection = { fg = colors.fg, bg = colors.selection },
    TelescopePromptPrefix = { fg = colors.focus_border },
    TelescopeMatching = { fg = colors.search, bold = true },

    -- Additional Telescope highlights for better text visibility
    TelescopeTitle = { fg = colors.fg, bold = true },
    TelescopePromptTitle = { fg = colors.focus_border, bold = false },
    TelescopeResultsTitle = { fg = colors.fg, bold = true },
    TelescopePreviewTitle = { fg = colors.fg, bold = true },
    TelescopePromptNormal = { fg = colors.fg },
    TelescopeResultsNormal = { fg = colors.fg },
    TelescopePreviewNormal = { fg = colors.fg },
    TelescopePromptCounter = { fg = colors.description_fg },
    TelescopeMultiSelection = { fg = colors.warning, bold = true },

    -- NvimTree (if using)
    NvimTreeNormal = { fg = colors.fg }, -- transparent
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
    NeoTreeNormal = { fg = colors.sidebar_fg }, -- transparent
    NeoTreeNormalNC = { fg = colors.sidebar_fg }, -- transparent
    NeoTreeRootName = { fg = colors.focus_border, bold = true },
    NeoTreeGitAdded = { fg = colors.git_add },
    NeoTreeGitConflict = { fg = colors.error },
    NeoTreeGitDeleted = { fg = colors.git_delete },
    NeoTreeGitModified = { fg = colors.git_change },
    NeoTreeGitUntracked = { fg = colors.git_add },
    NeoTreeIndentMarker = { fg = colors.indent_guide },
    NeoTreeExpander = { fg = colors.indent_guide },
    NeoTreeFloatBorder = { fg = colors.border },
    NeoTreeFloatTitle = { fg = colors.fg, bold = true },

    -- Indentation guides
    IndentBlanklineChar = { fg = colors.indent_guide },
    IndentBlanklineContextChar = { fg = colors.indent_guide_active },

    -- === TROUBLE.NVIM ===
    -- Main Trouble window
    TroubleNormal = { fg = colors.fg, bg = colors.menu_bg },
    TroubleNormalNC = { fg = colors.fg, bg = colors.menu_bg },

    -- Trouble item highlights
    TroubleText = { fg = colors.fg },
    TroubleSource = { fg = colors.comment, italic = true },
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

    -- === TSX BRACKET PAIRS (override general bracket color) ===
    ["@punctuation.bracket.round.tsx"] = { fg = colors.bracket_round }, -- ()
    ["@punctuation.bracket.curly.tsx"] = { fg = colors.bracket_curly }, -- {}
    ["@punctuation.bracket.square.tsx"] = { fg = colors.bracket_square }, -- []

    -- === BLINK.CMP (completion menu / docs) ===
    BlinkCmpMenu = { bg = colors.surface_menu, fg = colors.fg },
    BlinkCmpMenuBorder = { bg = colors.surface_menu, fg = colors.border },
    BlinkCmpMenuSelection = { bg = colors.selection, fg = colors.fg },
    BlinkCmpLabel = { fg = colors.fg },
    BlinkCmpLabelDescription = { fg = colors.variable, italic = true },
    BlinkCmpSource = { fg = colors.comment, bold = true },
    BlinkCmpDoc = { bg = colors.surface_doc, fg = colors.fg },
    BlinkCmpDocBorder = { bg = colors.surface_doc, fg = colors.border },
    BlinkCmpSignatureHelp = { bg = colors.surface_menu, fg = colors.fg },
    BlinkCmpSignatureHelpBorder = { bg = colors.surface_menu, fg = colors.border },

    -- Completion item kind icons (VS Code-style colors)
    BlinkCmpKindFunction = { fg = colors.function_name },
    BlinkCmpKindMethod = { fg = colors.function_name },
    BlinkCmpKindConstructor = { fg = colors.function_name },
    BlinkCmpKindVariable = { fg = colors.variable },
    BlinkCmpKindField = { fg = colors.property },
    BlinkCmpKindProperty = { fg = colors.property },
    BlinkCmpKindClass = { fg = colors.type },
    BlinkCmpKindInterface = { fg = colors.type },
    BlinkCmpKindTypeParameter = { fg = colors.type },
    BlinkCmpKindModule = { fg = colors.string },
    BlinkCmpKindKeyword = { fg = colors.storage },
    BlinkCmpKindSnippet = { fg = colors.escape },
    BlinkCmpKindText = { fg = colors.fg },
    BlinkCmpKindEnum = { fg = colors.number },
    BlinkCmpKindConstant = { fg = colors.constant },
  }

  for group, settings in pairs(highlights) do
    set(group, settings)
  end
end

-- ===================================================================
-- Light/dark detection + persistence
-- ===================================================================

-- Persisted manual override. Takes precedence over terminal auto-detection so a
-- toggle survives restarts even on terminals that don't report their background.
local pref_file = vim.fn.stdpath("state") .. "/background"

-- Reads the saved preference and applies it (no-op if none saved / invalid).
local function load_pref()
  local ok, lines = pcall(vim.fn.readfile, pref_file)
  local v = ok and lines[1]
  if v == "light" or v == "dark" then
    vim.o.background = v
  end
end

-- Flips light/dark and persists the choice. Setting `background` fires the
-- OptionSet autocmd below, which re-themes via apply().
local function toggle_background()
  vim.o.background = (vim.o.background == "dark") and "light" or "dark"
  pcall(vim.fn.writefile, { vim.o.background }, pref_file)
  vim.notify("background: " .. vim.o.background)
end

-- Re-theme whenever the mode changes — from a manual toggle or from Neovim's own
-- OSC 11 terminal-background detection (both surface as a `background` OptionSet).
vim.api.nvim_create_autocmd("OptionSet", {
  pattern = "background",
  callback = apply,
})
-- Re-assert our groups if another colorscheme is ever loaded over this one.
vim.api.nvim_create_autocmd("ColorScheme", { callback = apply })

load_pref() -- saved choice wins at startup
apply() -- initial paint (also covers the no-saved-pref case)

-- Neovim's OSC 11 terminal-background detection can resolve during startup, where
-- OptionSet is suppressed. Re-assert the saved preference and repaint once after
-- startup so both auto-detected and pinned modes land correctly.
vim.api.nvim_create_autocmd("VimEnter", {
  callback = function()
    load_pref()
    apply()
  end,
})

vim.keymap.set("n", "<leader>tb", toggle_background, { desc = "[T]oggle [B]ackground (light/dark)" })

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
