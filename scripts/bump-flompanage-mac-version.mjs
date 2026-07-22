#!/usr/bin/env node
/**
 * Bump patch version in Flompanage.Mac.csproj (e.g. 1.0.0 -> 1.0.1).
 * Usage: node scripts/bump-flompanage-mac-version.mjs <path-to-csproj>
 */
import fs from "fs";

const csprojPath = process.argv[2];
if (!csprojPath) {
  console.error("Usage: node bump-flompanage-mac-version.mjs <App.csproj>");
  process.exit(1);
}

let csproj = fs.readFileSync(csprojPath, "utf8");
const match = /<Version>([^<]+)<\/Version>/.exec(csproj);
if (!match) {
  console.error(`No <Version> in ${csprojPath}`);
  process.exit(1);
}

const previous = match[1];
const parts = /^(\d+)\.(\d+)\.(\d+)$/.exec(previous);
if (!parts) {
  console.error(`Invalid version: ${previous}`);
  process.exit(1);
}

const next = `${parts[1]}.${parts[2]}.${Number(parts[3]) + 1}`;
csproj = csproj.replace(/<Version>[^<]+<\/Version>/, `<Version>${next}</Version>`);
csproj = csproj.replace(
  /<ApplicationDisplayVersion>[^<]+<\/ApplicationDisplayVersion>/,
  `<ApplicationDisplayVersion>${next}</ApplicationDisplayVersion>`,
);
fs.writeFileSync(csprojPath, csproj, "utf8");
console.log(`Mac version bumped: ${previous} -> ${next}`);
