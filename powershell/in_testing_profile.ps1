<# 
.TITLE PowerShell Profile Configuration
.NOTICE This profile script configures PowerShell environment with custom functions, aliases, and module imports
.DEV Main configuration file for PowerShell that runs on startup
#>

<# 
.TITLE Tab Directory Management Functions
.NOTICE Functions to manage and persist directory paths for Windows Terminal tabs
#>

# Define the path for storing tab directories
$global:TabDirsStorage = "$env:APPDATA\terminal_dirs"
$global:TabDirsJsonFile = Join-Path $global:TabDirsStorage "terminal_tabs.json"
$global:TabsIndexFile = Join-Path $global:TabDirsStorage "tabs_index.txt"

<# 
.NOTICE Gets a unique identifier for the current terminal tab
.RETURN The Windows Terminal session ID or a fallback identifier
#>
function Get-TabIdentifier {
    # Verificar se a variável WT_SESSION existe e não está vazia
    if ([string]::IsNullOrEmpty($env:WT_SESSION)) {
        # Se não tiver WT_SESSION, usar diretório independente de sessão
        return "default"
    }
    return $env:WT_SESSION
}

<# 
.NOTICE Get the index of the current tab within the current terminal session
.RETURN The index of the current tab or 0
#>
function Get-TabIndex {
    # Create directory if it doesn't exist
    if (-not (Test-Path $global:TabDirsStorage)) {
        New-Item -ItemType Directory -Path $global:TabDirsStorage -ErrorAction SilentlyContinue | Out-Null
    }
    
    $tabId = Get-TabIdentifier
    
    # If the tabs index file doesn't exist, create it and write tab ID as index 0
    if (-not (Test-Path $global:TabsIndexFile)) {
        @{ $tabId = 0 } | ConvertTo-Json | Set-Content $global:TabsIndexFile
        return 0
    }
    
    # Try to load the tab index file
    try {
        $tabsIndex = Get-Content $global:TabsIndexFile -Raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
    }
    catch {
        # If the file is corrupted, reinitialize it
        $tabsIndex = @{ $tabId = 0 }
        $tabsIndex | ConvertTo-Json | Set-Content $global:TabsIndexFile
        return 0
    }
    
    # If this tab ID is not in the index file, add it with the next available index
    if (-not $tabsIndex.ContainsKey($tabId)) {
        $nextIndex = 0
        if ($tabsIndex.Values.Count -gt 0) {
            $nextIndex = ($tabsIndex.Values | Measure-Object -Maximum).Maximum + 1
        }
        $tabsIndex[$tabId] = $nextIndex
        $tabsIndex | ConvertTo-Json | Set-Content $global:TabsIndexFile
        return $nextIndex
    }
    
    # Return the existing index for this tab
    return $tabsIndex[$tabId]
}

<# 
.NOTICE Load saved tab directories from the JSON file
.RETURN A hashtable of tab directories or an empty hashtable if none exists
#>
function Get-SavedTabDirectories {
    if (-not (Test-Path $global:TabDirsJsonFile)) {
        return @{}
    }
    
    try {
        $savedDirs = Get-Content $global:TabDirsJsonFile -Raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
        return $savedDirs
    }
    catch {
        # If the file can't be parsed, return an empty hashtable
        return @{}
    }
}

<# 
.NOTICE Saves the current directory path for the active terminal tab
.DEV Updates the JSON file that tracks all tab directories
#>
function Save-TabDirectories {
    # Create directory if it doesn't exist
    if (-not (Test-Path $global:TabDirsStorage)) {
        New-Item -ItemType Directory -Path $global:TabDirsStorage -ErrorAction Stop | Out-Null
    }
    
    $tabIndex = Get-TabIndex
    $currentPath = (Get-Location).Path
    
    # Don't save if the path is the user profile
    if ($currentPath -eq $env:USERPROFILE) {
        return
    }
    
    # Load existing saved directories
    $savedDirs = Get-SavedTabDirectories
    
    # Update the directory for the current tab index
    $savedDirs["$tabIndex"] = $currentPath
    
    # Also save to the default entry to ensure at least one restoration
    $savedDirs["default"] = $currentPath
    
    # Save the updated directory collection back to the JSON file
    $savedDirs | ConvertTo-Json | Set-Content $global:TabDirsJsonFile
    
    # Ensure the file is written immediately
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}

