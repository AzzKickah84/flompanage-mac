#!/usr/bin/env node
/**
 * Sync Flompanage Mac csproj versions from ui/package.json (shared with Windows).
 * Usage: node scripts/sync-flompanage-mac-version.mjs <path-to-package.json>
 */
import fs from "fs";
import path from "path";

const pkgPath = process.argv[2];
if (!pkgPath) {
  console.error("Usage: node sync-flompanage-mac-version.mjs <package.json>");
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
const version = pkg.version;
if (!/^\d+\.\d+\.\d+$/.test(version ?? "")) {
  console.error(`Invalid version in ${pkgPath}: ${version}`);
  process.exit(1);
}

const buildNumber = Number(version.split(".")[2] ?? 0);
const macRoot = path.join(path.dirname(pkgPath), "..", "Mac");
const macCsproj = path.join(macRoot, "Flompanage.Mac", "Flompanage.Mac.csproj");
const serverCsproj = path.join(macRoot, "Flompanage.Mac.Server", "Flompanage.Mac.Server.csproj");

function syncVersion(csprojPath, { withDisplay = false } = {}) {
  if (!fs.existsSync(csprojPath)) return;
  let csproj = fs.readFileSync(csprojPath, "utf8");
  csproj = csproj.replace(/<Version>[^<]+<\/Version>/, `<Version>${version}</Version>`);
  if (withDisplay) {
    csproj = csproj.replace(
      /<ApplicationDisplayVersion>[^<]+<\/ApplicationDisplayVersion>/,
      `<ApplicationDisplayVersion>${version}</ApplicationDisplayVersion>`,
    );
    csproj = csproj.replace(
      /<ApplicationVersion>[^<]+<\/ApplicationVersion>/,
      `<ApplicationVersion>${buildNumber}</ApplicationVersion>`,
    );
  }
  fs.writeFileSync(csprojPath, csproj, "utf8");
}

syncVersion(macCsproj, { withDisplay: true });
syncVersion(serverCsproj);
console.log(`Synced Mac version -> ${version}`);
