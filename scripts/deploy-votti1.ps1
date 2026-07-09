# Deploy VOTTI no time votti1 (produção: votti.app)
# Antes de rodar:
#   1. npx vercel login   (conta com acesso a vercel.com/votti1)
#   2. OU convide seu usuario em votti1 → Settings → Members
#
# Uso: .\scripts\deploy-votti1.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host "Verificando time Vercel..." -ForegroundColor Cyan
$teams = npx vercel teams ls 2>&1 | Out-String
if ($teams -notmatch "votti1") {
  Write-Host ""
  Write-Host "ERRO: este CLI nao tem acesso ao time votti1." -ForegroundColor Red
  Write-Host "Faca login com a conta certa: npx vercel login" -ForegroundColor Yellow
  Write-Host "Ou convide seu usuario em https://vercel.com/votti1/settings/members" -ForegroundColor Yellow
  exit 1
}

Write-Host "Vinculando projeto ao time votti1..." -ForegroundColor Cyan
npx vercel link --scope votti1 --project votti --yes

Write-Host "Build..." -ForegroundColor Cyan
npm run build

Write-Host "Deploy producao (votti1)..." -ForegroundColor Cyan
npx vercel deploy --prebuilt --prod --yes --scope votti1

Write-Host ""
Write-Host "Proximos passos no painel https://vercel.com/votti1:" -ForegroundColor Green
Write-Host "  - Settings -> Environment Variables (SUPABASE_*, VITE_APP_URL=https://votti.app)"
Write-Host "  - Settings -> Deployment Protection -> desativar em Production"
Write-Host "  - Domains -> adicionar votti.app (DNS A @ -> 76.76.21.21 no Cloudflare)"
Write-Host "  - Supabase Auth -> Redirect URL: https://votti.app/auth/callback"
