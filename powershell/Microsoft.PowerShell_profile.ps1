$env:PATH += ";C:\Users\Rafael\scoop\apps\git\current\usr\bin"

$__githubToken = [Environment]::GetEnvironmentVariable('GITHUB_TOKEN', 'User')
if ($__githubToken) {
    $env:GITHUB_TOKEN = $__githubToken
    $__ghToken = [Environment]::GetEnvironmentVariable('GH_TOKEN', 'User')
    $env:GH_TOKEN = if ($__ghToken) { $__ghToken } else { $__githubToken }
}
Remove-Variable __githubToken, __ghToken -ErrorAction SilentlyContinue

$MaximumHistoryCount = 20000

$script:__PSGalleryReady = $false
function Initialize-PSGalleryOnce {
    if ($script:__PSGalleryReady) { return }
    try {
        if ([Net.ServicePointManager]::SecurityProtocol -notmatch 'Tls12') {
            [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
        }
        if (-not (Get-PackageProvider -Name NuGet -ListAvailable -ErrorAction SilentlyContinue)) {
            Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Scope CurrentUser -Force -ErrorAction Stop | Out-Null
        }
        Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
        $script:__PSGalleryReady = $true
    } catch {
        Write-Warning "PSGallery bootstrap failed: $($_.Exception.Message)"
    }
}

function Install-RequiredModule {
    param([Parameter(Mandatory)][string]$Name)
    if (Get-Module -ListAvailable -Name $Name -ErrorAction SilentlyContinue) { return $true }
    Initialize-PSGalleryOnce
    $installParams = @{
        Name        = $Name
        Scope       = 'CurrentUser'
        Force       = $true
        ErrorAction = 'Stop'
    }
    if ($PSVersionTable.PSVersion.Major -ge 6) {
        $installParams.AcceptLicense = $true
    }
    try {
        Write-Host "Installing missing PowerShell module '$Name'..." -ForegroundColor Cyan
        Install-Module @installParams
        return $true
    } catch {
        Write-Warning "Auto-install of module '$Name' failed: $($_.Exception.Message)"
        return $false
    }
}

function Install-RequiredWingetApp {
    param(
        [Parameter(Mandatory)][string]$Id,
        [Parameter(Mandatory)][string]$CommandProbe
    )
    if (Get-Command $CommandProbe -ErrorAction SilentlyContinue) { return $true }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Write-Warning "winget not available; cannot auto-install '$Id'."
        return $false
    }
    try {
        Write-Host "Installing '$Id' via winget..." -ForegroundColor Cyan
        winget install --id $Id -e --silent --accept-package-agreements --accept-source-agreements -s winget | Out-Null
        $env:Path = @(
            $env:Path,
            [System.Environment]::GetEnvironmentVariable('Path','Machine'),
            [System.Environment]::GetEnvironmentVariable('Path','User')
        ) -join ';'
        return [bool](Get-Command $CommandProbe -ErrorAction SilentlyContinue)
    } catch {
        Write-Warning "winget install of '$Id' failed: $($_.Exception.Message)"
        return $false
    }
}

if (Install-RequiredWingetApp -Id 'JanDeDobbeleer.OhMyPosh' -CommandProbe 'oh-my-posh') {
    $themeFile = Join-Path $env:USERPROFILE 'Documents\PowerShell\themes\robbyrussell.omp.json'
    try {
        if (Test-Path $themeFile) {
            & ([ScriptBlock]::Create((oh-my-posh init pwsh --config $themeFile --print) -join "`n"))
        } else {
            & ([ScriptBlock]::Create((oh-my-posh init pwsh --print) -join "`n"))
        }
    } catch {
        Write-Warning "Oh My Posh init failed: $($_.Exception.Message)"
    }
}

foreach ($module in @('posh-git', 'Get-ChildItemColor', 'DockerCompletion')) {
    if (Install-RequiredModule -Name $module) {
        try {
            Import-Module $module -ErrorAction Stop
        } catch {
            Write-Warning "Failed to import module $($module): $($_.Exception.Message)"
        }
    }
}

if (-not (Get-Module -Name PSReadLine)) {
    try {
        Import-Module PSReadLine -ErrorAction Stop
    } catch {
        Write-Warning "Failed to import module PSReadLine: $($_.Exception.Message)"
    }
}

Set-PSReadLineOption -EditMode Emacs

Set-PSReadLineKeyHandler -Key Tab -Function MenuComplete
Set-PSReadLineKeyHandler -Key Tab -Function Complete
Set-PSReadLineKeyHandler -Key Alt+Delete -Function KillWord

Set-PSReadLineOption -HistorySearchCursorMovesToEnd
Set-PSReadLineKeyHandler -Key UpArrow -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
Set-PSReadLineOption -ShowToolTips
try { Set-PSReadLineOption -PredictionSource History -ErrorAction Stop } catch {}
try { Set-PSReadLineOption -PredictionViewStyle ListView -ErrorAction Stop } catch {}
Set-PSReadLineKeyHandler -Chord 'Ctrl+v' -Function Paste

$baseColors = @{
    Command   = 'DarkYellow'
    Parameter = 'DarkGreen'
}
try {
    Set-PSReadLineOption -Colors ($baseColors + @{ InlinePrediction = "$([char]0x1b)[36;7m" }) -ErrorAction Stop
} catch {
    Set-PSReadLineOption -Colors $baseColors
}

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

Set-Alias -Name which -Value Get-Command   -Force
Set-Alias -Name open  -Value Invoke-Item   -Force
Set-Alias -Name ls    -Value Get-ChildItem -Force -Option AllScope
Set-Alias -Name l     -Value Get-ChildItem -Force

function ll { Get-ChildItem | Format-Table }
function la { Get-ChildItem | Format-Wide }
function lb { Get-ChildItem | Format-List }

function home     { Set-Location -Path $env:USERPROFILE }
function personal { Set-Location -Path 'D:\Personal' }
function ambar    { Set-Location -Path 'D:\Projects' }
function activate { & .\venv\Scripts\activate.ps1 }

# Windows Terminal: report CWD so duplicateTab / splitMode:duplicate inherit path.
# Without OSC 9;9, WT falls back to profile startingDirectory (%USERPROFILE%).
# https://learn.microsoft.com/windows/terminal/tutorials/new-tab-same-directory
if ($env:WT_SESSION) {
    $script:__DotfilesBasePrompt = $function:prompt
    function global:prompt {
        $result = & $script:__DotfilesBasePrompt
        $loc = $executionContext.SessionState.Path.CurrentLocation
        if ($loc.Provider.Name -eq 'FileSystem') {
            $result += "$([char]27)]9;9;`"$($loc.ProviderPath)`"$([char]27)\"
        }
        $result
    }
}
