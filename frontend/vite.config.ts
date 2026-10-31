/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      // Same-origin API in development, so session cookies work with SameSite=Lax
      proxy: {
        "/api": { target: env.DEV_API_TARGET || "http://localhost:4000", changeOrigin: false },
      },
    },
    test: {
      environment: "node",
      testTimeout: 30_000,
    },
  };
});
