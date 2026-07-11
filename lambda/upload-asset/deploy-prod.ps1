# Deploy PROD upload Lambda (code + optional config) - C-013 promotion
# Does NOT enable automation 070b. Mike runs after explicit approval.
param(
    [string]$FunctionName = "127si-upload-asset",
    [string]$RoleName = "127si-upload-asset-role",
    [string]$ExistingRoleArn = "",
    [switch]$SkipIam,
    [switch]$CodeOnly,
    [switch]$SkipEnvUpdate
)
$ErrorActionPreference = "Stop"

$Region = if ($env:AWS_REGION) { $env:AWS_REGION } else { "us-east-2" }
$ZipPath = Join-Path $PSScriptRoot "dist\lambda-upload-asset.zip"

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

$AirtableToken = if ($env:AIRTABLE_PROD_TOKEN) { $env:AIRTABLE_PROD_TOKEN } elseif ($env:AIRTABLE_TOKEN) { $env:AIRTABLE_TOKEN } else { $env:AIRTABLE_API_TOKEN }
if (-not $CodeOnly -and -not $AirtableToken) {
    throw "Missing AIRTABLE_PROD_TOKEN (or AIRTABLE_TOKEN) in tools/airtable/.env for PROD deploy"
}

Write-Host "Building zip..."
$DistDir = Join-Path $PSScriptRoot "dist\package"
if (Test-Path $DistDir) { Remove-Item -Recurse -Force $DistDir }
New-Item -ItemType Directory -Path $DistDir | Out-Null
Copy-Item (Join-Path $PSScriptRoot "handler.py") $DistDir
Copy-Item -Recurse (Join-Path $PSScriptRoot "upload_core") $DistDir
if (-not (Test-Path (Join-Path $PSScriptRoot "dist"))) { New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot "dist") | Out-Null }
if (Test-Path $ZipPath) { Remove-Item -Force $ZipPath }
Compress-Archive -Path (Join-Path $DistDir "*") -DestinationPath $ZipPath

$exists = $false
$prevEap = $ErrorActionPreference
$ErrorActionPreference = "Continue"
$gf = aws lambda get-function --function-name $FunctionName --region $Region 2>&1
if ($LASTEXITCODE -eq 0) { $exists = $true }
$ErrorActionPreference = $prevEap

if ($CodeOnly) {
    if (-not $exists) {
        if ($gf) { Write-Host $gf }
        throw "Function $FunctionName not found - create shell first (full deploy without -CodeOnly)"
    }
    Write-Host "Code-only update for $FunctionName..."
    aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$ZipPath" --region $Region
    if ($LASTEXITCODE -ne 0) { throw "update-function-code failed (exit $LASTEXITCODE)" }
    Write-Host "CODE UPDATED function=$FunctionName region=$Region"
    Write-Host "Run isolated PROD Function URL smoke before Make or 070b."
    exit 0
}

$TrustPolicyPath = Join-Path $PSScriptRoot "iam-trust-policy.json"

$RoleArn = if ($ExistingRoleArn) { $ExistingRoleArn } else { $null }
if (-not $RoleArn -and -not $SkipIam) {
    $ErrorActionPreference = "Continue"
    $RoleArn = aws iam get-role --role-name $RoleName --query Role.Arn --output text 2>$null
    if ($LASTEXITCODE -ne 0) { $RoleArn = $null }
    $ErrorActionPreference = $prevEap
}

if (-not $RoleArn -and -not $SkipIam) {
    Write-Host "Creating IAM role $RoleName..."
    $ErrorActionPreference = "Continue"
    $RoleArn = aws iam create-role --role-name $RoleName --assume-role-policy-document "file://$TrustPolicyPath" --query Role.Arn --output text
    if ($LASTEXITCODE -ne 0 -or -not $RoleArn) { throw "create-role failed (exit $LASTEXITCODE)" }
    Start-Sleep -Seconds 10
    aws iam put-role-policy --role-name $RoleName --policy-name "${RoleName}-s3-inline" --policy-document "file://$((Join-Path $PSScriptRoot 'iam-policy-prod.json'))"
    if ($LASTEXITCODE -ne 0) { throw "put-role-policy failed (exit $LASTEXITCODE)" }
    aws iam attach-role-policy --role-name $RoleName --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    if ($LASTEXITCODE -ne 0) { throw "attach-role-policy failed (exit $LASTEXITCODE)" }
    $ErrorActionPreference = $prevEap
}

