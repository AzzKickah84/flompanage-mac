# Publish Flompanage Mac DMG files to GitHub Releases.
# Usage: .\publish-github-release-mac.ps1 [-Notes "Release notes"] [-AssetPath "path\to\Flompanage-Mac-1.0.1-AppleSilicon.dmg"]
param(
    [string]$Notes = "",
    [string]$AssetPath = ""
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot
$PackageJson = Join-Path $Root "..\ui\package.json"
$Version = (Get-Content $PackageJson -Raw | ConvertFrom-Json).version
if (-not $Version) {
    throw "Kan versie niet lezen uit $PackageJson"
}
$Dist = Join-Path $Root "dist"
$Channel = Get-Content (Join-Path $Root "Flompanage.Mac\update-channel.json") -Raw | ConvertFrom-Json
$Repo = $Channel.githubRepo

if (-not $Repo) {
    throw "update-channel.json is missing githubRepo"
}

if ($AssetPath) {
    $Assets = @($AssetPath)
} else {
    $Assets = @(
        Get-ChildItem -Path $Dist -Filter "Flompanage-Mac-$Version-*.dmg" -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty FullName
    )
}

if (-not $Assets -or $Assets.Count -eq 0) {
    throw "No DMG files found in $Dist for version $Version. Run build-mac.sh on macOS first."
}

$Tag = "v$Version"
$Title = "Flompanage Mac $Version"
if (-not $Notes) {
    $Notes = @(
        "Flompanage $Version voor macOS",
        "",
        "- Zelfde beheerinterface als de Windows-versie",
        "- Apple Silicon en Intel DMG beschikbaar",
        "- Sleep Flompanage naar Applications om te installeren"
    ) -join "`n"
}

$existing = $false
try {
    gh release view $Tag --repo $Repo *> $null
    if ($LASTEXITCODE -eq 0) { $existing = $true }
} catch {
    $existing = $false
}

if ($existing) {
    Write-Host "Release $Tag exists - uploading DMG assets..."
    foreach ($asset in $Assets) {
        gh release upload $Tag $asset --repo $Repo --clobber
    }
} else {
    Write-Host "Creating release $Tag on $Repo..."
    gh release create $Tag @Assets --repo $Repo --title $Title --notes $Notes --latest
}

if ($LASTEXITCODE -ne 0) { throw "GitHub release failed" }

Write-Host ""
Write-Host ("Published: https://github.com/{0}/releases/tag/{1}" -f $Repo, $Tag) -ForegroundColor Green
