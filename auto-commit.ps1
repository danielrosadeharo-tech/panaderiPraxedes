# Auto-commit and push script for panaderiPraxedes
# Este script vigila cambios y hace commit/push automáticamente

$repoPath = "C:/Users/Daniel/Desktop/pagina web panaderia/panaderiPraxedes"
$intervalSeconds = 5
$lastCommitTime = Get-Date

Write-Host "🚀 Auto-commit iniciado en: $repoPath" -ForegroundColor Green
Write-Host "⏱️ Revisando cambios cada $intervalSeconds segundos..." -ForegroundColor Cyan
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Yellow
Write-Host ""

while ($true) {
    try {
        Set-Location $repoPath
        
        # Obtener estado de git
        $status = git status --porcelain
        
        if ($status) {
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 📝 Cambios detectados..." -ForegroundColor Yellow
            
            # Añadir todos los cambios
            git add .
            
            # Hacer commit
            $commitMsg = "Auto-commit: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
            git commit -m $commitMsg
            
            # Hacer push
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] 📤 Subiendo cambios..." -ForegroundColor Cyan
            git push
            
            Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ✅ Commit y push completado!" -ForegroundColor Green
            Write-Host ""
        }
        
        Start-Sleep -Seconds $intervalSeconds
    }
    catch {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] ❌ Error: $_" -ForegroundColor Red
        Start-Sleep -Seconds $intervalSeconds
    }
}
