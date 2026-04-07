/**
 * Demo simulator that generates synthetic aircraft and vessel entities
 * with realistic movement patterns. Activated automatically when no
 * API keys are configured, so the platform works out of the box.
 *
 * Simulates:
 *   - 25 aircraft on plausible routes (transatlantic, transpacific, regional)
 *   - 15 vessels on major shipping lanes (Strait of Hormuz, Malacca, etc.)
 *   - Occasional proximity events to trigger fusion relations
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Route definitions
// ---------------------------------------------------------------------------

interface Waypoint {
  lat: number;
  lon: number;
  alt?: number;
}

interface SimRoute {
  id: string;
  label: string;
  type: 'aircraft' | 'vessel';
  waypoints: Waypoint[];
  speed: number; // knots
}

const AIRCRAFT_ROUTES: SimRoute[] = [
  { id: 'AC001', label: 'BAW117', type: 'aircraft', speed: 480, waypoints: [{ lat: 51.47, lon: -0.46, alt: 11000 }, { lat: 49.01, lon: -20.0, alt: 11500 }, { lat: 42.36, lon: -50.0, alt: 11200 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC002', label: 'UAL901', type: 'aircraft', speed: 490, waypoints: [{ lat: 37.62, lon: -122.38, alt: 10800 }, { lat: 40.0, lon: -150.0, alt: 11000 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC003', label: 'DLH400', type: 'aircraft', speed: 470, waypoints: [{ lat: 50.03, lon: 8.57, alt: 10500 }, { lat: 55.0, lon: -20.0, alt: 11000 }, { lat: 40.64, lon: -73.78, alt: 2500 }] },
  { id: 'AC004', label: 'AFR012', type: 'aircraft', speed: 465, waypoints: [{ lat: 49.0, lon: 2.55, alt: 10200 }, { lat: 46.0, lon: -10.0, alt: 10800 }, { lat: 40.64, lon: -73.78, alt: 2800 }] },
  { id: 'AC005', label: 'SIA321', type: 'aircraft', speed: 500, waypoints: [{ lat: 1.36, lon: 103.99, alt: 11200 }, { lat: 10.0, lon: 80.0, alt: 11500 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  { id: 'AC006', label: 'QFA7', type: 'aircraft', speed: 490, waypoints: [{ lat: -33.95, lon: 151.18, alt: 10500 }, { lat: -10.0, lon: 130.0, alt: 11000 }, { lat: 1.36, lon: 103.99, alt: 2500 }] },
  { id: 'AC007', label: 'EK203', type: 'aircraft', speed: 485, waypoints: [{ lat: 25.25, lon: 55.36, alt: 10800 }, { lat: 30.0, lon: 35.0, alt: 11000 }, { lat: 40.08, lon: -3.57, alt: 11200 }, { lat: 40.64, lon: -73.78, alt: 3000 }] },
  { id: 'AC008', label: 'CPA100', type: 'aircraft', speed: 475, waypoints: [{ lat: 22.31, lon: 113.91, alt: 10200 }, { lat: 30.0, lon: 130.0, alt: 10800 }, { lat: 35.55, lon: 139.78, alt: 3000 }] },
  { id: 'AC009', label: 'THY33', type: 'aircraft', speed: 460, waypoints: [{ lat: 41.26, lon: 28.75, alt: 10000 }, { lat: 45.0, lon: 15.0, alt: 10500 }, { lat: 51.47, lon: -0.46, alt: 2500 }] },
  { id: 'AC010', label: 'ANA1', type: 'aircraft', speed: 495, waypoints: [{ lat: 35.55, lon: 139.78, alt: 10800 }, { lat: 50.0, lon: 170.0, alt: 11200 }, { lat: 47.45, lon: -122.31, alt: 3000 }] },
  { id: 'AC011', label: 'RYR815', type: 'aircraft', speed: 420, waypoints: [{ lat: 53.42, lon: -6.27, alt: 10000 }, { lat: 48.0, lon: -2.0, alt: 10200 }, { lat: 41.3, lon: 2.08, alt: 2000 }] },
  { id: 'AC012', label: 'ETH500', type: 'aircraft', speed: 470, waypoints: [{ lat: 8.98, lon: 38.80, alt: 10500 }, { lat: 15.0, lon: 45.0, alt: 11000 }, { lat: 25.25, lon: 55.36, alt: 3000 }] },
  { id: 'AC013', label: 'AAL100', type: 'aircraft', speed: 480, waypoints: [{ lat: 40.64, lon: -73.78, alt: 10800 }, { lat: 35.0, lon: -60.0, alt: 11000 }, { lat: 25.79, lon: -80.29, alt: 2500 }] },
  { id: 'AC014', label: 'JAL5', type: 'aircraft', speed: 485, waypoints: [{ lat: 35.55, lon: 139.78, alt: 10500 }, { lat: 22.31, lon: 113.91, alt: 3000 }] },
  { id: 'AC015', label: 'LAN800', type: 'aircraft', speed: 470, waypoints: [{ lat: -33.39, lon: -70.79, alt: 10200 }, { lat: -23.0, lon: -46.63, alt: 10800 }, { lat: -22.91, lon: -43.17, alt: 3000 }] },
  // Surveillance / patrol aircraft near vessels for fusion triggers
  { id: 'AC016', label: 'NAVY01', type: 'aircraft', speed: 220, waypoints: [{ lat: 26.2, lon: 56.0, alt: 5000 }, { lat: 26.6, lon: 56.5, alt: 5200 }, { lat: 26.4, lon: 56.2, alt: 5100 }] },
  { id: 'AC017', label: 'COAST1', type: 'aircraft', speed: 180, waypoints: [{ lat: 1.5, lon: 104.0, alt: 3000 }, { lat: 1.8, lon: 104.3, alt: 3200 }, { lat: 1.3, lon: 103.8, alt: 3100 }] },
  { id: 'AC018', label: 'RECON7', type: 'aircraft', speed: 250, waypoints: [{ lat: 34.0, lon: 130.0, alt: 8000 }, { lat: 34.5, lon: 131.0, alt: 8200 }, { lat: 33.5, lon: 129.5, alt: 7800 }] },
  { id: 'AC019', label: 'EZY45', type: 'aircraft', speed: 410, waypoints: [{ lat: 51.15, lon: -0.19, alt: 9800 }, { lat: 47.0, lon: 5.0, alt: 10200 }, { lat: 43.62, lon: 7.21, alt: 2000 }] },
  { id: 'AC020', label: 'SWR85', type: 'aircraft', speed: 460, waypoints: [{ lat: 47.46, lon: 8.56, alt: 10000 }, { lat: 42.0, lon: 20.0, alt: 10500 }, { lat: 37.94, lon: 23.94, alt: 2500 }] },
  { id: 'AC021', label: 'KLM605', type: 'aircraft', speed: 475, waypoints: [{ lat: 52.31, lon: 4.76, alt: 10800 }, { lat: 48.0, lon: -5.0, alt: 11000 }, { lat: 38.77, lon: -9.13, alt: 3000 }] },
  { id: 'AC022', label: 'ACA855', type: 'aircraft', speed: 480, waypoints: [{ lat: 43.68, lon: -79.63, alt: 10500 }, { lat: 50.0, lon: -55.0, alt: 11000 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC023', label: 'QTR77', type: 'aircraft', speed: 490, waypoints: [{ lat: 25.27, lon: 51.61, alt: 10800 }, { lat: 35.0, lon: 30.0, alt: 11200 }, { lat: 51.47, lon: -0.46, alt: 3000 }] },
  { id: 'AC024', label: 'VOZ401', type: 'aircraft', speed: 440, waypoints: [{ lat: -37.67, lon: 144.84, alt: 10000 }, { lat: -31.95, lon: 141.0, alt: 10500 }, { lat: -33.95, lon: 151.18, alt: 2500 }] },
  { id: 'AC025', label: 'TAP901', type: 'aircraft', speed: 465, waypoints: [{ lat: 38.77, lon: -9.13, alt: 10200 }, { lat: 30.0, lon: -30.0, alt: 10800 }, { lat: -22.91, lon: -43.17, alt: 3000 }] },
];

const VESSEL_ROUTES: SimRoute[] = [
  // Strait of Hormuz traffic
  { id: 'VE001', label: 'HORMUZ STAR', type: 'vessel', speed: 14, waypoints: [{ lat: 26.2, lon: 56.1 }, { lat: 26.5, lon: 56.4 }, { lat: 26.8, lon: 56.6 }] },
  { id: 'VE002', label: 'PERSIAN GULF', type: 'vessel', speed: 12, waypoints: [{ lat: 26.4, lon: 56.3 }, { lat: 26.1, lon: 56.0 }, { lat: 25.8, lon: 55.7 }] },
  { id: 'VE003', label: 'DUBAI TRADER', type: 'vessel', speed: 11, waypoints: [{ lat: 25.3, lon: 55.3 }, { lat: 26.0, lon: 56.0 }, { lat: 26.5, lon: 56.5 }] },
  // Malacca Strait
  { id: 'VE004', label: 'MAERSK SENTOSA', type: 'vessel', speed: 16, waypoints: [{ lat: 1.2, lon: 103.5 }, { lat: 1.8, lon: 104.2 }, { lat: 2.5, lon: 104.8 }] },
  { id: 'VE005', label: 'SINGAPORE EXP', type: 'vessel', speed: 13, waypoints: [{ lat: 2.0, lon: 104.5 }, { lat: 1.5, lon: 104.0 }, { lat: 1.0, lon: 103.5 }] },
  // Suez Canal approach
  { id: 'VE006', label: 'CANAL QUEEN', type: 'vessel', speed: 10, waypoints: [{ lat: 29.9, lon: 32.5 }, { lat: 30.5, lon: 32.3 }, { lat: 31.2, lon: 32.3 }] },
  { id: 'VE007', label: 'RED SEA FWD', type: 'vessel', speed: 14, waypoints: [{ lat: 27.0, lon: 34.0 }, { lat: 28.5, lon: 33.0 }, { lat: 29.9, lon: 32.5 }] },
  // English Channel
  { id: 'VE008', label: 'DOVER SPIRIT', type: 'vessel', speed: 12, waypoints: [{ lat: 50.9, lon: 1.3 }, { lat: 51.0, lon: 1.0 }, { lat: 51.1, lon: 0.5 }] },
  // South China Sea
  { id: 'VE009', label: 'PACIFIC GRACE', type: 'vessel', speed: 15, waypoints: [{ lat: 10.0, lon: 115.0 }, { lat: 14.0, lon: 118.0 }, { lat: 18.0, lon: 120.0 }] },
  { id: 'VE010', label: 'SCS PATROL', type: 'vessel', speed: 18, waypoints: [{ lat: 14.5, lon: 117.0 }, { lat: 13.0, lon: 116.0 }, { lat: 11.5, lon: 115.0 }] },
  // Mediterranean
  { id: 'VE011', label: 'MED EXPLORER', type: 'vessel', speed: 13, waypoints: [{ lat: 36.0, lon: 14.5 }, { lat: 37.0, lon: 11.0 }, { lat: 38.0, lon: 8.0 }] },
  // Baltic Sea
  { id: 'VE012', label: 'BALTIC WIND', type: 'vessel', speed: 11, waypoints: [{ lat: 55.7, lon: 12.6 }, { lat: 57.0, lon: 15.0 }, { lat: 59.3, lon: 18.1 }] },
  // West Africa
  { id: 'VE013', label: 'LAGOS CARRIER', type: 'vessel', speed: 12, waypoints: [{ lat: 6.4, lon: 3.4 }, { lat: 5.0, lon: 1.0 }, { lat: 4.0, lon: -2.0 }] },
  // Panama Canal approach
  { id: 'VE014', label: 'PANAMA TRANS', type: 'vessel', speed: 10, waypoints: [{ lat: 8.9, lon: -79.5 }, { lat: 9.2, lon: -79.8 }, { lat: 9.5, lon: -80.0 }] },
  // East China Sea
  { id: 'VE015', label: 'SHANGHAI EXP', type: 'vessel', speed: 16, waypoints: [{ lat: 31.0, lon: 122.0 }, { lat: 33.0, lon: 128.0 }, { lat: 34.0, lon: 130.0 }] },
];

// ---------------------------------------------------------------------------
// Simulation state
// ---------------------------------------------------------------------------

interface SimEntity {
  route: SimRoute;
  /** Current progress along route [0..1]. */
  progress: number;
  /** Speed factor for variation. */
  speedFactor: number;
}

