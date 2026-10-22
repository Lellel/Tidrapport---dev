#!/bin/bash

echo "🔍 Skannar källkod efter låsta kärnfunktioner (V4.7 Nolläge)..."
echo "------------------------------------------------------------"

ERRORS=0

check_feature() {
  FILE=$1
  PATTERN=$2
  NAME=$3

  if grep -q "$PATTERN" "$FILE"; then
    echo "✅ [OK] $NAME"
  else
    echo "❌ [LARM - SAKNAS!] $NAME (Fil: $FILE, Sökord: $PATTERN)"
    ERRORS=$((ERRORS+1))
  fi
}

# Skanna Källkod
check_feature "app.js" "sendAtaViaIMessage" "iMessage ÄTA"
check_feature "app.js" "sendOffertViaIMessage" "iMessage Offert"
check_feature "app.js" "handleUserPillClick" "Användarpill / Profilväljare"
check_feature "app.js" "renderOffertTemplate" "Offertbesök LiDAR-mallar"
check_feature "app.js" "applyUEConstraints" "UE-Spärrar & Maskinfilter"
check_feature "app.js" "renderCRMView" "360° CRM & Auto-logga"
check_feature "app.js" "renderKabanossBoard" "Kabanoss Programgolv"
check_feature "style.css" "glass-bubble" "3D-Glasbubblor (CSS)"
check_feature "Kod.gs" "approveAta" "Backend Signering (Kod.gs)"

echo "------------------------------------------------------------"
if [ $ERRORS -eq 0 ]; then
  echo "🚀 ALLA KÄRNFUNKTIONER ÄR INTAKT! Säker att fortsätta."
  exit 0
else
  echo "🚨 CRITICAL ERROR: $ERRORS funktion(er) har raderats eller tappats!"
  echo "⛔ Stoppar processen. Återställ koden innan du går vidare."
  exit 1
fi
