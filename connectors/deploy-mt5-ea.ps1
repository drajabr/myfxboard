[CmdletBinding()]
param(
    [Parameter()]
    [string]$SourceMq5,

    [Parameter()]
    [switch]$NoPrompt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
$scriptFilePath = if ($PSCommandPath) { $PSCommandPath } else { $MyInvocation.PSCommandPath }

if (-not $SourceMq5) {
    $scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Path $MyInvocation.MyCommand.Path -Parent }
    $SourceMq5 = Join-Path $scriptRoot "smaGUY Trade Manger-myfxboard.mq5"
}

function Get-TerminalDataRoots {
    $roots = @(
        (Join-Path $env:APPDATA "MetaQuotes\Terminal"),
        (Join-Path $env:LOCALAPPDATA "MetaQuotes\Terminal")
    ) | Where-Object { $_ -and (Test-Path $_) }

    $hashDirs = foreach ($root in $roots) {
        Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue
    }

    foreach ($dir in $hashDirs) {
        $expertsDir = Join-Path $dir.FullName "MQL5\Experts"
        if (Test-Path $expertsDir) {
            $originFile = Join-Path $dir.FullName "origin.txt"
            $originPath = $null
            if (Test-Path $originFile) {
                $firstLine = (Get-Content -Path $originFile -ErrorAction SilentlyContinue | Select-Object -First 1)
                if ($firstLine) {
                    $originPath = $firstLine.Trim()
                }
            }

            [PSCustomObject]@{
                DataRoot   = $dir.FullName
                ExpertsDir = $expertsDir
                OriginPath = $originPath
            }
        }
    }
}

function Get-PortableExpertsFromRunningTerminals {
    $procList = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue

    foreach ($p in $procList) {
        $processPath = $null
        try {
            $processPath = $p.Path
        } catch {
            $processPath = $null
        }

        if ([string]::IsNullOrWhiteSpace($processPath)) {
            continue
        }

        $installRoot = Split-Path -Path $processPath -Parent
        $portableExperts = Join-Path $installRoot "MQL5\Experts"
        if (Test-Path $portableExperts) {
            [PSCustomObject]@{
                DataRoot   = $installRoot
                ExpertsDir = $portableExperts
                OriginPath = $installRoot
            }
        }
    }
}

function Resolve-MetaEditorPath {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Instances
    )

    $candidates = New-Object System.Collections.Generic.List[string]

    foreach ($inst in $Instances) {
        if ($inst.OriginPath) {
            $candidate = Join-Path $inst.OriginPath "metaeditor64.exe"
            if (Test-Path $candidate) {
                [void]$candidates.Add($candidate)
            }
        }

        if ($inst.DataRoot) {
            $candidate = Join-Path $inst.DataRoot "metaeditor64.exe"
            if (Test-Path $candidate) {
                [void]$candidates.Add($candidate)
            }
        }
    }

    $running = Get-Process -Name "terminal64" -ErrorAction SilentlyContinue
    foreach ($p in $running) {
        $runningPath = $null
        try {
            $runningPath = $p.Path
        } catch {
            $runningPath = $null
        }

        if ([string]::IsNullOrWhiteSpace($runningPath)) {
            continue
        }

        $candidate = Join-Path (Split-Path -Path $runningPath -Parent) "metaeditor64.exe"
        if (Test-Path $candidate) {
            [void]$candidates.Add($candidate)
        }
    }

    $commonRoots = @(
        "$env:ProgramFiles",
        "${env:ProgramFiles(x86)}",
        "$env:LOCALAPPDATA"
    ) | Where-Object { $_ -and (Test-Path $_) }

    foreach ($root in $commonRoots) {
        $found = Get-ChildItem -Path $root -Filter "metaeditor64.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($found) {
            [void]$candidates.Add($found.FullName)
        }
    }

    $unique = $candidates | Select-Object -Unique
    return ($unique | Select-Object -First 1)
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Build-RelaunchArguments {
    $escapedScript = $scriptFilePath.Replace("'", "''")
    $command = "& '$escapedScript' -NoPrompt"

    if ($SourceMq5) {
        $escapedSource = $SourceMq5.Replace("'", "''")
        $command += " -SourceMq5 '$escapedSource'"
    }

    $args = @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $command)
    return $args
}

if (-not (Test-Path $SourceMq5)) {
    throw "Source MQ5 not found: $SourceMq5"
}
$resolvedSource = (Resolve-Path -Path $SourceMq5).Path

$allInstances = @(
    Get-TerminalDataRoots
    Get-PortableExpertsFromRunningTerminals
) | Group-Object ExpertsDir | ForEach-Object { $_.Group | Select-Object -First 1 }

if (-not $allInstances -or $allInstances.Count -eq 0) {
    throw "No MT5 instances found. Open MT5 once or check your MetaQuotes Terminal folders."
}

$metaEditorPath = Resolve-MetaEditorPath -Instances $allInstances
if (-not $metaEditorPath) {
    throw "Could not find metaeditor64.exe. Install MT5 terminal with MetaEditor on this machine."
}

