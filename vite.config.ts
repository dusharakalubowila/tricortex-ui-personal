/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// PUBLIC_INTERFACE
export default defineConfig({
  /** Vite configuration for the Agentic Kernel UI: React plugin, dev proxy to the
   * FastAPI service (STEP-01), and vitest test environment settings. */
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/setupTests.ts"],
  },
});
