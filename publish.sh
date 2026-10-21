#!/bin/bash
set -e
MSG=${1:-"Automatisk uppdatering"}

echo "🚀 [1/4] Sparar i DEV..."
cd ~/Desktop/LPV_Backup/Tidrapport---dev
git add .
git commit -m "$MSG" || true
git push origin main

PROD_DIR="../Tidsrapportering-och-annat-LPV"
if [ ! -d "$PROD_DIR" ]; then
  echo "⚠️ Hittade inte PROD-mappen!"
  exit 1
fi

echo "🔄 [2/4] Säkerställer ren main-gren i PROD..."
cd "$PROD_DIR"
git checkout main
git fetch origin main
git reset --hard origin/main
cd ~/Desktop/LPV_Backup/Tidrapport---dev

echo "📦 [3/4] Kopierar till PROD (skyddar config.js)..."
rsync -av --exclude='config.js' --exclude='.git' --exclude='publish.sh' ./ "$PROD_DIR/"

echo "🌐 [4/4] Höjer version & publicerar till GitHub Pages..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
sed -i '' "s/const CACHE_NAME = '.*';/const CACHE_NAME = 'tidrapport-prod-$TIMESTAMP';/g" "$PROD_DIR/sw.js" 2>/dev/null || true

cd "$PROD_DIR"
git add .
git commit -m "Deploy: $MSG ($TIMESTAMP)" || true
git push origin main

cd ~/Desktop/LPV_Backup/Tidrapport---dev
echo "✅ PUBLICERING KLAR OCH VERIFIERAD!"
