# ============================================
# radar-blog 자동 빌드 오케스트레이터
# Claude Code -p (headless) 모드로 모델 자동 전환
# ============================================
#
# 사용법:
#   .\scripts\build.ps1              — 전체 빌드 (Step별 확인)
#   .\scripts\build.ps1 -Auto        — 전체 자동 빌드 (확인 없이)
#   .\scripts\build.ps1 -From "1-5"  — Step 1-5부터 시작
#   .\scripts\build.ps1 -Only "1-5"  — Step 1-5만 실행
#   .\scripts\build.ps1 -Phase 2     — Phase 2만 실행

param(
    [switch]$Auto,
    [string]$From = "",
    [string]$Only = "",
    [int]$Phase = 0
)

# ============================================
# Step 정의: [Step ID, 모델, 설명]
# ============================================
$steps = @(
    # Phase 1: MVP
    @{ id = "1-1";  model = "sonnet"; phase = 1; desc = "프로젝트 초기화" },
    @{ id = "1-2";  model = "sonnet"; phase = 1; desc = "Prisma 스키마 + DB" },
    @{ id = "1-3";  model = "sonnet"; phase = 1; desc = "인증 (NextAuth)" },
    @{ id = "1-4";  model = "sonnet"; phase = 1; desc = "레이아웃 + 네비 + 푸터" },
    @{ id = "1-5";  model = "opus";   phase = 1; desc = "메인 페이지 [OPUS]" },
    @{ id = "1-6";  model = "opus";   phase = 1; desc = "글 상세 페이지 [OPUS]" },
    @{ id = "1-7";  model = "sonnet"; phase = 1; desc = "카테고리 페이지들" },
    @{ id = "1-8";  model = "sonnet"; phase = 1; desc = "소개 페이지 (About)" },
    @{ id = "1-9";  model = "sonnet"; phase = 1; desc = "외부 발행 API" },
    @{ id = "1-10"; model = "sonnet"; phase = 1; desc = "관리자 페이지" },
    @{ id = "1-11"; model = "sonnet"; phase = 1; desc = "SEO + 다크모드 + RSS" },
    # Phase 2: GitHub 자동화
    @{ id = "2-1";  model = "sonnet"; phase = 2; desc = "GitHub Webhook 수신" },
    @{ id = "2-2";  model = "opus";   phase = 2; desc = "AI 글 생성 파이프라인 [OPUS]" },
    @{ id = "2-3";  model = "sonnet"; phase = 2; desc = "레포 관리 강화" },
    # Phase 3: 고도화
    @{ id = "3-1";  model = "opus";   phase = 3; desc = "통계 페이지 [OPUS]" },
    @{ id = "3-2";  model = "sonnet"; phase = 3; desc = "시리즈 기능" },
    @{ id = "3-3";  model = "sonnet"; phase = 3; desc = "한영 전환 (i18n)" },
    @{ id = "3-4";  model = "sonnet"; phase = 3; desc = "검색 강화 + 태그" },
    @{ id = "3-5";  model = "sonnet"; phase = 3; desc = "배포 설정 (Railway)" },
    @{ id = "3-6";  model = "sonnet"; phase = 3; desc = "최종 점검" }
)

# ============================================
# 필터링
# ============================================
$filtered = $steps

# -Only: 특정 Step만
if ($Only -ne "") {
    $filtered = $steps | Where-Object { $_.id -eq $Only }
}
# -Phase: 특정 Phase만
elseif ($Phase -gt 0) {
    $filtered = $steps | Where-Object { $_.phase -eq $Phase }
}
# -From: 특정 Step부터
elseif ($From -ne "") {
    $startIdx = 0
    for ($i = 0; $i -lt $steps.Count; $i++) {
        if ($steps[$i].id -eq $From) { $startIdx = $i; break }
    }
    $filtered = $steps[$startIdx..($steps.Count - 1)]
}

# ============================================
# 로그 디렉토리
# ============================================
$logDir = Join-Path $PSScriptRoot "logs"
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$logFile = Join-Path $logDir "build-$timestamp.log"

