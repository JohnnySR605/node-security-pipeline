# fix-git.ps1 - Run once to fix repo that has node_modules tracked
# Usage: .\fix-git.ps1

Write-Host "Removing node_modules from Git tracking..." -ForegroundColor Yellow

git rm -r --cached node_modules --quiet
git rm -r --cached dist --quiet 2>$null
git rm -r --cached logs --quiet 2>$null
git rm --cached .env --quiet 2>$null
git rm --cached test-secret.ts --quiet 2>$null
git rm --cached test-sercet.ts --quiet 2>$null

Write-Host "Committing cleanup..." -ForegroundColor Green
git add .gitignore
git commit -m "chore: remove node_modules, dist, logs from tracking"

Write-Host "Done! node_modules will no longer be tracked." -ForegroundColor Green
Write-Host "Verify with: git status" -ForegroundColor Cyan
