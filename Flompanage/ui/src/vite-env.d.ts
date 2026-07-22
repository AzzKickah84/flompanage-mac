/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FLOMPANAGE_VERSION?: string;
  readonly VITE_FLOMPANAGE_GITHUB_REPO?: string;
  readonly VITE_FLOMPANAGE_MANIFEST_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
