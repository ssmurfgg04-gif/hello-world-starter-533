import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      // Proxy for adsb.fi API (CORS workaround)
      '/api/adsb': {
        target: 'https://opendata.adsb.fi/api/v2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/adsb/, ''),
      },
      // Proxy for OpenSky API (CORS workaround)
      '/api/opensky': {
        target: 'https://opensky-network.org/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opensky/, ''),
      },
      // Proxy for ISS API
      '/api/iss': {
        target: 'https://api.open-notify.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/iss/, ''),
      },
      // Proxy for Celestrak
      '/api/celestrak': {
        target: 'https://celestrak.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/celestrak/, ''),
      },
      // Proxy for Forex API
      '/api/forex': {
        target: 'https://api.frankfurter.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/forex/, ''),
      },
    },
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
    define: {
      // Stub Prisma in browser builds
      'process.env.PRISMA_CLIENT': 'undefined',
    },
  },
  optimizeDeps: {
    exclude: ['@prisma/client'],
  },
  // Ensure .wasm files are served with the correct MIME type
  assetsInclude: ["**/*.wasm"],
  worker: {
    format: "es",
  },
  build: {
    target: "esnext",
    rollupOptions: {
      external: ["@prisma/client"],
      output: {
        manualChunks: {
          deckgl: ["deck.gl", "@deck.gl/core", "@deck.gl/layers", "@deck.gl/react"],
          maplibre: ["maplibre-gl"],
        },
      },
    },
  },
}));
