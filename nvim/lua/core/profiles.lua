-- [[ Adaptive Colorscheme ]]
-- A custom colorscheme matching Cursor's light/dark themes. Both the accent/syntax
-- colors and the neutral surface/text colors switch on `vim.o.background` so the
-- UI stays muted and readable on both light and dark terminals. The mode follows
-- the terminal automatically when it reports its
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
    -- Syntax: Cursor light / Cursor dark token colors (alpha values flattened)
    comment          = light and "#717171" or "#9A9A9A", -- #14141499 / #F0F0F099
    keyword          = light and "#B3003F" or "#82D2CE",
    storage          = light and "#B3003F" or "#82D2CE",
    string           = light and "#9E94D5" or "#E394DC",
    number           = light and "#B8448B" or "#EBC88D",
    boolean          = light and "#206595" or "#82D2CE",
    function_name    = light and "#DB704B" or "#EFB080",
    type             = light and "#206595" or "#EFB080",
    type_builtin     = light and "#B3003F" or "#82D2CE", -- support.type.primitive
    variable         = light and "#206595" or "#D6D6DD",
    variable_builtin = light and "#CF2D56" or "#CC7C8A", -- variable.language (this/self)
    constant         = light and "#206595" or "#AAA0FA",
    operator         = light and "#141414" or "#D6D6DD",
    punctuation      = light and "#141414" or "#D6D6DD",
    property         = light and "#6049B3" or "#AAA0FA",
    regex            = light and "#3C7CAB" or "#D6D6DD",
    escape           = light and "#505050" or "#D6D6DD", -- light: #141414BD flattened
    preproc          = light and "#1F8A65" or "#A8CC7C",
    tag              = light and "#1F8A65" or "#87C3FF",
    attribute        = light and "#6049B3" or "#AAA0FA",

    -- TSX rainbow brackets (decorative)
    bracket_round  = light and "#055180" or "#FFD700", -- ()
    bracket_curly  = light and "#3C7CAB" or "#DA70D6", -- {}  (Cursor bracket 2)
    bracket_square = light and "#6299C3" or "#179FFF", -- []  (Cursor bracket 3)

    -- Diagnostics
    error   = light and "#CF2D56" or "#E34671",
    warning = light and "#DB704B" or "#F1B467",
    info    = light and "#206595" or "#88C0D0",
    hint    = light and "#8250DF" or "#B48EAD", -- Cursor has no hint color; dark = ansiMagenta

    -- Git / diff
    git_add = light and "#1F8A65" or "#3FA266",
    git_change = light and "#C08532" or "#D2943E",
    git_delete = light and "#CF2D56" or "#E34671",
    diff_add = light and "#E1EEEA" or "#203428",    -- insertedLineBackground flattened
    diff_delete = light and "#F8ECEF" or "#381322", -- removedLineBackground flattened
    diff_change = light and "#C08532" or "#D2943E", -- NOTE: unused key; kept in family

    -- Blue accents and search (Cursor button/link blue; find-match tints flattened)
    button_bg = light and "#3C7CAB" or "#81A1C1",
    focus_border = light and "#3C7CAB" or "#81A1C1",
    menu_selection = light and "#E4E4E4" or "#343434", -- suggest-widget selected row
    activity_border = light and "#3C7CAB" or "#81A1C1",
    tab_active_border_top = light and "#3C7CAB" or "#81A1C1",
    search = light and "#C9D9DD" or "#455B62",           -- findMatchBackground (current match)
    search_highlight = light and "#E3EBEC" or "#364549", -- findMatchHighlightBackground (others)
    search_fg = light and "#055180" or "#88C0D0",        -- match emphasis fg (MatchParen, Telescope)
    selection_highlight = light and "#EDEDED" or "#383838",

    -- Neutral mid-greys (Cursor secondary foregrounds, flattened)
    inactive_fg = light and "#6D6D6D" or "#989898",
    description_fg = light and "#505050" or "#AEAEAE", -- #141414BD / #F0F0F0B3 flattened
    tab_inactive_fg = light and "#4E4E4E" or "#666666",
    badge_bg = light and "#206595" or "#88C0D0",
    badge_fg = light and "#F3F3F3" or "#141414",
    editor_group_border = "#ffffff17",
    terminal_fg = light and "#141414" or "#F0F0F0",

    -- ===== Neutral tier (light vs dark) =====
    fg = light and "#141414" or "#f0f0f0",
    sidebar_fg = light and "#4E4E4E" or "#b8b8b8", -- light: sideBar.foreground #141414BD flattened
    dropdown_fg = light and "#141414" or "#f0f0f0",
    notification_fg = light and "#141414" or "#f0f0f0",
    bg = light and "#FCFCFC" or "#181818", -- Cursor editor bg; fg-contrast + virtual-text bg
    status_bg = light and "#f3f3f3" or "#141414",
    panel_bg = light and "#f3f3f3" or "#141414",
    menu_bg = light and "#f3f3f3" or "#141414",
    widget_bg = light and "#f3f3f3" or "#141414",
    sidebar_bg = light and "#f3f3f3" or "#141414",
    notification_bg = light and "#f3f3f3" or "#141414",
    surface_menu = light and "#F3F3F3" or "#141414", -- floats + Blink menu (Cursor widget bg)
    surface_doc = light and "#EDEDED" or "#1F1F1F", -- Blink docs / signature (lift further)
    input_bg = light and "#e0e0e0" or "#1f1f1f", -- NOTE: unused key; value kept consistent with lifted surfaces
    dropdown_bg = light and "#e0e0e0" or "#1f1f1f", -- NOTE: unused key
    border = light and "#c8c8c8" or "#303030",
    tab_border = light and "#c8c8c8" or "#282828",
    panel_border = light and "#c8c8c8" or "#282828",
    notification_border = light and "#c8c8c8" or "#282828",
    cursor_line = light and "#EDEDED" or "#262626", -- Cursor lineHighlightBackground
    selection = light and "#E1E1E1" or "#303030",   -- editor.selectionBackground flattened
    visual = light and "#d4d4d4" or "#2b2b2b",
    line_nr = light and "#A8A8A8" or "#666666",     -- editorLineNumber.foreground flattened
    line_nr_active = light and "#141414" or "#f0f0f0",
    activity_fg = light and "#3a3a3a" or "#b8b8b8",
    tab_active_fg = light and "#141414" or "#f0f0f0",
    indent_guide = light and "#d0d0d0" or "#282828",
    indent_guide_active = light and "#a8a8a8" or "#4a4a4a",

    -- Terminal ANSI (Cursor terminal.ansi*; [1-8] normal, [9-16] bright)
    ansi = light and {
      "#141414", "#CF2D56", "#1F8A65", "#A16900", "#3C7CAB", "#B8448B", "#4C7F8C", "#FCFCFC",
      "#4E4E4E", "#E75E78", "#55A583", "#C08532", "#6299C3", "#D06BA6", "#6F9BA6", "#FFFFFF",
    } or {
      "#242424", "#FC6B83", "#3FA266", "#D2943E", "#81A1C1", "#B48EAD", "#88C0D0", "#F0F0F0",
      "#989898", "#FC6B83", "#70B489", "#F1B467", "#87A6C4", "#B48EAD", "#88C0D0", "#FFFFFF",
    },
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
    Search = { bg = colors.search_highlight, fg = colors.fg },
    IncSearch = { bg = colors.search, fg = colors.fg },
    CurSearch = { bg = colors.search, fg = colors.fg },

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
    PmenuSel = { fg = colors.fg, bg = colors.menu_selection },
    PmenuSbar = { bg = colors.border },
    PmenuThumb = { bg = colors.fg },
    PmenuKind = { fg = colors.type },
    PmenuKindSel = { fg = colors.fg, bg = colors.menu_selection },
    PmenuExtra = { fg = colors.description_fg },
    PmenuExtraSel = { fg = colors.fg, bg = colors.menu_selection },

    -- === FOLDING ===
    Folded = { fg = colors.description_fg, bg = colors.cursor_line },
    FoldColumn = { fg = colors.description_fg }, -- transparent

    -- === GUTTER ===
    SignColumn = {}, -- transparent

    -- === MATCHING ===
    MatchParen = { fg = colors.search_fg, bold = true, underline = true },

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
    ["@variable.builtin"] = { fg = colors.variable_builtin },
    ["@variable.parameter"] = { fg = colors.variable },
    ["@variable.member"] = { fg = colors.property },

    -- Types
    ["@type"] = { fg = colors.type },
    ["@type.builtin"] = { fg = colors.type_builtin },
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
    WhichKeyNormal = { fg = colors.fg, bg = "NONE" }, -- v3 popup bg: transparent = match editor
    WhichKeyFloat = { bg = "NONE" }, -- v2 fallback (ignored by which-key v3)
    WhichKeyBorder = { fg = colors.border, bg = "NONE" },

    -- Telescope (if using)
    TelescopeNormal = { fg = colors.fg }, -- transparent (matches Normal)
    TelescopeBorder = { fg = colors.border },
    TelescopePromptBorder = { fg = colors.focus_border },
    TelescopeResultsBorder = { fg = colors.border },
    TelescopePreviewBorder = { fg = colors.border },
    TelescopeSelection = { fg = colors.fg, bg = colors.selection },
    TelescopePromptPrefix = { fg = colors.focus_border },
    TelescopeMatching = { fg = colors.search_fg, bold = true },

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

  -- Terminal ANSI colors follow the palette so they re-theme with background.
  for i, c in ipairs(colors.ansi) do
    vim.g["terminal_color_" .. (i - 1)] = c
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
