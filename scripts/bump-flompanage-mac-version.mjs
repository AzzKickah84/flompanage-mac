#!/usr/bin/env node
/**
 * @deprecated Use sync-flompanage-mac-version.mjs with ui/package.json instead.
 * Mac version is shared with Windows via Flompanage/ui/package.json.
 */
import { execFileSync } from "node:child_process";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(here, "..", "Flompanage", "ui", "package.json");
const syncScript = path.join(here, "sync-flompanage-mac-version.mjs");

console.warn("bump-flompanage-mac-version.mjs is deprecated; syncing from package.json instead.");
execFileSync(process.execPath, [syncScript, pkgPath], { stdio: "inherit" });
