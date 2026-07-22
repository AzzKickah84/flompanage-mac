#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MAUI_PROJECT="$ROOT/Flompanage.Mac"
SERVER_PROJECT="$ROOT/Flompanage.Mac.Server"
UI_DIR="$ROOT/../ui"
DIST="$ROOT/dist"
STAGING="$ROOT/release"
NO_BUMP="${NO_BUMP:-}"

if [[ "${1:-}" == "-NoBump" ]]; then
  NO_BUMP=1
fi

read_version() {
  sed -n 's:.*<Version>\([^<]*\)</Version>.*:\1:p' "$MAUI_PROJECT/Flompanage.Mac.csproj" | head -n1
}

if [[ -z "$NO_BUMP" ]]; then
  echo "[0/7] Versienummer ophogen..."
  node "$ROOT/../../scripts/bump-flompanage-mac-version.mjs" "$MAUI_PROJECT/Flompanage.Mac.csproj"
  SERVER_VERSION="$(read_version)"
  sed -i '' "s:<Version>[^<]*</Version>:<Version>${SERVER_VERSION}</Version>:" "$SERVER_PROJECT/Flompanage.Mac.Server.csproj" 2>/dev/null || \
    sed -i "s:<Version>[^<]*</Version>:<Version>${SERVER_VERSION}</Version>:" "$SERVER_PROJECT/Flompanage.Mac.Server.csproj"
fi

VERSION="$(read_version)"
echo "Versie: $VERSION"

GITHUB_REPO=""
MANIFEST_URL=""
if [[ -f "$MAUI_PROJECT/update-channel.json" ]]; then
  GITHUB_REPO="$(node -e "const c=require('$MAUI_PROJECT/update-channel.json'); console.log(c.githubRepo||'')")"
  MANIFEST_URL="$(node -e "const c=require('$MAUI_PROJECT/update-channel.json'); console.log(c.manifestUrl||'')")"
fi

echo "[1/7] UI assets..."
if [[ -f "$ROOT/../../public/mainlogo.png" ]]; then
  mkdir -p "$UI_DIR/public"
  cp "$ROOT/../../public/mainlogo.png" "$UI_DIR/public/logo.png"
elif [[ -f "$ROOT/../../mainlogo.png" ]]; then
  mkdir -p "$UI_DIR/public"
  cp "$ROOT/../../mainlogo.png" "$UI_DIR/public/logo.png"
fi

echo "[2/7] UI bouwen (Vite -> Server/wwwroot)..."
cd "$UI_DIR"
mkdir -p "$SERVER_PROJECT/wwwroot"
rm -rf "$SERVER_PROJECT/wwwroot"/*
export VITE_FLOMPANAGE_VERSION="$VERSION"
export VITE_FLOMPANAGE_GITHUB_REPO="$GITHUB_REPO"
export VITE_FLOMPANAGE_MANIFEST_URL="$MANIFEST_URL"
export VITE_OUT_DIR="$SERVER_PROJECT/wwwroot"
npm run build:mac

echo "[3/7] .NET MAUI workload..."
if [[ -z "${SKIP_MAUI_WORKLOAD_INSTALL:-}" ]]; then
  if ! dotnet workload list | grep -q maui; then
    dotnet workload install maui --skip-manifest-update || dotnet workload install maui
  fi
else
  echo "  (overgeslagen — workload al geïnstalleerd in CI)"
fi

bundle_pair() {
  local MAUI_RID="$1"
  local OSX_RID="$2"
  local LABEL="$3"

  echo "[4/7] Server publiceren ($LABEL / $OSX_RID)..."
  local SERVER_OUT="$STAGING/server-$OSX_RID"
  rm -rf "$SERVER_OUT"
  dotnet publish "$SERVER_PROJECT/Flompanage.Mac.Server.csproj" \
    -c Release \
    -r "$OSX_RID" \
    --self-contained true \
    -p:PublishSingleFile=false \
    -o "$SERVER_OUT"

  echo "[5/7] MAUI publiceren ($LABEL / $MAUI_RID)..."
  local MAUI_OUT="$STAGING/maui-$MAUI_RID"
  rm -rf "$MAUI_OUT"
  dotnet publish "$MAUI_PROJECT/Flompanage.Mac.csproj" \
    -c Release \
    -f net9.0-maccatalyst \
    -r "$MAUI_RID" \
    -p:CreatePackage=true \
    -o "$MAUI_OUT"

  local APP_PATH
  APP_PATH="$(find "$MAUI_OUT" -name '*.app' -type d | head -n1)"
  if [[ -z "$APP_PATH" ]]; then
    echo "FOUT: .app bundle niet gevonden in $MAUI_OUT"
    exit 1
  fi

  echo "[6/7] Server bundelen in .app..."
  local SERVER_BUNDLE="$APP_PATH/Contents/Resources/Flompanage.Server"
  rm -rf "$SERVER_BUNDLE"
  mkdir -p "$SERVER_BUNDLE"
  cp -R "$SERVER_OUT/"* "$SERVER_BUNDLE/"
  chmod +x "$SERVER_BUNDLE/Flompanage.Server"

  mkdir -p "$DIST"
  local DMG="$DIST/Flompanage-Mac-${VERSION}-${LABEL}.dmg"
  echo "[7/7] DMG maken ($LABEL)..."
  "$ROOT/scripts/create-dmg.sh" "$APP_PATH" "$DMG"
  echo "  -> $DMG"
}

bundle_pair "maccatalyst-arm64" "osx-arm64" "AppleSilicon"
bundle_pair "maccatalyst-x64" "osx-x64" "Intel"

echo ""
echo "Klaar:"
ls -1 "$DIST"/Flompanage-Mac-${VERSION}-*.dmg
echo ""
echo "Deel de juiste DMG met Mac-gebruikers (Apple Silicon vs Intel)."
