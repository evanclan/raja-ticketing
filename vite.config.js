import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Allow external connections
  },
  base: "/", // Use absolute paths for assets on Vercel
  build: {
    outDir: "public",
    assetsDir: "assets",
    sourcemap: false,
    emptyOutDir: false, // Don't empty public dir (it has _headers)
  },
});