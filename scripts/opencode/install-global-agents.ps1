param(
    [switch]$DryRun,
    [string]$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "../..")).Path,
    [string]$GlobalConfigRoot = (Join-Path $HOME ".config/opencode")
)

$ErrorActionPreference = "Stop"

$gitMarker = Join-Path $RepositoryRoot ".git"
if (Test-Path $gitMarker -PathType Leaf) {
    throw "Refusing to link agents from a Git worktree. Run this script from the stable checkout after integration."
}

$sourceDirectory = Join-Path $RepositoryRoot ".opencode/agents"
$targetDirectory = Join-Path $GlobalConfigRoot "agents"
$globalConfig = Join-Path $GlobalConfigRoot "opencode.json"
$managedAgents = @(
    "planner_ai",
    "architect",
    "explorer",
    "coder_a",
    "coder_b",
    "coder_strong_a",
    "reviewer",
    "doc_curator",
    "prompt_generator",
    "developer_superuser"
)

if (-not (Test-Path $sourceDirectory -PathType Container)) {
    throw "Agent source directory does not exist: $sourceDirectory"
}

if (Test-Path $globalConfig -PathType Leaf) {
    $config = Get-Content $globalConfig -Raw | ConvertFrom-Json
    if ($null -ne $config.agent) {
        $collisions = @($managedAgents | Where-Object { $config.agent.PSObject.Properties.Name -contains $_ })
        if ($collisions.Count -gt 0) {
            throw "Inline agent definitions still collide with managed profiles: $($collisions -join ', '). Remove them only after the explicit Developer gate and a config backup."
        }
    }
}

if (-not $DryRun -and -not (Test-Path $targetDirectory -PathType Container)) {
    New-Item -ItemType Directory -Path $targetDirectory | Out-Null
}

foreach ($agent in $managedAgents) {
    $source = Join-Path $sourceDirectory "$agent.md"
    $target = Join-Path $targetDirectory "$agent.md"

    if (-not (Test-Path $source -PathType Leaf)) {
        throw "Missing managed agent source: $source"
    }

    if (Test-Path $target) {
        $item = Get-Item $target -Force
        $resolvedTarget = @($item.Target)[0]
        if ($item.LinkType -ne "SymbolicLink" -or $resolvedTarget -ne $source) {
            throw "Refusing to replace unmanaged or mismatched destination: $target"
        }
        Write-Output "OK $target -> $source"
        continue
    }

    if ($DryRun) {
        Write-Output "WOULD_LINK $target -> $source"
        continue
    }

    try {
        New-Item -ItemType SymbolicLink -Path $target -Target $source | Out-Null
    }
    catch {
        throw "Could not create $target. Enable Windows Developer Mode or run with symlink privileges. $($_.Exception.Message)"
    }

    Write-Output "LINKED $target -> $source"
}
