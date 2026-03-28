# Quick health check for DigitalOcean Gradient API
# Usage: pwsh scripts/check-gradient.ps1

$ErrorActionPreference = "Stop"

# Load .env from project root
$envFile = Join-Path $PSScriptRoot "../.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.*)$') {
            [System.Environment]::SetEnvironmentVariable($Matches[1].Trim(), $Matches[2].Trim(), "Process")
        }
    }
}

$key = $env:DO_MODEL_ACCESS_KEY
if (-not $key) {
    Write-Host "ERROR: DO_MODEL_ACCESS_KEY is not set in .env" -ForegroundColor Red
    exit 1
}

$base = "https://inference.do-ai.run/v1"
$headers = @{
    Authorization  = "Bearer $key"
    "Content-Type" = "application/json"
}

$models = @(
    "llama3.3-70b-instruct",
    "anthropic-claude-4.6-sonnet",
    "openai-gpt-4o"
)

# --- Test 1: Models endpoint ---
Write-Host "`n=== 1. Models endpoint ===" -ForegroundColor Cyan
try {
    $r = Invoke-WebRequest -Uri "$base/models" -Headers @{Authorization = "Bearer $key"} -Method GET -UseBasicParsing
    Write-Host "OK - key is valid (HTTP $($r.StatusCode))" -ForegroundColor Green
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "FAIL - HTTP $code (bad key or account issue)" -ForegroundColor Red
    exit 1
}

# --- Test 2: Chat completions per model ---
Write-Host "`n=== 2. Chat completions ===" -ForegroundColor Cyan

foreach ($model in $models) {
    Write-Host "`nTesting: $model" -ForegroundColor Yellow

    $body = @{
        model                 = $model
        messages              = @(@{ role = "user"; content = "Reply with the single word hello." })
        max_completion_tokens = 10
        temperature           = 0
    } | ConvertTo-Json -Depth 3

    try {
        $r = Invoke-WebRequest -Uri "$base/chat/completions" -Headers $headers -Method POST -Body $body -UseBasicParsing
        $parsed = $r.Content | ConvertFrom-Json
        $content = $parsed.choices[0].message.content
        Write-Host "  OK (HTTP $($r.StatusCode)) - Response: $content" -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        # Try multiple ways to get the response body
        $errBody = $_.ErrorDetails.Message
        if (-not $errBody) {
            try {
                $stream = $_.Exception.Response.GetResponseStream()
                $reader = New-Object System.IO.StreamReader($stream)
                $errBody = $reader.ReadToEnd()
                $reader.Close()
            } catch {}
        }
        if (-not $errBody) {
            $errBody = $_.Exception.Message
        }

        Write-Host "  FAIL (HTTP $code)" -ForegroundColor Red
        Write-Host "  $errBody" -ForegroundColor Red
    }

    Start-Sleep -Seconds 2
}

Write-Host "`n=== Done ===" -ForegroundColor Cyan
