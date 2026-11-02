# CSC 2.0 Follow-Up Platform — One-Command Local Development Runner (Windows)
# Non-negotiables: Synthetic data only, no secrets printed, fails closed if non-local.

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "CSC 2.0 Follow-Up Platform -- Local Dev Environment Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Environment & Tool Checks
Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

$origEA = $ErrorActionPreference
$ErrorActionPreference = "Continue"

# Java check
if (Test-Path "C:\Users\fsayyed\.tools\jdk-21.0.13+9\bin\java.exe") {
    $env:JAVA_HOME = "C:\Users\fsayyed\.tools\jdk-21.0.13+9"
    $env:PATH = $env:JAVA_HOME + "\bin;" + $env:PATH
}
$javaVer = (java -version 2>&1 | Out-String).Split("`n")[0].Trim()
Write-Host "  [OK] Java: $javaVer" -ForegroundColor Green

# Maven check
if (Test-Path "C:\Users\fsayyed\.tools\apache-maven-3.9.9\bin\mvn.cmd") {
    $env:M2_HOME = "C:\Users\fsayyed\.tools\apache-maven-3.9.9"
    $env:PATH = $env:M2_HOME + "\bin;" + $env:PATH
}
$mvnVer = (mvn -version 2>&1 | Out-String).Split("`n")[0].Trim()
Write-Host "  [OK] Maven: $mvnVer" -ForegroundColor Green

# Node check
$nodeVer = (node -v 2>&1 | Out-String).Trim()
Write-Host "  [OK] Node: $nodeVer" -ForegroundColor Green

$ErrorActionPreference = $origEA

# PostgreSQL connectivity check
$pgPortCheck = Test-NetConnection -ComputerName "localhost" -Port 5432 -InformationLevel Quiet
if (-not $pgPortCheck) {
    Write-Error "PostgreSQL is not listening on localhost:5432. Please start PostgreSQL 16 service."
}
Write-Host "  [OK] PostgreSQL: Connected on localhost:5432" -ForegroundColor Green

# 2. Database Migrations & Seeding
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$rootDir = Split-Path -Parent $scriptDir

Write-Host "`n[2/6] Running synthetic data seed script (idempotent, local only)..." -ForegroundColor Yellow
& python "$rootDir\scripts\seed_synthetic_data.py"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Database seeding failed!"
}

# 3. Backend Health & Startup
Write-Host "`n[3/6] Checking Spring Boot backend on port 8080..." -ForegroundColor Yellow
$backendUp = $false
try {
    $res = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($res.status -eq "UP") { $backendUp = $true }
} catch {}

if (-not $backendUp) {
    Write-Host "  Starting Spring Boot backend..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -Command `"`$env:JAVA_HOME='$env:JAVA_HOME'; `$env:M2_HOME='$env:M2_HOME'; cd '$rootDir\backend'; mvn spring-boot:run`"" -WindowStyle Hidden
    
    $attempts = 0
    while (-not $backendUp -and $attempts -lt 30) {
        Start-Sleep -Seconds 2
        $attempts++
        try {
            $res = Invoke-RestMethod -Uri "http://localhost:8080/actuator/health" -Method Get -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($res.status -eq "UP") { $backendUp = $true }
        } catch {}
        Write-Host "  Waiting for Spring Boot... ($attempts/30)" -ForegroundColor Gray
    }
}

if ($backendUp) {
    Write-Host "  [OK] Spring Boot backend is healthy at http://localhost:8080" -ForegroundColor Green
} else {
    Write-Error "Spring Boot backend failed to become healthy."
}

# 4. Frontend Health & Startup
Write-Host "`n[4/6] Checking Next.js frontend on port 3000..." -ForegroundColor Yellow
$frontendUp = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:3000/sign-in" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
    if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) { $frontendUp = $true }
} catch {}

if (-not $frontendUp) {
    Write-Host "  Starting Next.js server on port 3000..." -ForegroundColor Cyan
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -Command `"cd '$rootDir\frontend'; npx next start -p 3000`"" -WindowStyle Hidden
    
    $attempts = 0
    while (-not $frontendUp -and $attempts -lt 20) {
        Start-Sleep -Seconds 2
        $attempts++
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:3000/sign-in" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 400) { $frontendUp = $true }
        } catch {}
        Write-Host "  Waiting for Next.js... ($attempts/20)" -ForegroundColor Gray
    }
}

if ($frontendUp) {
    Write-Host "  [OK] Next.js frontend is healthy at http://localhost:3000" -ForegroundColor Green
} else {
    Write-Error "Next.js frontend failed to become healthy."
}

# 5. Print Summary & URLs
Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host " CSC 2.0 FOLLOW-UP PLATFORM IS READY FOR LOCAL TESTING" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Test Sign-In:       http://localhost:3000/sign-in" -ForegroundColor Cyan
Write-Host "  My Work (Worklist): http://localhost:3000/work" -ForegroundColor White
Write-Host "  Beneficiary List:   http://localhost:3000/clients" -ForegroundColor White
Write-Host "  New Registration:   http://localhost:3000/clients/new" -ForegroundColor White
Write-Host "  Client Detail:      http://localhost:3000/clients/22222222-2222-2222-2222-222222222201?tab=follow-up" -ForegroundColor White
Write-Host "  Reports:            http://localhost:3000/reports" -ForegroundColor White
Write-Host "  System Admin:       http://localhost:3000/admin" -ForegroundColor White
Write-Host ""
Write-Host "  Pre-seeded Test Identities (Password: TestPass123!):" -ForegroundColor Gray
Write-Host "    - fw_delhi_a      (Field Worker A, Center: CENTER_DELHI_01)" -ForegroundColor Gray
Write-Host "    - fw_delhi_b      (Field Worker B, Center: CENTER_DELHI_01)" -ForegroundColor Gray
Write-Host "    - sup_delhi       (Supervisor, Center: CENTER_DELHI_01)" -ForegroundColor Gray
Write-Host "    - state_rev_delhi (State Reviewer, Jurisdiction: STATE_DELHI)" -ForegroundColor Gray
Write-Host "    - admin_national  (Administrator, Scope: ALL)" -ForegroundColor Gray
Write-Host "    - lead_national   (Leadership View-Only, Scope: ALL)" -ForegroundColor Gray
Write-Host "==========================================================" -ForegroundColor Green
