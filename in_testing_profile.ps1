<# 
.TITLE PowerShell Profile Configuration
.NOTICE This profile script configures PowerShell environment with custom functions, aliases, and module imports
.DEV Main configuration file for PowerShell that runs on startup
#>

<# 
.TITLE Tab Directory Management Functions
.NOTICE Functions to manage and persist the last directory for each Windows Terminal tab
#>

<# 
.NOTICE Gets a unique identifier for the current terminal tab
.RETURN The Windows Terminal session ID
#>
function Get-TabIdentifier {
    return $env:WT_SESSION
}

<# 
.NOTICE Saves the current directory path for the active terminal tab
.DEV Creates a text file named with the tab ID in the AppData directory
#>
function Save-LastDirectory {
    $baseDir = "$env:APPDATA\terminal_dirs"
    if (-not (Test-Path $baseDir)) {
        New-Item -ItemType Directory -Path $baseDir | Out-Null
    }

    $tabId = Get-TabIdentifier
    $lastDirFile = Join-Path $baseDir "lastdir_$tabId.txt"
    
    $currentPath = (Get-Location).Path
    [System.IO.File]::WriteAllText($lastDirFile, $currentPath)
}

<# 
.NOTICE Restores the last saved directory for the current terminal tab
.DEV Reads the saved directory path and changes to it if it exists
#>
function Set-LocationFromLastDirectory {
    $baseDir = "$env:APPDATA\terminal_dirs"
    $tabId = Get-TabIdentifier
    $lastDirFile = Join-Path $baseDir "lastdir_$tabId.txt"

    if (Test-Path $lastDirFile) {
        $lastDir = Get-Content $lastDirFile
        if (Test-Path $lastDir) {
            Set-Location $lastDir
        }
    }
}

<# 
.NOTICE Removes directory tracking files older than 7 days
.DEV Helps maintain clean storage by removing unused tracking files
#>
function Clear-OldDirectoryFiles {
    $baseDir = "$env:APPDATA\terminal_dirs"
    if (Test-Path $baseDir) {
        Get-ChildItem $baseDir -Filter "lastdir_*.txt" | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-7)
        } | ForEach-Object {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

# Initialize directory tracking on profile load
Clear-OldDirectoryFiles
Set-LocationFromLastDirectory

# Configure command history size
$MaximumHistoryCount = 20000

<# 
.NOTICE Initialize Oh My Posh theme engine
.DEV Configures shell prompt with robbyrussell theme
#>
try {
    oh-my-posh init pwsh | Invoke-Expression
    & ([ScriptBlock]::Create((oh-my-posh init pwsh --config "$env:POSH_THEMES_PATH\robbyrussell.omp.json" --print) -join "`n"))
} catch {
    Write-Warning "Erro ao inicializar Oh My Posh: $($_.Exception.Message)"
}

<# 
.NOTICE Import required PowerShell modules
.DEV Loads modules for git integration, command line improvements, and Docker completion
#>
$modules = @('posh-git', 'PSReadLine', 'Get-ChildItemColor', 'DockerCompletion')
foreach ($module in $modules) {
    try {
        Import-Module $module -ErrorAction Stop
    } catch {
        Write-Warning "Erro ao importar o módulo $($module): $($_.Exception.Message)"
    }
}

<# 
.NOTICE Configure PSReadLine for better command line editing
.DEV Sets up key bindings and prediction features
#>
Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineKeyHandler -Key Tab -Function Complete
Set-PSReadLineKeyHandler -Key Alt+Delete -Function KillWord

Set-PSReadLineOption -HistorySearchCursorMovesToEnd
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
Set-PSReadLineOption -ShowToolTips
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle ListView
Set-PSReadLineOption -EditMode Emacs
Set-PSReadLineOption -Colors @{
    Command            = 'DarkYellow'
    Parameter         = 'DarkGreen'
    InlinePrediction = "$([char]0x1b)[36;7m"
}

<# 
.NOTICE Configure smart quote insertion
.DEV Automatically adds closing quotes and positions cursor between them
#>
Set-PSReadLineKeyHandler -Chord '"',"'" `
                         -BriefDescription SmartInsertQuote `
                         -LongDescription "Insert paired quotes if not already on a quote" `
                         -ScriptBlock {
    param($key, $arg)

    $line = $null
    $cursor = $null
    [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)

    if ($line.Length -gt $cursor -and $line[$cursor] -eq $key.KeyChar) {
        [Microsoft.PowerShell.PSConsoleReadLine]::SetCursorPosition($cursor + 1)
    } else {
        [Microsoft.PowerShell.PSConsoleReadLine]::Insert("$($key.KeyChar)" * 2)
        [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)
        [Microsoft.PowerShell.PSConsoleReadLine]::SetCursorPosition($cursor - 1)
    }
}

<# 
.NOTICE Define custom aliases and navigation functions
.DEV Sets up shortcuts for common commands and directory navigation
#>
Set-Alias which Get-Command
Set-Alias open Invoke-Item
Set-Alias projects infratoken
Set-Alias ls Get-ChildItem
Set-Alias l Get-ChildItem

function ll { Get-ChildItem | Format-Table }
function la { Get-ChildItem | Format-Wide }
function lb { Get-ChildItem | Format-List }

function infox { Set-Location -Path D:\infoxhub }
function home { Set-Location -Path C:\Users\rafae }
function personal { Set-Location -Path D:\personal\projects }

<# 
.NOTICE Configure custom prompt with directory tracking
.DEV Wraps Oh My Posh prompt to include directory saving functionality
#>
$FUNCTION:ORIGINAL_PROMPT = $FUNCTION:prompt

function prompt {
    Save-LastDirectory
    & $FUNCTION:ORIGINAL_PROMPT
}