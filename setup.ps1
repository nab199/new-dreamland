# Dreamland College - Quick Setup Script
# Run this to set up your environment

Write-Host "🎓 Dreamland College Management System - Setup" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
Write-Host ""

# Check if .env.local exists
if (Test-Path ".env.local") {
    Write-Host "⚠️  .env.local already exists!" -ForegroundColor Yellow
    $overwrite = Read-Host "Overwrite? (y/n)"
    if ($overwrite -ne "y") {
        Write-Host "Skipping .env.local creation"
    } else {
        Copy-Item ".env.local.example" ".env.local"
        Write-Host "✅ Created .env.local from example" -ForegroundColor Green
    }
} else {
    Copy-Item ".env.local.example" ".env.local"
    Write-Host "✅ Created .env.local from example" -ForegroundColor Green
}

# Create required directories
$dirs = @(
    "public/pwa-icons",
    "public/screenshots"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "✅ Created directory: $dir" -ForegroundColor Green
    } else {
        Write-Host "✓ Directory exists: $dir" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Edit .env.local and add your:"
Write-Host "   - VITE_API_BASE_URL (your Render backend URL)"
Write-Host "   - SUPABASE_URL and SUPABASE_ANON_KEY"
Write-Host ""
Write-Host "2. Generate PWA icons:"
Write-Host "   - Run: npm run dev"
Write-Host "   - Open: http://localhost:3000/generate-pwa-icons.html"
Write-Host ""
Write-Host "3. Build and deploy:"
Write-Host "   - Run: npm run build"
Write-Host "   - Deploy to Vercel/Netlify/Render"
Write-Host ""
Write-Host "📖 For detailed instructions, see DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
