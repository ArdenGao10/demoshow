import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend dev server. /api is proxied to the Express GLM proxy (server/index.js)
// so the ZHIPU key never reaches the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
