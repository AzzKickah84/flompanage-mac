#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJECT="$ROOT/Flompanage.Mac"
UI_DIR="$ROOT/../ui"
DIST="$ROOT/dist"
STAGING="$ROOT/release"
NO_BUMP="${NO_BUMP:-}"

if [[ "${1:-}" == "-NoBump" ]]; then
  NO_BUMP=1
fi

read_version() {
  sed -n 's:.*<Version>\([^<]*\)</Version>.*:\1:p' "$PROJECT/Flompanage.Mac.csproj" | head -n1
}

if [[ -z "$NO_BUMP" ]]; then
  echo "[0/6] Versienummer ophogen..."
  node "$ROOT/../../scripts/bump-flompanage-mac-version.mjs" "$PROJECT/Flompanage.Mac.csproj"
fi

VERSION="$(read_version)"
echo "Versie: $VERSION"

GITHUB_REPO=""
MANIFEST_URL=""
if [[ -f "$PROJECT/update-channel.json" ]]; then
  GITHUB_REPO="$(node -e "const c=require('$PROJECT/update-channel.json'); console.log(c.githubRepo||'')")"
  MANIFEST_URL="$(node -e "const c=require('$PROJECT/update-channel.json'); console.log(c.manifestUrl||'')")"
fi

echo "[1/6] UI assets..."
if [[ -f "$ROOT/../../public/mainlogo.png" ]]; then
  mkdir -p "$UI_DIR/public"
  cp "$ROOT/../../public/mainlogo.png" "$UI_DIR/public/logo.png"
elif [[ -f "$ROOT/../../mainlogo.png" ]]; then
  mkdir -p "$UI_DIR/public"
  cp "$ROOT/../../mainlogo.png" "$UI_DIR/public/logo.png"
fi

echo "[2/6] UI bouwen (Vite -> Mac/wwwroot)..."
cd "$UI_DIR"
rm -rf "$PROJECT/wwwroot"
export VITE_FLOMPANAGE_VERSION="$VERSION"
export VITE_FLOMPANAGE_GITHUB_REPO="$GITHUB_REPO"
export VITE_FLOMPANAGE_MANIFEST_URL="$MANIFEST_URL"
export VITE_OUT_DIR="$PROJECT/wwwroot"
npm run build:mac

echo "[3/6] .NET MAUI workload..."
dotnet workload install maui --skip-manifest-update || dotnet workload install maui

publish_rid() {
  local RID="$1"
  local LABEL="$2"
  echo "[4/6] Publiceren ($LABEL / $RID)..."
  dotnet publish "$PROJECT/Flompanage.Mac.csproj" \
    -c Release \
    -f net9.0-maccatalyst \
    -r "$RID" \
    -p:CreatePackage=false \
    -o "$STAGING/$RID"

  local APP_PATH
  APP_PATH="$(find "$STAGING/$RID" -maxdepth 1 -name '*.app' | head -n1)"
  if [[ -z "$APP_PATH" ]]; then
    echo "FOUT: .app bundle niet gevonden in $STAGING/$RID"
    exit 1
  fi

  mkdir -p "$DIST"
  local DMG="$DIST/Flompanage-Mac-${VERSION}-${LABEL}.dmg"
  echo "[5/6] DMG maken ($LABEL)..."
  "$ROOT/scripts/create-dmg.sh" "$APP_PATH" "$DMG"
  echo "  -> $DMG"
}

publish_rid "maccatalyst-arm64" "AppleSilicon"
publish_rid "maccatalyst-x64" "Intel"

echo ""
echo "Klaar:"
ls -1 "$DIST"/Flompanage-Mac-${VERSION}-*.dmg
echo ""
echo "Deel de juiste DMG met Mac-gebruikers (Apple Silicon vs Intel)."
