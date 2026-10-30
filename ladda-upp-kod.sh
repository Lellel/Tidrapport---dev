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

if [ ! -f "$MAPP/.clasp.json" ]; then
  echo "❌ Hittade inget klonat Apps Script-projekt i $MAPP"
  exit 1
fi

cd "$MAPP"

echo "⬇️  [1/3] Hämtar senaste versionen från Apps Script ($MILJO)..."
clasp pull

# clasp sparar skriptfiler som .js eller .gs beroende på version
if [ -f Kod.js ]; then MAL=Kod.js; else MAL=Kod.gs; fi

if [ ! -f Config.js ] && [ ! -f Config.gs ]; then
  echo "❌ Config saknas i $MAPP – avbryter så att den inte raderas i Apps Script."
  exit 1
fi

echo "📄 [2/3] Kopierar Kod.gs från repot till $MAL..."
cp "$REPO/Kod.gs" "$MAPP/$MAL"

echo "⬆️  [3/3] Laddar upp till Apps Script..."
clasp push

echo "✅ Klart! Glöm inte: Distribuera → Hantera distributioner → Redigera → Ny version"
