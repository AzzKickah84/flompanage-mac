#!/usr/bin/env node
/**
 * Bump patch version in Flompanage ui/package.json (e.g. 1.0.69 -> 1.0.70).
 * Also syncs App/App.csproj <Version>.
 * Usage: node scripts/bump-flompanage-version.mjs <path-to-package.json>
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "node:child_process";

const pkgPath = process.argv[2];
if (!pkgPath) {
  console.error("Usage: node bump-flompanage-version.mjs <package.json>");
  process.exit(1);
}

const raw = fs.readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(raw);
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version ?? "");
if (!match) {
  console.error(`Invalid version in ${pkgPath}: ${pkg.version}`);
  process.exit(1);
}

const previous = pkg.version;
const next = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;
const updated = raw.replace(/"version"\s*:\s*"[^"]+"/, `"version": "${next}"`);
fs.writeFileSync(pkgPath, updated, "utf8");
console.log(`Version bumped: ${previous} -> ${next}`);

const csprojPath = path.join(path.dirname(pkgPath), "..", "App", "App.csproj");
if (fs.existsSync(csprojPath)) {
  let csproj = fs.readFileSync(csprojPath, "utf8");
  if (/<Version>[^<]+<\/Version>/.test(csproj)) {
    csproj = csproj.replace(/<Version>[^<]+<\/Version>/, `<Version>${next}</Version>`);
  } else {
    csproj = csproj.replace(
      /<\/PropertyGroup>/,
      `    <Version>${next}</Version>\n  </PropertyGroup>`,
    );
  }
  fs.writeFileSync(csprojPath, csproj, "utf8");
  console.log(`Synced App.csproj Version -> ${next}`);
}

const syncMacScript = path.join(path.dirname(pkgPath), "..", "..", "scripts", "sync-flompanage-mac-version.mjs");
if (fs.existsSync(syncMacScript)) {
  execFileSync(process.execPath, [syncMacScript, pkgPath], { stdio: "inherit" });
}
