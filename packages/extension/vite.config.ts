import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    ssr: true,
    lib: {
      entry: resolve(import.meta.dirname, "src/extension.ts"),
      formats: ["es"],
      fileName: "extension",
    },
    outDir: resolve(import.meta.dirname, "dist"),
    emptyOutDir: false,
    rollupOptions: { external: ["vscode"] },
  },
});