<# 
.NOTICE Restores the directory for the current terminal tab
.DEV Reads the saved directory paths and changes to it if it exists
#>
function Set-LocationFromTabDirectories {
    # Create directory if it doesn't exist
    if (-not (Test-Path $global:TabDirsStorage)) {
        New-Item -ItemType Directory -Path $global:TabDirsStorage -ErrorAction SilentlyContinue | Out-Null
        return # Nothing to restore if we just created the directory
    }
    
    # Get the index for this tab
    $tabIndex = Get-TabIndex
    
    # Load saved directories
    $savedDirs = Get-SavedTabDirectories
    
    # Try to get the directory for this tab index
    $targetDir = $null
    
    # First try: Get directory for the current tab index
    if ($savedDirs.ContainsKey("$tabIndex")) {
        $targetDir = $savedDirs["$tabIndex"]
    }
    # Second try: Get default directory
    elseif ($savedDirs.ContainsKey("default")) {
        $targetDir = $savedDirs["default"]
    }
    # Third try: Get any available directory
    elseif ($savedDirs.Count -gt 0) {
        $targetDir = $savedDirs.Values | Select-Object -First 1
    }
    
    # If we found a directory and it exists, navigate to it
    if ($targetDir -and (Test-Path $targetDir -ErrorAction SilentlyContinue)) {
        Set-Location $targetDir -ErrorAction SilentlyContinue
    }
}

<# 
.NOTICE Removes directory tracking files older than 7 days
.DEV Helps maintain clean storage by removing unused tracking files
#>
function Clear-OldDirectoryFiles {
    $baseDir = $global:TabDirsStorage
    if (Test-Path $baseDir) {
        # Clear individual lastdir files older than 7 days
        Get-ChildItem $baseDir -Filter "lastdir_*.txt" | Where-Object {
            $_.LastWriteTime -lt (Get-Date).AddDays(-7)
        } | ForEach-Object {
            Remove-Item $_.FullName -Force -ErrorAction SilentlyContinue
        }
        
        # Check if the JSON file is older than 30 days, and if so reset it
        if (Test-Path $global:TabDirsJsonFile) {
            $fileInfo = Get-Item $global:TabDirsJsonFile
            if ($fileInfo.LastWriteTime -lt (Get-Date).AddDays(-30)) {
                Remove-Item $global:TabDirsJsonFile -Force -ErrorAction SilentlyContinue
                Remove-Item $global:TabsIndexFile -Force -ErrorAction SilentlyContinue
            }
        }
    }
}

# Initialize directory tracking on profile load
Clear-OldDirectoryFiles
Set-LocationFromTabDirectories

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
$modules = @('posh-git', 'Get-ChildItemColor', 'DockerCompletion')
foreach ($module in $modules) {
    try {
        Import-Module $module -ErrorAction Stop
    } catch {
        Write-Warning "Erro ao importar o módulo $($module): $($_.Exception.Message)"
    }
}

