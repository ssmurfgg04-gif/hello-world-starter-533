import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Enable top-level await for WASM module initialisation
  esbuild: {
    supported: {
      "top-level-await": true,
    },
  },
  // Ensure .wasm files are served with the correct MIME type
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          deckgl: ["deck.gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/react"],
          maplibre: ["maplibre-gl"],
        },
      },
    },
  },
}));
