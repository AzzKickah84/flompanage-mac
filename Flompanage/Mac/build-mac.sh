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
  node -e "console.log(require('$UI_DIR/package.json').version)"
}

if [[ -z "$NO_BUMP" ]]; then
  echo "[0/7] Versienummer ophogen (gedeeld met Windows)..."
  node "$ROOT/../../scripts/bump-flompanage-version.mjs" "$UI_DIR/package.json"
else
  echo "[0/7] Mac-versie synchroniseren met Windows..."
  node "$ROOT/../../scripts/sync-flompanage-mac-version.mjs" "$UI_DIR/package.json"
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

find_app_bundle() {
  local app_path
  app_path="$(find "$@" -name '*.app' -type d 2>/dev/null | head -n1)"
  if [[ -n "$app_path" ]]; then
    echo "$app_path"
    return 0
  fi

  local pkg
  pkg="$(find "$@" -name '*.pkg' 2>/dev/null | head -n1)"
  if [[ -z "$pkg" ]]; then
    return 1
  fi

  echo "  .app niet direct gevonden; uitpakken van $(basename "$pkg")..." >&2
  local expand_dir="$STAGING/pkg-expand-$$-$RANDOM"
  mkdir -p "$expand_dir"
  (
    cd "$expand_dir"
    xar -xf "$pkg"
    if [[ -f Payload ]]; then
      cat Payload | gunzip -dc | cpio -idm 2>/dev/null
    fi
  )
  app_path="$(find "$expand_dir" -name '*.app' -type d 2>/dev/null | head -n1)"
  if [[ -n "$app_path" ]]; then
    echo "$app_path"
    return 0
  fi
  return 1
}

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
    -p:EnableCodeSigning=false \
    -o "$MAUI_OUT"

  local APP_PATH
  if ! APP_PATH="$(find_app_bundle "$MAUI_OUT" "$MAUI_PROJECT/bin/Release/net9.0-maccatalyst/$MAUI_RID")"; then
    echo "FOUT: .app bundle niet gevonden na MAUI publish"
    find "$MAUI_OUT" "$MAUI_PROJECT/bin/Release/net9.0-maccatalyst/$MAUI_RID" -maxdepth 4 2>/dev/null | head -40 || true
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
