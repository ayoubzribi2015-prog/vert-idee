<#
.SYNOPSIS
  Builds the frozen local ADEME Base Empreinte / Base Carbone V23.11 index from
  the official CSV export. This index is the single source of truth: no online
  fallback and no mixed-version lookup are used at runtime.

.DESCRIPTION
  The official CSV is CP1252 encoded, semicolon delimited and uses French decimal
  commas. Only non-archived "Elément" rows with a numeric total are kept. The
  source CSV is never modified; its SHA256 is recorded in the generated JSON.

  Usage:
    powershell -ExecutionPolicy Bypass -File scripts/generate-base-carbone-index.ps1 `
      -Csv "C:\path\Base_Carbone_V23.11.csv"
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $Csv,
  [string] $Out = '',
  [string] $Version = 'V23.11'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName Microsoft.VisualBasic

if (-not $Out) {
  $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
  if (-not $scriptDir) { $scriptDir = (Get-Location).Path }
  $Out = Join-Path $scriptDir '..\src\data\baseCarboneV2311.generated.json'
}

if (-not (Test-Path -LiteralPath $Csv -PathType Leaf)) { throw "CSV introuvable : $Csv" }

# The CSV is CP1252, not UTF-8. Decoding it as UTF-8 silently destroys accents.
$reader = New-Object System.IO.StreamReader($Csv, [System.Text.Encoding]::GetEncoding(1252), $true)
$parser = New-Object Microsoft.VisualBasic.FileIO.TextFieldParser($reader)
$parser.TextFieldType = [Microsoft.VisualBasic.FileIO.FieldType]::Delimited
$parser.Delimiters = @(';')
$parser.HasFieldsEnclosedInQuotes = $true

$headers = $parser.ReadFields()
$expected = 67
if ($headers.Count -ne $expected) {
  throw "Structure inattendue : $($headers.Count) colonnes (attendu $expected)"
}

$fr = [System.Globalization.CultureInfo]::GetCultureInfo('fr-FR')
$rows = New-Object System.Collections.Generic.List[object]
$skipped = 0

while (-not $parser.EndOfData) {
  $r = $parser.ReadFields()
  if ($r.Count -ne $expected) { $skipped++; continue }

  # Keep only published emission factors, never archived ones.
  if ($r[4] -notlike 'Valide*') { continue }
  # ASCII-only pattern: PowerShell 5.1 reads BOM-less UTF-8 scripts as ANSI.
  if ($r[0] -notlike 'El*') { continue }

  $value = 0.0
  if (-not [double]::TryParse($r[50], [System.Globalization.NumberStyles]::Float, $fr, [ref]$value)) { continue }
  if ([double]::IsNaN($value) -or [double]::IsInfinity($value)) { continue }

  $uncertainty = $null
  $tmp = 0.0
  if ([double]::TryParse($r[33], [System.Globalization.NumberStyles]::Float, $fr, [ref]$tmp)) {
    $uncertainty = [int][math]::Round($tmp)
  }

  # Compact tuple layout (documented in src/data/baseCarboneIndex.ts):
  # [id, name, attribute, category, unit, value, geo, subGeo, uncertainty, program, validity, source]
  $rows.Add(@(
    [string]$r[1], [string]$r[5], [string]$r[8], [string]$r[14],
    [string]$r[18], [double]$value, [string]$r[26], [string]$r[27],
    $uncertainty, [string]$r[23], [string]$r[32], [string]$r[25]
  ))
}
$parser.Close()
$reader.Close()

$sha = (Get-FileHash -LiteralPath $Csv -Algorithm SHA256).Hash.ToLowerInvariant()
$payload = [ordered]@{
  version      = $Version
  sourceFile   = [System.IO.Path]::GetFileName($Csv)
  sourceSha256 = $sha
  generatedAt  = (Get-Date).ToUniversalTime().ToString('yyyy-MM-ddTHH:mm:ssZ')
  encoding     = 'CP1252'
  delimiter    = ';'
  columns      = @(
    'id','name','attribute','category','unit','value','geo',
    'subGeo','uncertainty','program','validity','source'
  )
  skippedRows  = $skipped
  count        = $rows.Count
  factors      = $rows.ToArray()
}

$json = $payload | ConvertTo-Json -Depth 6 -Compress
$dir = Split-Path -Parent $Out
New-Item -ItemType Directory -Force -Path $dir | Out-Null
[System.IO.File]::WriteAllText($Out, $json, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "Index Base Carbone $Version ecrit : $Out"
Write-Host "Facteurs retenus : $($rows.Count) (lignes ignorees : $skipped)"
Write-Host "SHA256 source : $sha"