if (-not $RoleArn -and -not $SkipIam) {
    throw "Missing -ExistingRoleArn. Create IAM role $RoleName with iam-policy-prod.json, then re-run."
}

$EnvVars = @{
    AIRTABLE_BASE_ID = "appn84sqPw03zEbTT"
    AIRTABLE_API_TOKEN = $AirtableToken
    AIRTABLE_TOKEN = $AirtableToken
    S3_BUCKET = "shooting-challenge-assets"
    ENVIRONMENT = "PROD"
    ALLOW_ROUTE_KEYS = "video_feedback"
    SEASON_SLUG = "2025-2026"
    CHALLENGE_SLUG = "shooting-challenge"
}
if ($env:UPLOAD_WEBHOOK_SECRET_PROD) {
    $EnvVars["UPLOAD_WEBHOOK_SECRET"] = $env:UPLOAD_WEBHOOK_SECRET_PROD
} elseif ($env:UPLOAD_WEBHOOK_SECRET) {
    Write-Warning "Using UPLOAD_WEBHOOK_SECRET - prefer UPLOAD_WEBHOOK_SECRET_PROD for Production"
    $EnvVars["UPLOAD_WEBHOOK_SECRET"] = $env:UPLOAD_WEBHOOK_SECRET
} else {
    Write-Warning "UPLOAD_WEBHOOK_SECRET_PROD not set - Lambda returns 401 until configured"
}
$EnvJson = (@{ Variables = $EnvVars } | ConvertTo-Json -Compress -Depth 5)
$EnvFilePath = Join-Path $PSScriptRoot "dist\lambda-env-prod.json"
$Utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText($EnvFilePath, $EnvJson, $Utf8NoBom)

if ($exists) {
    Write-Host "Updating function $FunctionName..."
    $ErrorActionPreference = "Continue"
    aws lambda update-function-code --function-name $FunctionName --zip-file "fileb://$ZipPath" --region $Region | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "update-function-code failed (exit $LASTEXITCODE)" }
    Start-Sleep -Seconds 5
    if (-not $SkipEnvUpdate) {
        aws lambda update-function-configuration --function-name $FunctionName --runtime python3.12 --handler handler.lambda_handler --timeout 120 --memory-size 512 --environment "file://$($EnvFilePath -replace '\\','/')" --region $Region | Out-Null
        if ($LASTEXITCODE -ne 0) { throw "update-function-configuration failed (exit $LASTEXITCODE)" }
    }
} else {
    Write-Host "Creating function $FunctionName..."
    $ErrorActionPreference = "Continue"
    aws lambda create-function `
        --function-name $FunctionName `
        --runtime python3.12 `
        --role $RoleArn `
        --handler handler.lambda_handler `
        --zip-file "fileb://$ZipPath" `
        --timeout 120 `
        --memory-size 512 `
        --environment "file://$($EnvFilePath -replace '\\','/')" `
        --region $Region | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "create-function failed (exit $LASTEXITCODE)" }
}
$ErrorActionPreference = $prevEap

Write-Host "Ensuring Function URL..."
$ErrorActionPreference = "Continue"
$Url = aws lambda get-function-url-config --function-name $FunctionName --region $Region --query FunctionUrl --output text 2>$null
if ($LASTEXITCODE -ne 0) { $Url = $null }
if (-not $Url) {
    aws lambda create-function-url-config --function-name $FunctionName --auth-type NONE --region $Region | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "create-function-url-config failed (exit $LASTEXITCODE)" }
    aws lambda add-permission --function-name $FunctionName --statement-id FunctionUrlAllowPublic --action lambda:InvokeFunctionUrl --principal "*" --function-url-auth-type NONE --region $Region 2>$null | Out-Null
    aws lambda add-permission --function-name $FunctionName --statement-id AllowPublicInvokeFunction --action lambda:InvokeFunction --principal "*" --region $Region 2>$null | Out-Null
    $Url = aws lambda get-function-url-config --function-name $FunctionName --region $Region --query FunctionUrl --output text
    if ($LASTEXITCODE -ne 0) { throw "get-function-url-config failed (exit $LASTEXITCODE)" }
}
$ErrorActionPreference = $prevEap

Write-Host "DEPLOYED function=$FunctionName region=$Region"
Write-Host "FUNCTION_URL=$Url"
Write-Host "Store Function URL in ops notes only - not GitHub."
