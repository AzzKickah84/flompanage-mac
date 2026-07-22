# Flompanage for macOS

Separate macOS desktop app (MAUI + WKWebView). The Windows build in `../App` is **not** modified by this project.

## Requirements (build machine)

- macOS 12+ (Apple Silicon or Intel)
- Xcode / Xcode Command Line Tools
- .NET 9 SDK
- Node.js 20+
- `dotnet workload install maui`

## Build installer (DMG)

```bash
cd Flompanage/Mac
chmod +x build-mac.sh scripts/create-dmg.sh
./build-mac.sh
```

Output in `Flompanage/Mac/dist/`:

- `Flompanage-Mac-{version}-AppleSilicon.dmg` — M1/M2/M3 Macs
- `Flompanage-Mac-{version}-Intel.dmg` — Intel Macs

Share the matching DMG with your Mac users. They drag **Flompanage** to **Applications**.

## First launch

macOS may block unsigned apps. Right-click the app → **Open** → **Open** again.

## Publish to GitHub

Uses repo `AzzKickah84/flompanage-mac` (see `Flompanage.Mac/update-channel.json`).

```powershell
.\publish-github-release-mac.ps1
```

## CI build

GitHub Actions workflow `.github/workflows/flompanage-mac.yml` builds both DMGs on `macos-14` and uploads artifacts. Trigger manually via **Actions → Build Flompanage Mac → Run workflow**.

## Shared UI

The React UI is shared from `../ui` (`npm run build:mac`). Windows and Mac use the same interface; only the native shell differs.
