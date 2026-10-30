#!/bin/bash
# Laddar upp Kod.gs till Apps Script med clasp.
# Apps Script-projektet ligger klonat UTANFÖR repot (~/Dev-repot/AppsScript-dev
# resp. AppsScript-prod) så att Config.gs aldrig hamnar på GitHub.
#
#   ./ladda-upp-kod.sh        → dev
#   ./ladda-upp-kod.sh prod   → prod
set -e

MILJO=${1:-dev}
REPO="$(cd "$(dirname "$0")" && pwd)"
MAPP="$HOME/Dev-repot/AppsScript-$MILJO"

# Distributionens ID (samma som i webbappens URL, se config.js)
case "$MILJO" in
  dev)  DISTRIBUTION="AKfycbyn-mxt1REReA0T4UC4lmf-cbDPcDkv5X5WCJapqyZ06d76tKzxsaCBgaYqTeFfmYPekw" ;;
  prod) DISTRIBUTION="" ;;
  *)    echo "❌ Okänd miljö: $MILJO (använd dev eller prod)"; exit 1 ;;
esac

if [ ! -f "$MAPP/.clasp.json" ]; then
  echo "❌ Hittade inget klonat Apps Script-projekt i $MAPP"
  exit 1
fi

cd "$MAPP"

echo "⬇️  [1/4] Hämtar senaste versionen från Apps Script ($MILJO)..."
clasp pull

# clasp sparar skriptfiler som .js eller .gs beroende på version
if [ -f Kod.js ]; then MAL=Kod.js; else MAL=Kod.gs; fi

if [ ! -f Config.js ] && [ ! -f Config.gs ]; then
  echo "❌ Config saknas i $MAPP – avbryter så att den inte raderas i Apps Script."
  exit 1
fi

echo "📄 [2/4] Kopierar Kod.gs från repot till $MAL..."
cp "$REPO/Kod.gs" "$MAPP/$MAL"

echo "⬆️  [3/4] Laddar upp till Apps Script..."
clasp push

if [ -z "$DISTRIBUTION" ]; then
  echo "⚠️  Inget distributions-ID för $MILJO i skriptet."
  echo "✅ Koden är uppladdad. Gör: Distribuera → Hantera distributioner → Redigera → Ny version"
  exit 0
fi

echo "🚀 [4/4] Skapar ny version av webbappen (samma URL)..."
clasp deploy --deploymentId "$DISTRIBUTION" --description "$(cd "$REPO" && git log -1 --format='%h %s')"

echo "✅ Klart! Nya koden är live i $MILJO."
