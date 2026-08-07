/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HMP_LICENSE_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
