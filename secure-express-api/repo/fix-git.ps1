# fix-git.ps1 — รันครั้งเดียวเพื่อแก้ repo ที่ track node_modules อยู่
# วิธีใช้: .\fix-git.ps1

Write-Host "🔧 Removing node_modules from Git tracking..." -ForegroundColor Yellow

# ลบ node_modules ออกจาก git index (ไม่ลบไฟล์จริง)
git rm -r --cached node_modules --quiet
git rm -r --cached dist --quiet 2>$null
git rm -r --cached logs --quiet 2>$null
git rm --cached .env --quiet 2>$null

# ลบ test-secret files ที่อาจติดค้าง
git rm --cached test-secret.ts --quiet 2>$null
git rm --cached test-sercet.ts --quiet 2>$null

Write-Host "✅ Committing cleanup..." -ForegroundColor Green
git add .gitignore
git commit -m "chore: remove node_modules, dist, logs from tracking + add .gitignore"

Write-Host ""
Write-Host "✅ Done! node_modules จะไม่ถูก track อีกต่อไป" -ForegroundColor Green
Write-Host "   ทดสอบด้วย: git status (ควรไม่เห็น node_modules)" -ForegroundColor Cyan