$targets = foreach ($inst in $allInstances) {
    $destExperts = $inst.ExpertsDir

    $isProgramFilesTarget = (
        ($env:ProgramFiles -and $destExperts.StartsWith($env:ProgramFiles, [System.StringComparison]::OrdinalIgnoreCase)) -or
        (${env:ProgramFiles(x86)} -and $destExperts.StartsWith(${env:ProgramFiles(x86)}, [System.StringComparison]::OrdinalIgnoreCase))
    )

    [PSCustomObject]@{
        DataRoot    = $inst.DataRoot
        ExpertsPath = $destExperts
        IsProgramFiles = $isProgramFilesTarget
    }
}

Write-Host ("Discovered {0} MT5 instance(s)" -f $targets.Count)
$programFilesTargets = @($targets | Where-Object { $_.IsProgramFiles })
if ($programFilesTargets.Count -gt 0) {
    Write-Host ("Program Files targets: {0}" -f $programFilesTargets.Count)
}

if (-not $NoPrompt) {
    $proceed = Read-Host "Proceed with install/deploy to all discovered terminals? (Y/N)"
    if ($proceed -notmatch '^(?i:y|yes)$') {
        Write-Host "Cancelled by user."
        exit 0
    }
}

$isAdmin = Test-IsAdministrator
if (-not $isAdmin) {
    if (-not $NoPrompt) {
        $elevate = Read-Host "Not running as Administrator. Relaunch as Administrator now? (Y/N)"
        if ($elevate -match '^(?i:y|yes)$') {
            $elevatedArgs = Build-RelaunchArguments
            Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList $elevatedArgs | Out-Null
            Write-Host "Relaunched in elevated PowerShell."
            exit 0
        }
    }
}

$sourceBaseName = [System.IO.Path]::GetFileNameWithoutExtension($resolvedSource)
$compileStamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
$compileWorkDir = Join-Path $env:TEMP ("mt5_compile_stage_{0}" -f $compileStamp)
$stagedSource = Join-Path $compileWorkDir "connector_build.mq5"
$compiledEx5 = Join-Path $compileWorkDir "connector_build.ex5"
$compileLog = Join-Path $compileWorkDir "compile.log"

New-Item -Path $compileWorkDir -ItemType Directory -Force | Out-Null
Copy-Item -Path $resolvedSource -Destination $stagedSource -Force

Write-Host "Using compiler: $metaEditorPath"
Write-Host "Compiling: $resolvedSource"

$compileStart = Get-Date
if (Test-Path $compiledEx5) {
    Remove-Item -Path $compiledEx5 -Force -ErrorAction SilentlyContinue
}

$argCompile = "/compile:$stagedSource"
$argLog = "/log:$compileLog"
$argList = @($argCompile, $argLog)
$proc = Start-Process -FilePath $metaEditorPath -ArgumentList $argList -Wait -PassThru

if (-not (Test-Path $compiledEx5)) {
    $logHint = if (Test-Path $compileLog) { $compileLog } else { "(log file not generated by MetaEditor)" }
    throw "Compile failed: EX5 output not found. ExitCode=$($proc.ExitCode). See log: $logHint"
}

$compiledInfo = Get-Item -Path $compiledEx5
if ($compiledInfo.LastWriteTime -lt $compileStart.AddSeconds(-2)) {
    $logHint = if (Test-Path $compileLog) { $compileLog } else { "(log file not generated by MetaEditor)" }
    throw "Compile may have failed: EX5 timestamp not updated. ExitCode=$($proc.ExitCode). See log: $logHint"
}

$destinationEx5Name = "$sourceBaseName.ex5"
$copiedCount = 0
$failedTargets = New-Object System.Collections.Generic.List[string]

foreach ($t in $targets) {
    Write-Host "Target: $($t.ExpertsPath)"

    if (-not (Test-Path $t.ExpertsPath)) {
        New-Item -Path $t.ExpertsPath -ItemType Directory -Force | Out-Null
    }

    try {
        Copy-Item -Path $compiledEx5 -Destination (Join-Path $t.ExpertsPath $destinationEx5Name) -Force

        $copiedCount++
    } catch {
        $failedTargets.Add(("{0} :: {1}" -f $t.ExpertsPath, $_.Exception.Message)) | Out-Null
        Write-Warning ("Failed target: {0}" -f $t.ExpertsPath)
    }
}

Write-Host ("Deployment complete. Success={0}, Failed={1}" -f $copiedCount, $failedTargets.Count)
Write-Host "Compile log: $compileLog"

if ($failedTargets.Count -gt 0) {
    Write-Warning "Some targets failed (usually due to permissions if not elevated)."
    foreach ($f in $failedTargets) {
        Write-Warning $f
    }
}

if ($copiedCount -eq 0) {
    throw "Deployment failed for all targets. Rerun and choose Administrator when prompted."
}