let simEntities: SimEntity[] = [];
let simTimer: ReturnType<typeof setInterval> | null = null;
const SIM_TICK_MS = 1_000;
const SIM_SPEED_MULT = 0.0003; // Controls how fast entities traverse their routes

// ---------------------------------------------------------------------------
// Interpolation helpers
// ---------------------------------------------------------------------------

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateRoute(waypoints: Waypoint[], progress: number): Waypoint {
  if (waypoints.length === 1) return waypoints[0];

  const totalSegments = waypoints.length - 1;
  const scaledProgress = progress * totalSegments;
  const segIndex = Math.min(Math.floor(scaledProgress), totalSegments - 1);
  const segT = scaledProgress - segIndex;

  const from = waypoints[segIndex];
  const to = waypoints[segIndex + 1];

  return {
    lat: lerp(from.lat, to.lat, segT),
    lon: lerp(from.lon, to.lon, segT),
    alt: from.alt !== undefined && to.alt !== undefined
      ? lerp(from.alt, to.alt, segT)
      : from.alt,
  };
}

function headingBetween(from: Waypoint, to: Waypoint): number {
  const dLon = to.lon - from.lon;
  const dLat = to.lat - from.lat;
  const rad = Math.atan2(dLon, dLat);
  return ((rad * 180) / Math.PI + 360) % 360;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns true if demo mode should be used.
 * Demo mode activates when VITE_DEMO_MODE=true or when no API keys
 * are configured. Set VITE_LIVE_MODE=true to force live connections
 * even without keys (uses free/open feeds).
 */
export function shouldUseDemoMode(): boolean {
  if (import.meta.env.VITE_DEMO_MODE === 'true') return true;
  if (import.meta.env.VITE_LIVE_MODE === 'true') return false;
  const adsbKey = import.meta.env.VITE_ADSB_API_KEY ?? '';
  const aisKey = import.meta.env.VITE_AIS_API_KEY ?? '';
  return !adsbKey && !aisKey;
}

/**
 * Start the demo simulation, populating the entity store with moving
 * synthetic entities.
 */
export function startSimulation(): void {
  if (simTimer) return;

  // Initialise entities with random starting progress
  simEntities = [...AIRCRAFT_ROUTES, ...VESSEL_ROUTES].map((route) => ({
    route,
    progress: Math.random(),
    speedFactor: 0.8 + Math.random() * 0.4, // 0.8x to 1.2x
  }));

  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'connected');
  store.setServiceStatus('marine-traffic', 'connected');

  console.info('[demoSimulator] Started with', simEntities.length, 'entities');

  simTimer = setInterval(tick, SIM_TICK_MS);
  tick(); // immediate first tick
}

