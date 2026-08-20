/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_PIN_ALERT_ENDPOINT?: string;
  readonly VITE_CURATOR_PIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
