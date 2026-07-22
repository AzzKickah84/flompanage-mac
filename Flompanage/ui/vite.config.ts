import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { writeFileSync, readdirSync } from "fs";
import { resolve } from "path";
import pkg from "./package.json";

const defaultOutDir = resolve(__dirname, "../App/wwwroot");

export default defineConfig({
  plugins: [
    react(),
    {
      name: "flompanage-build-info",
      closeBundle() {
        const version = process.env.VITE_FLOMPANAGE_VERSION || pkg.version;
        const outDir = process.env.VITE_OUT_DIR
          ? resolve(process.env.VITE_OUT_DIR)
          : defaultOutDir;
        const assetsDir = resolve(outDir, "assets");
        let jsAsset: string | undefined;
        try {
          jsAsset = readdirSync(assetsDir).find((name) => /^index-.*\.js$/.test(name));
        } catch {
          // assets dir missing
        }
        writeFileSync(
          resolve(outDir, "flompanage-build.json"),
          JSON.stringify(
            {
              version,
              builtAt: new Date().toISOString(),
              jsAsset,
            },
            null,
            2,
          ),
          "utf8",
        );
      },
    },
  ],
  base: "./",
  build: {
    outDir: defaultOutDir,
    emptyOutDir: true,
    modulePreload: false,
  },
});
