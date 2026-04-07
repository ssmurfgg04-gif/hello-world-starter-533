/**
 * ADSB.fi REST API service.
 *
 * Provides global flight data for FREE with NO API key and NO signup.
 * https://opendata.adsb.fi/
 *
 * Endpoints used:
 *   /api/v2/all  - All aircraft worldwide (large payload)
 *   /api/v2/lat/{lat}/lon/{lon}/dist/{nm} - Aircraft within radius
 *
 * Rate limit: ~1 request per second for anonymous users.
 * This service polls every 15 seconds for global data.
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = 'https://opendata.adsb.fi/api/v2';
const POLL_INTERVAL_MS = 15_000; // 15 seconds

// ---------------------------------------------------------------------------
// Service state
// ---------------------------------------------------------------------------

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

interface AdsbFiAircraft {
  hex?: string;
  flight?: string;
  lat?: number;
  lon?: number;
  alt_baro?: number | string;
  alt_geom?: number;
  gs?: number;
  track?: number;
  squawk?: string;
  category?: string;
  t?: string;
  r?: string;
  emergency?: string;
}

function parseAircraft(ac: AdsbFiAircraft): Entity | null {
  if (!ac.hex || ac.lat === undefined || ac.lon === undefined) return null;

  const altBaro = typeof ac.alt_baro === 'number' ? ac.alt_baro * 0.3048 : undefined; // feet to metres
  const altGeom = ac.alt_geom ? ac.alt_geom * 0.3048 : undefined;

  return {
    id: ac.hex,
    label: ac.flight?.trim() || ac.hex,
    type: 'aircraft',
    provider: 'adsb-exchange',
    position: {
      lat: ac.lat,
      lon: ac.lon,
      alt: altGeom ?? altBaro,
    },
    heading: ac.track ?? 0,
    speed: ac.gs ?? 0, // already in knots
    lastSeen: new Date().toISOString(),
    meta: {
      squawk: ac.squawk,
      category: ac.category,
      aircraftType: ac.t,
      registration: ac.r,
      emergency: ac.emergency,
      source: 'adsb.fi',
    },
  };
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

async function fetchAll(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/all`);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[adsbfiService] Rate limited, will retry next interval');
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { ac?: AdsbFiAircraft[] };

    if (!data.ac || !Array.isArray(data.ac)) return;

    const store = useEntityStore.getState();
    const entities: Entity[] = [];

    for (const ac of data.ac) {
      const entity = parseAircraft(ac);
      if (entity) {
        entities.push(entity);
        store.appendTrail(entity.id, {
          lat: entity.position.lat,
          lon: entity.position.lon,
          alt: entity.position.alt,
          ts: entity.lastSeen,
        });
      }
    }

    if (entities.length > 0) {
      store.upsertEntities(entities);
      store.setServiceStatus('adsb-exchange', 'connected');
      console.info(`[adsbfiService] Received ${entities.length} aircraft from adsb.fi`);
    }
  } catch (err) {
    console.error('[adsbfiService] Fetch failed:', err);
    useEntityStore.getState().setServiceStatus('adsb-exchange', 'error', String(err));
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start polling the adsb.fi API for live aircraft data.
 * FREE, no API key, no signup.
 */
export function connect(): void {
  if (pollTimer) return;

  console.info('[adsbfiService] Starting adsb.fi REST polling (15s interval, free, no key)');
  useEntityStore.getState().setServiceStatus('adsb-exchange', 'connecting');

  fetchAll();
  pollTimer = setInterval(fetchAll, POLL_INTERVAL_MS);
}

/**
 * Stop polling.
 */
export function disconnect(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  useEntityStore.getState().setServiceStatus('adsb-exchange', 'disconnected');
}