function Log($msg) {
    $line = "[$(Get-Date -Format 'HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

# ============================================
# 헤더 출력
# ============================================
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  이더 블로그 — 자동 빌드 오케스트레이터" -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  실행할 Step: $($filtered.Count)개" -ForegroundColor Yellow
foreach ($s in $filtered) {
    $modelColor = if ($s.model -eq "opus") { "Magenta" } else { "Green" }
    Write-Host "    Step $($s.id) [$($s.model)] $($s.desc)" -ForegroundColor $modelColor
}
Write-Host ""

if (-not $Auto) {
    $confirm = Read-Host "  시작할까요? (y/n)"
    if ($confirm -ne "y") { Write-Host "  취소됨." -ForegroundColor Red; exit }
}

# ============================================
# 실행
# ============================================
$projectDir = Split-Path $PSScriptRoot -Parent
$promptsDir = Join-Path $PSScriptRoot "prompts"
$totalSteps = $filtered.Count
$currentStep = 0
$startTime = Get-Date

foreach ($step in $filtered) {
    $currentStep++
    $promptFile = Join-Path $promptsDir "step-$($step.id).txt"

    if (-not (Test-Path $promptFile)) {
        Log "ERROR: $promptFile 파일 없음. 건너뜀."
        continue
    }

    $prompt = Get-Content -Path $promptFile -Raw -Encoding UTF8

    Write-Host ""
    Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    $modelColor = if ($step.model -eq "opus") { "Magenta" } else { "Green" }
    Write-Host "  [$currentStep/$totalSteps] Step $($step.id): $($step.desc)" -ForegroundColor White
    Write-Host "  모델: $($step.model)" -ForegroundColor $modelColor
    Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray

    Log "START Step $($step.id) [model=$($step.model)] $($step.desc)"
    $stepStart = Get-Date

    # Claude Code headless 실행
    try {
        $stepLogFile = Join-Path $logDir "step-$($step.id)-$timestamp.log"

        # -p: headless, --model: 모델 지정, --output-format: JSON 스트림
        $result = $prompt | claude -p --model $step.model 2>&1

        # 로그 저장
        $result | Out-File -FilePath $stepLogFile -Encoding UTF8

        $stepDuration = (Get-Date) - $stepStart
        Log "DONE  Step $($step.id) ($([math]::Round($stepDuration.TotalMinutes, 1))분)"

        Write-Host "  ✅ 완료 ($([math]::Round($stepDuration.TotalMinutes, 1))분)" -ForegroundColor Green

    } catch {
        Log "ERROR Step $($step.id): $_"
        Write-Host "  ❌ 에러 발생: $_" -ForegroundColor Red

        if (-not $Auto) {
            $retry = Read-Host "  다시 시도할까요? (y/n/skip)"
            if ($retry -eq "y") {
                $currentStep--
                continue
            } elseif ($retry -eq "skip") {
                continue
            } else {
                Write-Host "  빌드 중단." -ForegroundColor Red
                exit 1
            }
        }
    }

    # Phase 사이 자동 커밋
    $nextStep = $filtered | Select-Object -Skip $currentStep -First 1
    if ($nextStep -and $nextStep.phase -ne $step.phase) {
        Log "Phase $($step.phase) 완료 — 자동 커밋"
        Write-Host ""
        Write-Host "  📦 Phase $($step.phase) 완료! 자동 커밋 중..." -ForegroundColor Yellow
        Set-Location $projectDir
        git add -A 2>$null
        git commit -m "feat: Phase $($step.phase) 완료" 2>$null
    }

    # Step별 확인 (Auto 모드가 아닐 때)
    if (-not $Auto -and $currentStep -lt $totalSteps) {
        Write-Host ""
        $next = Read-Host "  다음 Step 진행? (y/n/skip)"
        if ($next -eq "n") {
            Log "사용자 중단 at Step $($step.id)"
            Write-Host "  빌드 중단. 다음에 -From '$($filtered[$currentStep].id)' 로 이어서 하세요." -ForegroundColor Yellow
            exit 0
        } elseif ($next -eq "skip") {
            continue
        }
    }
}

# ============================================
# 완료
# ============================================
$totalDuration = (Get-Date) - $startTime
Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  빌드 완료!" -ForegroundColor Green
Write-Host "  총 소요: $([math]::Round($totalDuration.TotalMinutes, 1))분" -ForegroundColor Yellow
Write-Host "  로그: $logFile" -ForegroundColor DarkGray
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host ""

Log "BUILD COMPLETE ($([math]::Round($totalDuration.TotalMinutes, 1))분)"
