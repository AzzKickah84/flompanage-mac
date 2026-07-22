#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:?app bundle path required}"
DMG_PATH="${2:?dmg output path required}"

STAGING_DIR="$(mktemp -d)"
cleanup() { rm -rf "$STAGING_DIR"; }
trap cleanup EXIT

cp -R "$APP_PATH" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"
mkdir -p "$(dirname "$DMG_PATH")"
rm -f "$DMG_PATH"
hdiutil create -volname "Flompanage" -srcfolder "$STAGING_DIR" -ov -format UDZO "$DMG_PATH" >/dev/null
