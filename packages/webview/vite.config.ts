import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    outDir: resolve(import.meta.dirname, "../extension/dist/webview"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        board: resolve(import.meta.dirname, "src/app/board.tsx"),
        events: resolve(import.meta.dirname, "src/app/events.tsx"),
      },
      output: {
        entryFileNames: "[name].js",
        assetFileNames: "[name][extname]",
      },
    },
  },
});
