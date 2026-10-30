#!/bin/bash

echo "🔍 Skannar källkod och Service Worker efter låsta funktioner & versionssynk..."
echo "------------------------------------------------------------"

ERRORS=0

# 1. Kontrollera Kärnfunktioner
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

check_feature "offerter.html" "sendSms" "Offert/ÄTA via SMS"
check_feature "app.js" "respondCustomerOffer" "Kundens godkännande (kundsida)"
check_feature "app.js" "handleUserPillClick" "Användarpill / Profilväljare"
check_feature "app.js" "renderOffertTemplate" "Offertbesök LiDAR-mallar"
check_feature "app.js" "applyUEConstraints" "UE-Spärrar & Maskinfilter"
check_feature "app.js" "renderCRMView" "360° CRM & Auto-logga"
check_feature "app.js" "renderKabanossBoard" "Kabanoss Programgolv"
check_feature "style.css" "glass-bubble" "3D-Glasbubblor (CSS)"
check_feature "Kod.gs" "handleRespondOffer" "Backend Signering (Kod.gs)"
check_feature "Kod.gs" "buildOfferPdf" "Offert-PDF (Kod.gs)"

echo "------------------------------------------------------------"

# 2. Kontrollera Versionssynk via CURRENT_APP_VERSION
APP_VER=$(grep "CURRENT_APP_VERSION" app.js | grep -o "v4\.[0-9]\+\.[0-9]\+")

if [ -z "$APP_VER" ]; then
  echo "❌ [LARM - VERSION] Hittade inte CURRENT_APP_VERSION i app.js!"
  ERRORS=$((ERRORS+1))
else
  echo "📌 Identifierad app-version från CURRENT_APP_VERSION: $APP_VER"
  
  # Check index.html
  if grep -q "$APP_VER" index.html; then
    echo "✅ [OK] index.html är synkad med $APP_VER"
  else
    echo "❌ [LARM - VERSIONSSYNK] index.html saknar version $APP_VER!"
    ERRORS=$((ERRORS+1))
  fi

  # Check sw.js
  if grep -q "$APP_VER" sw.js; then
    echo "✅ [OK] Service Worker (sw.js) cache är synkad med $APP_VER"
  else
    echo "❌ [LARM - VERSIONSSYNK] sw.js cache är INTE uppdaterad till $APP_VER!"
    ERRORS=$((ERRORS+1))
  fi
fi

echo "------------------------------------------------------------"
if [ $ERRORS -eq 0 ]; then
  echo "🚀 ALLA KÄRNFUNKTIONER OCH SERVICE WORKER ÄR INTAKT & SYNKADE!"
  exit 0
else
  echo "🚨 CRITICAL ERROR: $ERRORS avvikelse(r) hittades!"
  echo "⛔ Stoppar processen. Återställ koden innan du går vidare."
  exit 1
fi