/**
 * Stop the demo simulation.
 */
export function stopSimulation(): void {
  if (simTimer) {
    clearInterval(simTimer);
    simTimer = null;
  }
  const store = useEntityStore.getState();
  store.setServiceStatus('adsb-exchange', 'disconnected');
  store.setServiceStatus('marine-traffic', 'disconnected');
}

// ---------------------------------------------------------------------------
// Tick
// ---------------------------------------------------------------------------

function tick(): void {
  const store = useEntityStore.getState();
  const now = new Date().toISOString();
  const entities: Entity[] = [];

  for (const sim of simEntities) {
    // Advance progress
    sim.progress += SIM_SPEED_MULT * sim.speedFactor;
    if (sim.progress >= 1) sim.progress -= 1; // loop

    const pos = interpolateRoute(sim.route.waypoints, sim.progress);

    // Compute heading from a small look-ahead
    const aheadProgress = Math.min(sim.progress + 0.01, 0.999);
    const ahead = interpolateRoute(sim.route.waypoints, aheadProgress);
    const heading = headingBetween(pos, ahead);

    // Add small jitter for realism
    const jitterLat = (Math.random() - 0.5) * 0.002;
    const jitterLon = (Math.random() - 0.5) * 0.002;

    const entity: Entity = {
      id: sim.route.id,
      label: sim.route.label,
      type: sim.route.type,
      provider: sim.route.type === 'aircraft' ? 'adsb-exchange' : 'marine-traffic',
      position: {
        lat: pos.lat + jitterLat,
        lon: pos.lon + jitterLon,
        alt: pos.alt,
      },
      heading,
      speed: sim.route.speed * sim.speedFactor,
      lastSeen: now,
    };

    entities.push(entity);
    store.appendTrail(entity.id, {
      lat: entity.position.lat,
      lon: entity.position.lon,
      alt: entity.position.alt,
      ts: now,
    });
  }

  store.upsertEntities(entities);
}
