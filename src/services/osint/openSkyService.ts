/**
 * OpenSky Network REST API service.
 *
 * Provides global flight data for FREE with NO API key and NO signup.
 * https://openskynetwork.github.io/opensky-api/rest.html
 *
 * The /states/all endpoint returns all current aircraft states.
 * Anonymous rate limit: ~10 requests per minute.
 * Authenticated (free account): ~100 requests per minute.
 *
 * This service polls the REST API every 10 seconds and normalises
 * the data into the platform's Entity model.
 */

import type { Entity } from '@/types/entities';
import { useEntityStore } from '@/store/entityStore';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = 'https://opensky-network.org/api';
const POLL_INTERVAL_MS = 10_000; // 10 seconds (safe for anonymous rate limit)

// ---------------------------------------------------------------------------
// Service state
// ---------------------------------------------------------------------------

let pollTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

/**
 * OpenSky states/all response shape:
 * Each state vector is an array:
 *   [0]  icao24        string
 *   [1]  callsign      string | null
 *   [2]  origin_country string
 *   [3]  time_position  int | null
 *   [4]  last_contact   int
 *   [5]  longitude      float | null
 *   [6]  latitude       float | null
 *   [7]  baro_altitude  float | null
 *   [8]  on_ground      boolean
 *   [9]  velocity       float | null
 *   [10] true_track      float | null
 *   [11] vertical_rate   float | null
 *   [12] sensors         int[] | null
 *   [13] geo_altitude    float | null
 *   [14] squawk          string | null
 *   [15] spi             boolean
 *   [16] position_source int
 *   [17] category        int
 */
function parseStateVector(sv: unknown[]): Entity | null {
  const icao = sv[0] as string | null;
  const lat = sv[6] as number | null;
  const lon = sv[5] as number | null;

  if (!icao || lat === null || lon === null) return null;

  const callsign = (sv[1] as string | null)?.trim() || icao;
  const baroAlt = sv[7] as number | null;
  const geoAlt = sv[13] as number | null;
  const velocity = sv[9] as number | null; // m/s
  const track = sv[10] as number | null;
  const onGround = sv[8] as boolean;

  return {
    id: icao,
    label: callsign,
    type: 'aircraft',
    provider: 'adsb-exchange', // normalise to same provider bucket
    position: {
      lat,
      lon,
      alt: onGround ? 0 : (geoAlt ?? baroAlt ?? undefined),
    },
    heading: track ?? 0,
    speed: velocity ? velocity * 1.94384 : 0, // m/s to knots
    lastSeen: new Date().toISOString(),
    meta: {
      origin_country: sv[2],
      on_ground: onGround,
      squawk: sv[14],
      category: sv[17],
      source: 'opensky-network',
    },
  };
}

// ---------------------------------------------------------------------------
// Polling
// ---------------------------------------------------------------------------

async function fetchStates(): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}/states/all`);

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('[openSkyService] Rate limited, will retry next interval');
        return;
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { states: unknown[][] | null };

    if (!data.states) return;

    const store = useEntityStore.getState();
    const entities: Entity[] = [];

    for (const sv of data.states) {
      const entity = parseStateVector(sv);
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
      console.info(`[openSkyService] Received ${entities.length} aircraft from OpenSky`);
    }
  } catch (err) {
    console.error('[openSkyService] Fetch failed:', err);
    useEntityStore.getState().setServiceStatus('adsb-exchange', 'error', String(err));
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Start polling the OpenSky Network API for live aircraft data.
 * Free, no API key required, no signup needed.
 */
export function connect(): void {
  if (pollTimer) return;

  console.info('[openSkyService] Starting OpenSky REST polling (10s interval, no key needed)');
  useEntityStore.getState().setServiceStatus('adsb-exchange', 'connecting');

  // Immediate first fetch
  fetchStates();

  pollTimer = setInterval(fetchStates, POLL_INTERVAL_MS);
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
