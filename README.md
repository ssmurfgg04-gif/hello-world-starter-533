# OSINT Platform v2

A next-generation Open-Source Intelligence (OSINT) platform built with **Deck.gl**, **WebAssembly**, and real-time data pipelines. Designed for high-fidelity geospatial visualization and multi-source entity fusion.

## Architecture

```
+------------------+     +-------------------+     +----------------+
|  ADS-B Exchange  |---->|                   |     |                |
|  (Aircraft WS)   |     |   Entity Store    |---->|   DeckGlobe    |
+------------------+     |   (Zustand)       |     |   (Deck.gl)    |
                         |                   |     |                |
+------------------+     |  - entities Map   |     |  Layers:       |
|  AISstream.io    |---->|  - trails Map     |     |  - Scatterplot |
|  (Maritime WS)   |     |  - relations[]    |     |  - Path/Trail  |
+------------------+     |  - serviceStatus  |     |  - Arc/Fusion  |
                         +--------+----------+     |  - Text/Labels |
                                  |                |  - GeoJSON     |
                         +--------v----------+     +----------------+
                         |  Fusion Engine    |
                         |  (TS + WASM)      |
                         |  - Proximity      |
                         |  - Temporal       |
                         +-------------------+
```

## Quick Start

```bash
# Install dependencies
npm install

# Run in demo mode (no API keys needed)
npm run dev

# Run with live data feeds
echo "VITE_LIVE_MODE=true" > .env
npm run dev
```

The platform starts in **demo simulation mode** by default, showing 25 aircraft and 15 vessels on realistic global routes. No API keys required.

## Live Data Feeds

### Aircraft (ADS-B) -- Free, no key required

The default endpoint `opendata.adsb.fi` provides global flight data without authentication.

### Maritime (AIS) -- Free signup

1. Sign up at [aisstream.io](https://aisstream.io/)
2. Copy your API key
3. Add to `.env`:
   ```
   VITE_AIS_API_KEY=your_key_here
   ```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_LIVE_MODE` | No | Set `true` to force live connections |
| `VITE_DEMO_MODE` | No | Set `true` to force demo simulation |
| `VITE_ADSB_WS_URL` | No | Custom ADS-B WebSocket endpoint |
| `VITE_ADSB_API_KEY` | No | ADS-B Exchange API key (premium) |
| `VITE_AIS_WS_URL` | No | Custom AIS WebSocket endpoint |
| `VITE_AIS_API_KEY` | No | AISstream.io API key |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Visualization | Deck.gl + maplibre-gl (CARTO dark-matter tiles) |
| Frontend | React 18 + TypeScript (strict mode) |
| State | Zustand |
| Fusion (TS) | Proximity + temporal correlation heuristics |
| Fusion (WASM) | Rust + wasm-bindgen (scaffold, build with `npm run build:wasm`) |
| Build | Vite 5 with code-split chunks |
| Testing | Playwright visual regression |
| Deployment | Vercel (zero-config, vercel.json included) |
| Offline | Service Worker with stale-while-revalidate tile caching |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` | Toggle aircraft layer |
| `2` | Toggle vessel layer |
| `3` | Toggle trail history |
| `4` | Toggle fusion arcs |
| `/` | Focus search bar |
| `Esc` | Clear entity selection |

## Project Structure

```
src/
  components/
    DeckGlobe.tsx          # Main Deck.gl visualization
    ControlPanel.tsx       # Status panel with layer toggles
    EntityDetailSidebar.tsx # Click-to-inspect entity details
    EntityTooltip.tsx      # Hover tooltip
    SearchBar.tsx          # Entity search/filter
  services/
    osint/
      aircraftService.ts   # ADS-B WebSocket client
      maritimeService.ts   # AIS WebSocket client
    fusion/
      fusionEngine.ts      # TypeScript fusion with auto-fuse loop
    simulation/
      demoSimulator.ts     # Synthetic entity generator
    audit/
      auditLogger.ts       # Ring-buffer event logger
  store/
    entityStore.ts         # Zustand global state
  types/
    entities.ts            # Core type definitions
  data/
    exclusionZones.ts      # GeoJSON monitoring zones
  wasm/
    fusion_engine/
      Cargo.toml           # Rust crate config
      src/lib.rs           # WASM fusion implementation
  workers/
    fusionWorker.ts        # Web Worker for WASM offloading
  lib/
    geo.ts                 # Geospatial utilities
  hooks/
    useKeyboardShortcuts.ts
  styles/
    globals.css            # Full-viewport CSS foundation
tests/
  regression.spec.ts       # Playwright visual tests
```

## Building the WASM Module

Requires [Rust](https://rustup.rs/) and [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/):

```bash
# Install wasm-pack
curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh

# Build the WASM module
npm run build:wasm
```

## Deployment

The project is pre-configured for Vercel:

```bash
# Deploy to Vercel
npx vercel --prod
```

Or connect the GitHub repo to Vercel for automatic deployments on every push to `main`.

## Design Decisions

- **Deck.gl over CesiumJS**: Avoids CSS z-index/container sizing issues that caused the V1 "black void" bug. Better performance with large datasets.
- **Full-viewport CSS**: `html`, `body`, and `#root` all set to `100vh` to prevent canvas collapse.
- **Zustand over Context+useReducer**: Lightweight, no provider wrapping, supports high-frequency updates without unnecessary re-renders.
- **Dual fusion path**: TypeScript for rapid iteration, Rust/WASM for production-grade performance.
- **Demo mode**: Platform works immediately without API keys for evaluation and development.
