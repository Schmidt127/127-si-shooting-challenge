# Deploy DEV upload Lambda (code + optional config)
param(
    [string]$FunctionName = "127si-upload-asset-dev",
    [string]$ExistingRoleArn = "",
    [switch]$SkipIam,
    [switch]$CodeOnly,
    [switch]$SkipEnvUpdate
)
$ErrorActionPreference = "Stop"

$RoleName = "127si-dev-shooting-challenge-asset-upload-role"
$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-2" }
$ZipPath = Join-Path $PSScriptRoot "dist\lambda-upload-asset.zip"

# Load Airtable token from tools/airtable/.env for Lambda env (not committed)
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$EnvFile = Join-Path $RepoRoot "tools\airtable\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            if (-not [string]::IsNullOrEmpty($name)) { Set-Item -Path "env:$name" -Value $value }
        }
    }
}
$WebEnv = Join-Path $RepoRoot "web\.env.local"
if (Test-Path $WebEnv) {
    Get-Content $WebEnv | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"')
            if ($name -match 'AIRTABLE') { Set-Item -Path "env:$name" -Value $value }
        }
    }
}

$AirtableToken = if ($env:AIRTABLE_TOKEN) { $env:AIRTABLE_TOKEN } else { $env:AIRTABLE_API_TOKEN }
if (-not $AirtableToken) { throw "Missing AIRTABLE_TOKEN in tools/airtable/.env" }

Write-Host "Building zip..."
$DistDir = Join-Path $PSScriptRoot "dist\package"
if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Path $DistDir | Out-Null
Copy-Item (Join-Path $PSScriptRoot "handler.py") $DistDir
Copy-Item -Recurse (Join-Path $PSScriptRoot "upload_core") $DistDir
if (-not (Test-Path (Join-Path $PSScriptRoot "dist"))) { New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot "dist") | Out-Null }
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $ZipPath

$TrustPolicy = @'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
'@

$RoleArn = if ($ExistingRoleArn) { $ExistingRoleArn } else { $null }
if (-not $RoleArn -and -not $SkipIam) {
    try {
        $RoleArn = (aws iam get-role --role-name $RoleName --query Role.Arn --output text 2>$null)
    } catch {}
}

if (-not $RoleArn -and -not $SkipIam) {
    Write-Host "Creating IAM role $RoleName..."
    try {
        $RoleArn = aws iam create-role --role-name $RoleName --assume-role-policy-document $TrustPolicy --query Role.Arn --output text
        Start-Sleep -Seconds 10
        aws iam put-role-policy --role-name $RoleName --policy-name "${RoleName}-inline" --policy-document file://$((Join-Path $PSScriptRoot "iam-policy-dev.json"))
    } catch {
        Write-Host "IAM role create/update failed (need admin IAM). Create role manually and re-run:"
        Write-Host "  .\deploy.ps1 -ExistingRoleArn arn:aws:iam::ACCOUNT:role/$RoleName"
        throw
    }
}

if (-not $RoleArn) {
    throw "Missing -ExistingRoleArn. Create IAM role $RoleName with iam-policy-dev.json, then deploy with -ExistingRoleArn."
}

$EnvVars = @{
    AIRTABLE_BASE_ID = "appTetnuCZlCZdTCT"
    AIRTABLE_API_TOKEN = $AirtableToken
    AIRTABLE_TOKEN = $AirtableToken
    S3_BUCKET = "shooting-challenge-assets"
    ENVIRONMENT = "DEV"
    ALLOW_ROUTE_KEYS = "video_feedback"
    SEASON_SLUG = "2026-2027"
    CHALLENGE_SLUG = "shooting-challenge"
}
if ($env:UPLOAD_WEBHOOK_SECRET) {
    $EnvVars["UPLOAD_WEBHOOK_SECRET"] = $env:UPLOAD_WEBHOOK_SECRET
} else {
    Write-Warning "UPLOAD_WEBHOOK_SECRET not set — Lambda will return 401 until configured"
}
$EnvJson = (@{ Variables = $EnvVars } | ConvertTo-Json -Compress -Depth 5)
# AWS CLI requires strict JSON; write temp file to avoid PowerShell escaping issues
$EnvFile = Join-Path $PSScriptRoot "dist\lambda-env.json"
$EnvJson | Set-Content -Path $EnvFile -Encoding UTF8

$exists = $false
try {
    aws lambda get-function --function-name $FunctionName --region $Region | Out-Null
    $exists = $true
} catch {}

if ($CodeOnly) {
    if (-not $exists) {
        throw "Function $FunctionName not found — cannot use -CodeOnly"
    }
    Write-Host "Code-only update for $FunctionName..."
    aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$ZipPath" --region $Region | Out-Null
    Write-Host "CODE UPDATED function=$FunctionName region=$Region"
    Write-Host "Run direct Function URL test plan before enabling Make/070b."
    exit 0
}

if ($exists) {
    Write-Host "Updating function $FunctionName..."
    aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$ZipPath" --region $Region | Out-Null
    Start-Sleep -Seconds 5
    if (-not $SkipEnvUpdate) {
        aws lambda update-function-configuration --function-name $FunctionName --runtime python3.12 --handler handler.lambda_handler --timeout 120 --memory-size 512 --environment "file://$EnvFile" --region $Region | Out-Null
    } else {
        Write-Host "Skipped environment update (-SkipEnvUpdate). AWS console env vars unchanged."
    }
} else {
    Write-Host "Creating function $FunctionName..."
    aws lambda create-function `
        --function-name $FunctionName `
        --runtime python3.12 `
        --role $RoleArn `
        --handler handler.lambda_handler `
        --zip-file "fileb://$ZipPath" `
        --timeout 120 `
        --memory-size 512 `
        --environment "file://$EnvFile" `
        --region $Region | Out-Null
}

Write-Host "Ensuring Function URL..."
try {
    $Url = aws lambda get-function-url-config --function-name $FunctionName --region $Region --query FunctionUrl --output text 2>$null
} catch {
    $Url = $null
}
if (-not $Url) {
    aws lambda create-function-url-config --function-name $FunctionName --auth-type NONE --region $Region | Out-Null
    aws lambda add-permission --function-name $FunctionName --statement-id FunctionUrlAllowPublic --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --region $Region 2>$null | Out-Null
    $Url = aws lambda get-function-url-config --function-name $FunctionName --region $Region --query FunctionUrl --output text
}

Write-Host "DEPLOYED function=$FunctionName region=$Region"
Write-Host "FUNCTION_URL=$Url"
Write-Host "Store Function URL in ops notes only - not GitHub."