# PSReadLine is loaded separately since it's often already loaded in PowerShell 7
if (-not (Get-Module -Name PSReadLine)) {
    try {
        Import-Module PSReadLine -ErrorAction Stop
    } catch {
        Write-Warning "Erro ao importar o módulo PSReadLine: $($_.Exception.Message)"
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
function activate { & .\venv\Scripts\activate.ps1 }

function infox { Set-Location -Path D:\infoxhub }

function home { Set-Location -Path C:\Users\rafae }
function personal { Set-Location -Path D:\personal\projects }

<# 
.NOTICE Diagnostic function to validate terminal state
.DEV Outputs diagnostic information about Windows Terminal session
#>
function Test-TerminalState {
    [CmdletBinding()]
    param()
    
    $diagnosticInfo = [ordered]@{
        "PowerShell Version" = $PSVersionTable.PSVersion.ToString()
        "Windows Terminal Session" = if ($env:WT_SESSION) { "Disponível: $env:WT_SESSION" } else { "Não disponível" }
        "Process ID" = $PID
        "Current Working Directory" = (Get-Location).Path
        "Tab Index" = Get-TabIndex
        "User Profile" = $env:USERPROFILE
        "AppData Path" = $env:APPDATA
    }
    
    $diagnosticInfo["Storage Directory"] = if (Test-Path $global:TabDirsStorage) { "Existe: $global:TabDirsStorage" } else { "Não existe: $global:TabDirsStorage" }
    $diagnosticInfo["JSON Tabs File"] = if (Test-Path $global:TabDirsJsonFile) { "Existe: $global:TabDirsJsonFile" } else { "Não existe: $global:TabDirsJsonFile" }
    $diagnosticInfo["Tabs Index File"] = if (Test-Path $global:TabsIndexFile) { "Existe: $global:TabsIndexFile" } else { "Não existe: $global:TabsIndexFile" }
    
    # Load and display saved tab directories
    if (Test-Path $global:TabDirsJsonFile) {
        try {
            $savedDirs = Get-Content $global:TabDirsJsonFile -Raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
            $diagnosticInfo["Saved Tabs Count"] = $savedDirs.Count
            
            $i = 0
            foreach ($key in $savedDirs.Keys) {
                $diagnosticInfo["Tab $key Directory"] = $savedDirs[$key]
                $i++
                if ($i -ge 5) {
                    $diagnosticInfo["..."] = "(Mais abas não mostradas)"
                    break
                }
            }
        } catch {
            $diagnosticInfo["Saved Directories"] = "Erro ao ler: $($_.Exception.Message)"
        }
    }
    
    Write-Host "`n🔍 Diagnóstico de Sessão do Terminal" -ForegroundColor Cyan
    foreach ($key in $diagnosticInfo.Keys) {
        Write-Host "$key : " -NoNewline -ForegroundColor Yellow
        Write-Host "$($diagnosticInfo[$key])" -ForegroundColor White
    }
    Write-Host ""
}

# Alias para diagnóstico rápido
Set-Alias wtdiag Test-TerminalState

<# 
.NOTICE Lists all saved tab directories
.DEV Outputs a list of all saved tab directories from the JSON file
#>
function Get-TabDirectories {
    [CmdletBinding()]
    param()
    
    if (-not (Test-Path $global:TabDirsJsonFile)) {
        Write-Host "Nenhum diretório de aba salvo ainda." -ForegroundColor Yellow
        return
    }
    
    try {
        $savedDirs = Get-Content $global:TabDirsJsonFile -Raw | ConvertFrom-Json -AsHashtable -ErrorAction Stop
        
        Write-Host "`n📂 Diretórios de Abas Salvos" -ForegroundColor Cyan
        Write-Host "Total de abas salvas: $($savedDirs.Count)" -ForegroundColor White
        
        foreach ($key in $savedDirs.Keys) {
            $dir = $savedDirs[$key]
            $exists = Test-Path $dir -ErrorAction SilentlyContinue
            $color = if ($exists) { "Green" } else { "Red" }
            
            Write-Host "Aba $key : " -NoNewline -ForegroundColor Yellow
            Write-Host "$dir" -ForegroundColor $color
        }
        Write-Host ""
    } catch {
        Write-Host "Erro ao ler os diretórios salvos: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Alias para listar diretórios de abas
Set-Alias tabs Get-TabDirectories

<# 
.NOTICE Configure custom prompt with directory tracking
.DEV Wraps Oh My Posh prompt to include directory saving functionality
#>
$FUNCTION:ORIGINAL_PROMPT = $FUNCTION:prompt

function prompt {
    # Salvar o diretório atual a cada prompt
    Save-TabDirectories
    # Chamar a função de prompt original
    & $FUNCTION:ORIGINAL_PROMPT
}

# Register event to save directory when PowerShell exits
try {
    # Remover registro existente para evitar duplicatas
    Get-EventSubscriber -SourceIdentifier ([System.Management.Automation.PsEngineEvent]::Exiting) -ErrorAction SilentlyContinue | 
        Unregister-Event -ErrorAction SilentlyContinue
        
    # Registrar evento para salvar diretório ao sair
    Register-EngineEvent -SourceIdentifier ([System.Management.Automation.PsEngineEvent]::Exiting) -Action {
        try {
            Save-TabDirectories
        } catch {}
    } -SupportEvent -ErrorAction SilentlyContinue
} catch {
    # Silenciosamente falhar se não conseguir registrar o evento
}