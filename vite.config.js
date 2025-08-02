import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external connections
  },
  base: "./", // Use relative paths for assets
  build: {
    outDir: "dist",
    assetsDir: "assets",
    sourcemap: false,
  },
});