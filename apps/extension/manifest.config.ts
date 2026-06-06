import { defineManifest } from "@crxjs/vite-plugin"

export default defineManifest({
  manifest_version: 3,
  name: "ScreenFlow Recorder",
  version: "1.0.0",
  description: "Grave sua tela e compartilhe em segundos",
  permissions: ["storage", "tabs", "offscreen", "scripting"],
  host_permissions: ["<all_urls>"],
  action: {
    default_popup: "src/popup/index.html",
    default_icon: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  },
  background: {
    service_worker: "src/background/service_worker.ts",
    type: "module",
  },
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["src/content/index.ts"],
      run_at: "document_idle",
    },
  ],
  icons: { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  web_accessible_resources: [
    {
      resources: ["src/offscreen/index.html"],
      matches: ["<all_urls>"],
    },
  ],
})
